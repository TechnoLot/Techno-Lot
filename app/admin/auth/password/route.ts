import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emailForUsername, isAdminEmail } from "@/lib/admin/config";
import { origineConfiguree } from "@/lib/admin/origin";
import { messageBlocageConnexion } from "@/lib/admin/messages-connexion";
import { lireAppareil, poserAppareil } from "@/lib/securite/appareil";
import { cheminInterne } from "@/lib/securite/chemin-interne";
import { empreinteNavigateur } from "@/lib/securite/empreinte";
import { ipClient } from "@/lib/securite/ip";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";
import {
  effacerLimite,
  limiterSelon,
  reponse429,
  TABLE_LIMITES,
  type RegleLimite,
} from "@/lib/securite/limite";
import { lireJson, verifierTaille } from "@/lib/securite/requete";

export const runtime = "nodejs";

/**
 * POST /admin/auth/password — connexion par nom d'utilisateur + mot de passe.
 * Le nom est traduit en courriel côté serveur (ADMIN_USERNAMES), puis Supabase
 * vérifie le mot de passe et pose les témoins de session.
 *
 * Deux formes acceptées :
 *  - JSON (`application/json`, envoi par le formulaire avec JavaScript) →
 *    réponse JSON `{ ok: true }` ou `{ error }` ;
 *  - formulaire natif (`application/x-www-form-urlencoded`, sans JavaScript)
 *    → redirection 303 vers `next` ou vers `/admin/login?error=<code>`.
 *    Le formulaire est en POST : le mot de passe ne passe jamais dans l'URL.
 *
 * Blocage après 3 essais, y compris à travers un VPN (on ne peut pas « voir »
 * derrière une IP, d'où trois signaux qui n'en dépendent pas tous) :
 *  - navigateur INCONNU : règles par IP, puis par empreinte, puis globales,
 *    arrêt au premier refus. Cet ordre est voulu : un attaquant déjà bloqué par
 *    IP ou empreinte n'alimente plus le compteur global, donc ne bloque pas le
 *    reste du monde. Refus journalisé `auth.blocage` (courriel d'alerte).
 *  - navigateur CONNU (témoin signé, lib/securite/appareil.ts) : seulement ses
 *    compteurs d'appareil. C'est ce qui empêche un attaquant de bloquer le vrai
 *    admin sur ses ordinateurs habituels.
 * Tout est compté AVANT la validation du corps et la vérification du mot de
 * passe : un mauvais nom d'utilisateur compte comme un mauvais mot de passe, et
 * 100 essais simultanés ne passent pas. Un mot de passe juste efface les
 * compteurs IP et empreinte (ou d'appareil), jamais les globaux, puis pose ou
 * renouvelle le témoin d'appareil.
 *
 * Aussi : corps ≤ 4 Ko ; même message générique et temps de réponse comparable
 * (≥ 600 ms) que le compte existe ou non ; aucun texte de Supabase renvoyé ;
 * jamais de mot de passe journalisé.
 */

const TAILLE_MAX = 4_096;
const INVALIDE = "Identifiants invalides.";
const DUREE_MIN_ECHEC_MS = 600;

const SchemaConnexion = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
  next: z.string().max(2048).optional(),
});

type Forme = "json" | "formulaire";

/** Une règle de limite et la clé à laquelle elle s'applique. */
type Compteur = readonly [RegleLimite, string];

function typeMime(request: Request): string {
  return (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
}

async function attendreAuMoins(debut: number, ms: number) {
  const reste = ms - (Date.now() - debut);
  if (reste > 0) await new Promise((r) => setTimeout(r, reste));
}

export async function POST(request: Request) {
  const debut = Date.now();
  const requestId = randomUUID();
  const mime = typeMime(request);
  const forme: Forme | null =
    mime === "application/json" ? "json" : mime === "application/x-www-form-urlencoded" ? "formulaire" : null;

  if (!forme) {
    return NextResponse.json(
      { error: "Type de contenu non pris en charge." },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Lecture bornée du corps.
  let brut: unknown;
  if (forme === "json") {
    const lu = await lireJson<unknown>(request, TAILLE_MAX);
    if (!lu.ok) return lu.reponse;
    brut = lu.donnees;
  } else {
    const taille = verifierTaille(request, TAILLE_MAX);
    if (!taille.ok) return taille.reponse;
    const form = await request.formData().catch(() => null);
    brut = form
      ? {
          username: form.get("username") ?? undefined,
          password: form.get("password") ?? undefined,
          next: form.get("next") ?? undefined,
        }
      : null;
  }

  const nextBrut =
    brut && typeof brut === "object" ? (brut as Record<string, unknown>).next : undefined;
  const next = cheminInterne(nextBrut);

  /** Réponse d'échec selon la forme (JSON ou redirection 303). */
  const repondre = (status: 401 | 429, attente = 60) => {
    if (forme === "formulaire") {
      const url = new URL("/admin/login", origineConfiguree(request));
      url.searchParams.set("error", status === 429 ? "trop_de_tentatives" : "identifiants");
      if (next !== "/admin") url.searchParams.set("next", next);
      return NextResponse.redirect(url, {
        status: 303,
        headers: status === 429 ? { "Retry-After": String(Math.max(1, Math.ceil(attente))) } : undefined,
      });
    }
    return status === 429
      ? reponse429(attente, messageBlocageConnexion(attente))
      : NextResponse.json({ error: INVALIDE }, { status: 401, headers: { "Cache-Control": "no-store" } });
  };

  const echec = async (motif: string, compteConnu: boolean, errcode?: string) => {
    void journaliser(EVENEMENTS.authEchec, {
      resultat: "echec",
      request,
      requestId,
      statut: 401,
      details: { methode: "mot_de_passe", motif, compte_connu: compteConnu, errcode },
    });
    await attendreAuMoins(debut, DUREE_MIN_ECHEC_MS);
    return repondre(401);
  };

  // Limites (avant toute validation et toute vérification du mot de passe).
  const ip = ipClient(request);
  const empreinte = empreinteNavigateur(request);
  const appareil = await lireAppareil();
  const parVisiteur: readonly Compteur[] = [
    [TABLE_LIMITES.connexionIpHeure, ip],
    [TABLE_LIMITES.connexionIpJour, ip],
    [TABLE_LIMITES.connexionEmpreinteHeure, empreinte],
    [TABLE_LIMITES.connexionEmpreinteJour, empreinte],
  ];
  const globaux: readonly Compteur[] = [
    [TABLE_LIMITES.connexionGlobaleHeure, "global"],
    [TABLE_LIMITES.connexionGlobaleJour, "global"],
  ];
  const parAppareil: readonly Compteur[] = appareil
    ? [
        [TABLE_LIMITES.connexionAppareil15min, appareil],
        [TABLE_LIMITES.connexionAppareilJour, appareil],
      ]
    : [];

  for (const [regle, cle] of appareil ? parAppareil : [...parVisiteur, ...globaux]) {
    const v = await limiterSelon(regle, cle, { request, requestId });
    if (!v.permis) {
      if (!appareil) {
        void journaliser(EVENEMENTS.authBlocage, {
          resultat: "refus",
          request,
          requestId,
          statut: 429,
          details: { regle: regle.route, attente: v.attente },
        });
      }
      return repondre(429, v.attente);
    }
  }

  const parse = SchemaConnexion.safeParse(brut);
  if (!parse.success) return echec("donnees_invalides", false);
  const { username, password } = parse.data;

  const email = emailForUsername(username);
  if (!email || !isAdminEmail(email)) return echec("compte_inconnu", false);

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.status === 429) {
        void journaliser(EVENEMENTS.authEchec, {
          resultat: "refus",
          request,
          requestId,
          statut: 429,
          details: { methode: "mot_de_passe", motif: "limite_supabase" },
        });
        return repondre(429, 60);
      }
      return echec(
        error.code === "invalid_credentials" ? "identifiants" : "supabase",
        true,
        error.code ?? undefined,
      );
    }
    userId = data.user?.id ?? null;
  } catch {
    return echec("exception", true);
  }

  // Mot de passe juste : les erreurs de frappe passées ne comptent plus, sauf
  // au compteur global, qu'aucune réussite ne doit pouvoir remettre à zéro.
  await Promise.all(
    (appareil ? parAppareil : parVisiteur).map(([regle, cle]) => effacerLimite(regle.route, cle)),
  );
  await poserAppareil(appareil);

  void journaliser(EVENEMENTS.authConnexion, {
    resultat: "ok",
    request,
    requestId,
    userId,
    statut: forme === "json" ? 200 : 303,
    details: { methode: "mot_de_passe" },
  });

  if (forme === "formulaire") {
    return NextResponse.redirect(new URL(next, origineConfiguree(request)), 303);
  }
  return NextResponse.json({ ok: true, next }, { headers: { "Cache-Control": "no-store" } });
}
