import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { reponseErreur } from "@/lib/securite/erreurs";
import { ipClient } from "@/lib/securite/ip";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import { limiterSelon, reponse429, TABLE_LIMITES } from "@/lib/securite/limite";
import { lireJson } from "@/lib/securite/requete";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Point de terminaison « marketplace account deletion » exigé par eBay pour
 * activer un jeu de clés Production.
 *
 * - GET  : eBay envoie un `challenge_code`, on répond le SHA-256 de
 *          challengeCode + verificationToken + URL du point de terminaison
 *          (l'URL CONFIGURÉE, jamais l'en-tête Host de la requête).
 * - POST : eBay signale qu'un utilisateur a supprimé son compte. Techno Lot ne
 *          conserve aucune donnée personnelle d'acheteur (seulement ses propres
 *          commandes), il n'y a donc rien à effacer : on accuse réception.
 *          Seuls l'identifiant de notification et le sujet sont journalisés
 *          (jamais le corps : il contient des identifiants d'acheteurs).
 *
 * Variables côté serveur : EBAY_VERIFICATION_TOKEN (32-80 caractères) et
 * EBAY_DELETION_ENDPOINT (l'URL exacte déclarée dans le portail eBay).
 * Limite : 30 requêtes / min par IP.
 */

/** Code de défi : caractères sûrs seulement (eBay envoie un identifiant de type UUID). */
const CHALLENGE_RE = /^[A-Za-z0-9._~-]{8,256}$/;
const TAILLE_MAX_NOTIFICATION = 64 * 1024;
const MESSAGE_429 = "Trop de requêtes.";

async function limite(request: Request): Promise<NextResponse | null> {
  const v = await limiterSelon(TABLE_LIMITES.ebaySuppressionIpMinute, ipClient(request), { request });
  return v.permis ? null : reponse429(v.attente, MESSAGE_429);
}

export async function GET(request: Request) {
  const refus = await limite(request);
  if (refus) return refus;

  const token = process.env.EBAY_VERIFICATION_TOKEN;
  const endpoint = process.env.EBAY_DELETION_ENDPOINT;
  if (!token || !endpoint) {
    return reponseErreur(503, "Service non configuré.", {
      request,
      err: { name: "ConfigurationManquante", message: "point de terminaison eBay non configuré" },
    });
  }

  const challenge = new URL(request.url).searchParams.get("challenge_code");
  if (!challenge || !CHALLENGE_RE.test(challenge)) {
    void journaliser(EVENEMENTS.formulaireRefuse, {
      resultat: "refus",
      request,
      statut: 400,
      details: { motif: "challenge_code_invalide" },
    });
    return NextResponse.json(
      { error: "challenge_code invalide." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const hash = createHash("sha256");
  hash.update(challenge);
  hash.update(token);
  hash.update(endpoint);

  return NextResponse.json(
    { challengeResponse: hash.digest("hex") },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

/** Champ texte court d'un objet inconnu (pour le journal), ou undefined. */
function champ(objet: unknown, cle: string): string | undefined {
  if (!objet || typeof objet !== "object") return undefined;
  const v = (objet as Record<string, unknown>)[cle];
  return typeof v === "string" ? v.slice(0, 100) : undefined;
}

/** Corps texte UTF-8 d'au plus `max` octets, ou null (trop gros, illisible). */
async function lireFluxBorne(request: Request, max: number): Promise<string | null> {
  if (!request.body) return null;
  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await lecteur.cancel().catch(() => {});
        return null;
      }
      morceaux.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(morceaux));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const refus = await limite(request);
  if (refus) return refus;

  // Avec Content-Length : lecture bornée commune (411/413/415). Sans (envoi
  // « chunked ») : lecture en flux plafonnée ici, pour ne jamais refuser un
  // accusé de réception légitime d'eBay (il pourrait désactiver les clés).
  let corps: unknown;
  if (request.headers.get("content-length") !== null) {
    const lu = await lireJson<unknown>(request, TAILLE_MAX_NOTIFICATION);
    if (!lu.ok) {
      void journaliser(EVENEMENTS.formulaireRefuse, {
        resultat: "refus",
        request,
        statut: lu.reponse.status,
        details: { motif: "notification_ebay_illisible" },
      });
      return lu.reponse;
    }
    corps = lu.donnees;
  } else {
    const texte = await lireFluxBorne(request, TAILLE_MAX_NOTIFICATION);
    try {
      corps = texte === null ? undefined : JSON.parse(texte);
    } catch {
      corps = undefined;
    }
  }

  if (!corps || typeof corps !== "object" || Array.isArray(corps)) {
    void journaliser(EVENEMENTS.formulaireRefuse, {
      resultat: "refus",
      request,
      statut: 400,
      details: { motif: "notification_ebay_invalide" },
    });
    return NextResponse.json(
      { error: "Requête invalide." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const metadata = (corps as Record<string, unknown>).metadata;
  const notification = (corps as Record<string, unknown>).notification;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      evenement: "ebay.suppression_compte",
      topic: champ(metadata, "topic"),
      notification_id: champ(notification, "notificationId"),
    }),
  );
  return new Response(null, { status: 200 });
}
