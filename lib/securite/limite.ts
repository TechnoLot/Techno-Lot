import "server-only";
import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { clientRpc, secretRpc } from "./rpc";
import { EVENEMENTS, journaliser, type ChampsJournal } from "./journal";

/**
 * Limites de débit partagées (check 12).
 *
 * Stockage : table securite.limites (schéma non exposé), par la fonction SQL
 * `limite_debit` appelée avec la clé publishable SANS session, protégée par le
 * secret serveur SECURITE_RPC_SECRET. Fonctionne avec plusieurs processus et
 * après un redémarrage (contrairement à un compteur en mémoire).
 *
 * La clé envoyée à la base est un HMAC-SHA256 (hex) de « route:cle » : aucune
 * IP ni courriel en clair dans la base (Loi 25).
 *
 * Choix « ouvert » : si le secret manque ou si l'appel échoue, la requête est
 * PERMISE (et l'incident journalisé `limite.erreur`) — on ne perd jamais un
 * vrai formulaire à cause d'une panne de la limite.
 */

export type VerdictLimite = { permis: boolean; attente: number };

export type RegleLimite = {
  /** Espace de noms de la clé (inclus dans le HMAC). */
  route: string;
  fenetreSecondes: number;
  max: number;
};

/**
 * Tableau des limites approuvé (audit T5, check 12). Clé conseillée : IP
 * (`ipClient(request)`), courriel visé en minuscules (compte) ou « global ».
 * Les plafonds du suivi des pubs (300 événements par session, 600 par minute
 * au total) sont appliqués dans la fonction SQL `suivi_pub_enregistrer`.
 */
export const TABLE_LIMITES = {
  /** POST /api/soumission, par IP : 3 / 10 min. */
  soumissionIp10min: { route: "soumission:ip:10min", fenetreSecondes: 600, max: 3 },
  /** POST /api/soumission, par IP : 10 / 24 h. */
  soumissionIpJour: { route: "soumission:ip:jour", fenetreSecondes: 86_400, max: 10 },
  /** POST /api/soumission, global (clé « global ») : 50 / 24 h, sous le quota Resend. */
  soumissionGlobaleJour: { route: "soumission:global:jour", fenetreSecondes: 86_400, max: 50 },
  /** POST /api/track, par IP : 120 / min (au-delà : 204 silencieux, rien d'enregistré). */
  suiviIpMinute: { route: "track:ip:min", fenetreSecondes: 60, max: 120 },
  /** POST /admin/auth/password, par IP : 5 / min. */
  motDePasseIpMinute: { route: "auth-mdp:ip:min", fenetreSecondes: 60, max: 5 },
  /** POST /admin/auth/password, par IP : 20 / h. */
  motDePasseIpHeure: { route: "auth-mdp:ip:heure", fenetreSecondes: 3_600, max: 20 },
  /** POST /admin/auth/password, par compte visé : 10 / 15 min (puis délai croissant). */
  motDePasseCompte15min: { route: "auth-mdp:compte:15min", fenetreSecondes: 900, max: 10 },
  /** POST /admin/auth/request (lien magique), par IP : 3 / h. */
  lienMagiqueIpHeure: { route: "auth-lien:ip:heure", fenetreSecondes: 3_600, max: 3 },
  /** POST /admin/auth/request (lien magique), global : 5 / h. */
  lienMagiqueGlobalHeure: { route: "auth-lien:global:heure", fenetreSecondes: 3_600, max: 5 },
  /** GET /admin/auth/callback, par IP : 20 / 10 min (au-delà : /admin/login?error=trop_de_tentatives). */
  callbackIp10min: { route: "auth-callback:ip:10min", fenetreSecondes: 600, max: 20 },
  /** GET/POST /api/ebay/account-deletion, par IP : 30 / min. */
  ebaySuppressionIpMinute: { route: "ebay-suppression:ip:min", fenetreSecondes: 60, max: 30 },
  /** Courriels d'alerte de sécurité : 1 / h par type d'alerte (lib/securite/journal.ts). */
  alerteCourrielHeure: { route: "alerte:courriel", fenetreSecondes: 3_600, max: 1 },
} as const satisfies Record<string, RegleLimite>;

const OUVERT: VerdictLimite = { permis: true, attente: 0 };

function parametresValides(route: string, cle: string, fenetre: number, max: number): boolean {
  return (
    typeof route === "string" &&
    route.length > 0 &&
    typeof cle === "string" &&
    cle.length > 0 &&
    Number.isInteger(fenetre) &&
    fenetre >= 1 &&
    fenetre <= 86_400 &&
    Number.isInteger(max) &&
    max >= 1 &&
    max <= 10_000
  );
}

/**
 * Compte un appel pour (route, cle) dans une fenêtre fixe de `fenetreSecondes`.
 * `permis: false` au-delà de `max`, avec `attente` = secondes avant de réessayer.
 */
export async function limiter(
  route: string,
  cle: string,
  fenetreSecondes: number,
  max: number,
): Promise<VerdictLimite> {
  const secret = secretRpc();
  const sb = clientRpc();
  if (!secret || !sb) {
    void journaliser(EVENEMENTS.limiteErreur, {
      resultat: "echec",
      durable: false,
      details: { route, motif: "configuration" },
    });
    return OUVERT;
  }
  if (!parametresValides(route, cle, fenetreSecondes, max)) {
    void journaliser(EVENEMENTS.limiteErreur, {
      resultat: "echec",
      details: { route, motif: "parametres" },
    });
    return OUVERT;
  }

  const empreinte = createHmac("sha256", secret).update(`${route}:${cle}`).digest("hex");
  try {
    const { data, error } = await sb.rpc("limite_debit", {
      p_secret: secret,
      p_cle: empreinte,
      p_fenetre_s: fenetreSecondes,
      p_max: max,
    });
    if (error) {
      void journaliser(EVENEMENTS.limiteErreur, {
        resultat: "echec",
        details: { route, motif: "rpc", errcode: error.code },
      });
      return OUVERT;
    }
    const attente = typeof data === "number" && data > 0 ? Math.ceil(data) : 0;
    return attente > 0 ? { permis: false, attente } : OUVERT;
  } catch {
    void journaliser(EVENEMENTS.limiteErreur, {
      resultat: "echec",
      details: { route, motif: "exception" },
    });
    return OUVERT;
  }
}

/**
 * Applique une règle de `TABLE_LIMITES` et journalise `limite.depassee` en cas
 * de refus (avec IP, chemin et identifiant de requête du contexte).
 *
 * Exemple :
 *   const v = await limiterSelon(TABLE_LIMITES.soumissionIp10min, ipClient(request), { request });
 *   if (!v.permis) return reponse429(v.attente, "Trop d'envois. Réessayez plus tard.");
 */
export async function limiterSelon(
  regle: RegleLimite,
  cle: string,
  contexte: Omit<ChampsJournal, "resultat" | "details" | "durable"> = {},
): Promise<VerdictLimite> {
  const verdict = await limiter(regle.route, cle, regle.fenetreSecondes, regle.max);
  if (!verdict.permis) {
    void journaliser(EVENEMENTS.limiteDepassee, {
      ...contexte,
      resultat: "refus",
      statut: 429,
      details: { regle: regle.route, attente: verdict.attente },
    });
  }
  return verdict;
}

/** Réponse 429 avec `Retry-After` (secondes, au moins 1) et `Cache-Control: no-store`. */
export function reponse429(attente: number, message: string): NextResponse {
  const secondes = Math.max(1, Math.ceil(Number.isFinite(attente) ? attente : 60));
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { "Retry-After": String(secondes), "Cache-Control": "no-store" },
    },
  );
}
