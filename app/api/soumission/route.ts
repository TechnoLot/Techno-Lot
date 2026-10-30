import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { ENTETE_SOUMISSION } from "@/lib/hostinger/config";
import { courriel as schemaCourriel } from "@/lib/securite/schemas";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { reponseErreur } from "@/lib/securite/erreurs";
import { ipClient } from "@/lib/securite/ip";
import { limiterSelon, reponse429, TABLE_LIMITES } from "@/lib/securite/limite";
import { verifierTaille } from "@/lib/securite/requete";
import { clientRpc, secretRpc } from "@/lib/securite/rpc";
import {
  CHAMPS_FICHIERS,
  verifierFichiers,
  verifierTailles,
  type ChampFichier,
} from "@/lib/securite/fichiers";
import { lireTlAttr, nettoyerChaine } from "@/lib/tracking/attribution-schema";

export const runtime = "nodejs";

/**
 * POST /api/soumission — formulaire public (aucun compte).
 *
 * Ordre des contrôles, AVANT toute écriture ou tout envoi :
 *  1. type multipart + taille annoncée (≤ 16 Mo) avant de lire le corps ;
 *  2. limites de débit : 3 / 10 min et 10 / 24 h par IP, 50 / 24 h au total ;
 *  3. champs connus seulement (tout champ en trop → 400), pot de miel ;
 *  4. schéma Zod strict (longueurs, courriel, téléphone, langue) ;
 *  5. pièces jointes : 10 fichiers, 10 Mo chacun, 15 Mo au total, type réel
 *     lu dans les octets (lib/securite/fichiers.ts), nom assaini.
 * Écriture en base PAR LE SERVEUR (fonctions à secret `soumission_enregistrer`
 * et `lead_pub_enregistrer`). Un échec d'écriture ne bloque jamais l'envoi du
 * courriel à info@ : on ne perd pas une demande (l'échec est journalisé).
 */

/** Corps multipart : 15 Mo de pièces + champs + enveloppe multipart. */
const TAILLE_MAX_CORPS = 16 * 1024 * 1024;

const messages = {
  fr: {
    invalid: "Requête invalide.",
    required: "Veuillez remplir tous les champs obligatoires.",
    email: "L'adresse courriel fournie n'est pas valide.",
    phone: "Le numéro de téléphone fourni n'est pas valide.",
    tooLong: "Un des champs est trop long. Raccourcissez-le et réessayez.",
    files:
      "Pièces jointes trop volumineuses : au plus 10 fichiers, 10 Mo par fichier et 15 Mo au total.",
    fileType: (nom: string) =>
      `Format de fichier non accepté : ${nom}. Formats permis : Excel, CSV, PDF, JPG, PNG, WEBP, GIF, HEIC.`,
    rateLimited:
      "Trop d'envois en peu de temps. Réessayez plus tard ou appelez-nous au 514-944-3939.",
    unavailable:
      "Le service de courriel est indisponible pour l'instant. Veuillez nous appeler au 514-944-3939.",
    sendFailed:
      "L'envoi du courriel a échoué. Veuillez réessayer ou nous appeler au 514-944-3939.",
  },
  en: {
    invalid: "Invalid request.",
    required: "Please fill in all required fields.",
    email: "The email address provided is not valid.",
    phone: "The phone number provided is not valid.",
    tooLong: "One of the fields is too long. Please shorten it and try again.",
    files:
      "Attachments are too large: at most 10 files, 10 MB per file and 15 MB in total.",
    fileType: (nom: string) =>
      `File format not accepted: ${nom}. Accepted formats: Excel, CSV, PDF, JPG, PNG, WEBP, GIF, HEIC.`,
    rateLimited:
      "Too many submissions in a short time. Please try again later or call us at 514-944-3939.",
    unavailable:
      "The email service is unavailable right now. Please call us at 514-944-3939.",
    sendFailed:
      "The email could not be sent. Please try again or call us at 514-944-3939.",
  },
} as const;

type Langue = keyof typeof messages;

// --- Schéma du formulaire -------------------------------------------------------------

/** Caractères de contrôle, sauf tabulation et saut de ligne (gardés dans le message). */
const CONTROLE_SAUF_LIGNES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;
const PHONE_RE = /^[\d\s\-().+]{7,20}$/;

/** Texte d'une ligne : contrôles retirés, espaces regroupés (sert au sujet du courriel). */
const ligne = (max: number) =>
  z
    .string()
    .max(max * 4)
    .transform((s) => s.replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1).max(max));

/** Texte libre multiligne. */
const multiligne = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((s) => s.replace(/\r\n?/g, "\n").replace(CONTROLE_SAUF_LIGNES, "").trim())
    .pipe(z.string().max(max));

const LONGUEURS = { nom: 120, message: 8_000, piege: 500, tlAttr: 4_096 } as const;

const SchemaSoumission = z
  .object({
    nom: ligne(LONGUEURS.nom),
    courriel: schemaCourriel,
    telephone: z.string().max(100).trim().regex(PHONE_RE),
    message: multiligne(LONGUEURS.message).optional(),
    locale: z.enum(["fr", "en"]).default("fr"),
    // Pot de miel (vérifié avant le schéma) : bornés ici seulement.
    tl_verif: z.string().max(LONGUEURS.piege).optional(),
    entreprise_site: z.string().max(LONGUEURS.piege).optional(),
    tl_attr: z.string().max(LONGUEURS.tlAttr).optional(),
  })
  .strict();

const CHAMPS_TEXTE = new Set(Object.keys(SchemaSoumission.shape));

type Lecture =
  | { ok: true; texte: Record<string, string>; fichiers: { champ: ChampFichier; fichier: File }[] }
  | { ok: false; motif: "champ_inconnu" | "champ_double" | "type_champ"; champ: string };

/** Sépare champs texte et fichiers ; refuse tout champ inconnu, doublé ou mal typé. */
function lireChamps(data: FormData): Lecture {
  const texte: Record<string, string> = {};
  const fichiers: { champ: ChampFichier; fichier: File }[] = [];
  for (const [cle, valeur] of data.entries()) {
    if ((CHAMPS_FICHIERS as string[]).includes(cle)) {
      if (typeof valeur === "string") {
        if (valeur === "") continue; // champ fichier vide (envoi sans JavaScript)
        return { ok: false, motif: "type_champ", champ: cle };
      }
      // Sans fichier choisi, le navigateur envoie une partie vide.
      if (valeur.size === 0 && valeur.name === "") continue;
      fichiers.push({ champ: cle as ChampFichier, fichier: valeur });
      continue;
    }
    if (!CHAMPS_TEXTE.has(cle)) return { ok: false, motif: "champ_inconnu", champ: cle };
    if (typeof valeur !== "string") return { ok: false, motif: "type_champ", champ: cle };
    if (cle in texte) return { ok: false, motif: "champ_double", champ: cle };
    texte[cle] = valeur;
  }
  return { ok: true, texte, fichiers };
}

type Probleme = z.ZodError["issues"][number];

/** Message d'erreur selon le premier problème du schéma. */
function messageSchema(
  t: (typeof messages)[Langue],
  issues: Probleme[],
  texte: Record<string, string>,
): string {
  const p = issues[0];
  const champ = String(p?.path?.[0] ?? "");
  const obligatoire = champ === "nom" || champ === "courriel" || champ === "telephone";
  if (obligatoire && (texte[champ] ?? "").trim() === "") return t.required;
  if (p?.code === "too_big") return t.tooLong;
  if (champ === "courriel") return t.email;
  if (champ === "telephone") return t.phone;
  if (champ === "nom") return t.required;
  return t.invalid;
}

// --- Utilitaires ---------------------------------------------------------------------------

/** Langue avant la lecture du corps : page d'origine (/en/…) d'après Referer. */
function langueReferer(request: Request): Langue {
  try {
    const ref = request.headers.get("referer");
    if (!ref) return "fr";
    const p = new URL(ref).pathname;
    return p === "/en" || p.startsWith("/en/") ? "en" : "fr";
  } catch {
    return "fr";
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json(corps: Record<string, unknown>, status: number, requestId: string): NextResponse {
  return NextResponse.json(corps, {
    status,
    headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
  });
}

function typeMime(request: Request): string {
  return (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
}

// --- Gestionnaire ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const requestId = randomUUID();
  let t: (typeof messages)[Langue] = messages[langueReferer(request)];

  const refuser = (status: number, message: string, details: Record<string, unknown>) => {
    void journaliser(EVENEMENTS.formulaireRefuse, {
      resultat: "refus",
      request,
      requestId,
      statut: status,
      details,
    });
    return json({ error: message, ref: requestId }, status, requestId);
  };

  // 1. Type et taille AVANT de lire le corps.
  if (typeMime(request) !== "multipart/form-data") {
    return refuser(415, t.invalid, { motif: "type_contenu" });
  }
  const taille = verifierTaille(request, TAILLE_MAX_CORPS);
  if (!taille.ok) {
    void journaliser(EVENEMENTS.formulaireRefuse, {
      resultat: "refus",
      request,
      requestId,
      statut: taille.reponse.status,
      details: { motif: "taille_corps" },
    });
    return taille.reponse;
  }

  // 2. Limites de débit (par IP, puis plafond global sous le quota Resend).
  const ip = ipClient(request);
  for (const regle of [TABLE_LIMITES.soumissionIp10min, TABLE_LIMITES.soumissionIpJour]) {
    const v = await limiterSelon(regle, ip, { request, requestId });
    if (!v.permis) return reponse429(v.attente, t.rateLimited);
  }
  const global = await limiterSelon(TABLE_LIMITES.soumissionGlobaleJour, "global", {
    request,
    requestId,
  });
  if (!global.permis) return reponse429(global.attente, t.rateLimited);

  // 3. Lecture du corps (borné par Content-Length) et champs connus seulement.
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return refuser(400, t.invalid, { motif: "corps_illisible" });
  }
  const lu = lireChamps(data);
  if (!lu.ok) {
    return refuser(400, t.invalid, { motif: lu.motif, champ: lu.champ.slice(0, 40) });
  }
  if (lu.texte.locale === "en" || lu.texte.locale === "fr") t = messages[lu.texte.locale];

  // Pot de miel : un robot qui remplit ce champ reçoit un faux succès.
  // « tl_verif » est le nom actuel ; « entreprise_site » reste refusé pour les
  // robots qui ont mémorisé l'ancien formulaire.
  if (["tl_verif", "entreprise_site"].some((c) => (lu.texte[c] ?? "").trim() !== "")) {
    void journaliser(EVENEMENTS.formulaireRefuse, {
      resultat: "refus",
      request,
      requestId,
      statut: 200,
      durable: false,
      details: { motif: "pot_de_miel" },
    });
    return json({ ok: true }, 200, requestId);
  }

  // 4. Schéma strict.
  const parse = SchemaSoumission.safeParse(lu.texte);
  if (!parse.success) {
    const champ = String(parse.error.issues[0]?.path?.[0] ?? "");
    return refuser(400, messageSchema(t, parse.error.issues, lu.texte), {
      motif: "schema",
      champ: champ.slice(0, 40),
      errcode: parse.error.issues[0]?.code,
    });
  }
  const { nom, courriel, telephone, locale } = parse.data;
  const message = parse.data.message ?? "";

  // 5. Pièces jointes : nombre et tailles d'abord, puis type réel.
  const recus = lu.fichiers.map(({ champ, fichier }) => ({
    champ,
    nom: fichier.name,
    taille: fichier.size,
  }));
  const tailles = verifierTailles(recus);
  if (tailles && !tailles.ok) return refuser(413, t.files, { motif: tailles.motif });

  const verdict = verifierFichiers(
    await Promise.all(
      lu.fichiers.map(async ({ champ, fichier }) => ({
        champ,
        nom: fichier.name,
        taille: fichier.size,
        contenu: new Uint8Array(await fichier.arrayBuffer()),
      })),
    ),
  );
  if (!verdict.ok) {
    return verdict.motif === "type_refuse"
      ? refuser(415, t.fileType(verdict.nom ?? ""), { motif: verdict.motif })
      : refuser(413, t.files, { motif: verdict.motif });
  }
  const pieces = verdict.fichiers;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return reponseErreur(503, t.unavailable, {
      request,
      requestId,
      err: { name: "ConfigurationManquante", message: "service de courriel non configuré" },
    });
  }

  // 6. Base de données, par le serveur — n'empêche jamais l'envoi du courriel.
  const soumissionId = randomUUID();
  let soumissionEnregistree = false;
  const secret = secretRpc();
  const sb = clientRpc();
  const echecBase = (etape: string, errcode?: unknown) =>
    void journaliser(EVENEMENTS.erreur5xx, {
      resultat: "echec",
      request,
      requestId,
      details: { etape, errcode: typeof errcode === "string" ? errcode : undefined },
    });

  if (!secret || !sb) {
    echecBase("configuration");
  } else {
    try {
      const { error } = await sb.rpc("soumission_enregistrer", {
        p_secret: secret,
        p_donnees: {
          id: soumissionId,
          nom,
          courriel,
          telephone,
          message: message || null,
          locale,
          fichiers: pieces.map((p) => p.nom),
        },
      });
      if (error) echecBase("soumission_enregistrer", error.code);
      else soumissionEnregistree = true;
    } catch {
      echecBase("soumission_enregistrer", "exception");
    }

    // Attribution publicitaire (invalide → lead « direct », jamais bloquant).
    const attr = lireTlAttr(lu.texte.tl_attr);
    if (lu.texte.tl_attr && !attr) {
      void journaliser(EVENEMENTS.formulaireRefuse, {
        resultat: "refus",
        request,
        requestId,
        durable: false,
        details: { motif: "tl_attr_invalide" },
      });
    }
    try {
      const { error } = await sb.rpc("lead_pub_enregistrer", {
        p_secret: secret,
        p_donnees: {
          session_id: attr?.id ?? null,
          nom,
          courriel,
          telephone,
          platform: attr?.platform ?? "direct",
          utm_source: nettoyerChaine(attr?.utm_source, 300),
          utm_medium: nettoyerChaine(attr?.utm_medium, 300),
          utm_campaign: nettoyerChaine(attr?.utm_campaign, 300),
          utm_content: nettoyerChaine(attr?.utm_content, 300),
          utm_term: nettoyerChaine(attr?.utm_term, 300),
          campaign_id: nettoyerChaine(attr?.campaign_id, 100),
          adset_id: nettoyerChaine(attr?.adset_id, 100),
          ad_id: nettoyerChaine(attr?.ad_id, 100),
          placement: nettoyerChaine(attr?.placement, 100),
          fbclid: nettoyerChaine(attr?.fbclid, 500),
          gclid: nettoyerChaine(attr?.gclid, 500),
          landing_path: nettoyerChaine(attr?.landing_path, 500),
        },
      });
      if (error) echecBase("lead_pub_enregistrer", error.code);
    } catch {
      echecBase("lead_pub_enregistrer", "exception");
    }
  }

  // 7. Courriel à info@ : chaque valeur échappée, sujet sur une seule ligne.
  const html = `
    <h2>Nouvelle soumission — technolot.ca</h2>
    <p><strong>Nom :</strong> ${escapeHtml(nom)}</p>
    <p><strong>Courriel :</strong> ${escapeHtml(courriel)}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(telephone)}</p>
    <p><strong>Message :</strong><br/>${escapeHtml(message || "(aucun message)").replace(/\n/g, "<br/>")}</p>
    <p><strong>Pièces jointes :</strong> ${
      pieces.length > 0 ? pieces.map((p) => escapeHtml(p.nom)).join(", ") : "aucune"
    }</p>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `Techno Lot <${process.env.FROM_EMAIL ?? "onboarding@resend.dev"}>`,
      to: [process.env.CONTACT_EMAIL ?? "info@technolot.ca"],
      replyTo: courriel,
      subject: `Nouvelle soumission de ${nom}`,
      html,
      attachments: pieces.map((p) => ({
        filename: p.nom,
        content: Buffer.from(p.contenu),
        contentType: p.mime,
      })),
      // Permet de retrouver ce courriel dans la boîte Hostinger (seulement si la demande est en base).
      ...(soumissionEnregistree ? { headers: { [ENTETE_SOUMISSION]: soumissionId } } : {}),
    });
    if (error) {
      return reponseErreur(502, t.sendFailed, { request, requestId, err: error });
    }
  } catch (err) {
    return reponseErreur(502, t.sendFailed, { request, requestId, err });
  }

  return json({ ok: true }, 200, requestId);
}
