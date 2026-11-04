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
 * (`ipClient(request)`), empreinte du navigateur (`empreinteNavigateur`),
 * identifiant d'appareil de confiance, courriel en minuscules ou « global ».
 * Rappel : `limite_debit` refuse dès que compte > max, donc max = 3 → 4e refusé.
 * Les plafonds du suivi des pubs (300 événements par session, 600 par minute
 * au total) sont appliqués dans la fonction SQL `suivi_pub_enregistrer`.
 */
export const TABLE_LIMITES = {
  /** POST /api/soumission, par IP : 3 / 10 min. */
  soumissionIp10min: { route: "soumission:ip:10min", fenetreSecondes: 600, max: 3 },
  /** POST /api/soumission, par IP : 5 / 24 h. */
  soumissionIpJour: { route: "soumission:ip:jour", fenetreSecondes: 86_400, max: 5 },
  /**
   * POST /api/soumission, par empreinte de navigateur (survit à un changement
   * d'IP) : 3 / 10 min. Compté SEULEMENT sur les soumissions valides (après le
   * pot de miel, le schéma et les fichiers) : un robot qui copie un Chrome
   * courant ne doit pas griller l'empreinte de vrais clients.
   */
  soumissionEmpreinte10min: { route: "soumission:empreinte:10min", fenetreSecondes: 600, max: 3 },
  /**
   * POST /api/soumission, par empreinte : 10 / 24 h, soumissions valides
   * seulement. Volontairement plus haut que la limite par IP : deux vrais
   * clients peuvent avoir le même navigateur.
   */
  soumissionEmpreinteJour: { route: "soumission:empreinte:jour", fenetreSecondes: 86_400, max: 10 },
  /**
   * POST /api/soumission, par courriel saisi (minuscules) : 3 / 24 h. Compté
   * après le schéma, les fichiers et l'empreinte, AVANT le plafond global : un
   * doublon refusé n'entame pas le budget des vraies demandes.
   */
  soumissionCourrielJour: { route: "soumission:courriel:jour", fenetreSecondes: 86_400, max: 3 },
  /** POST /api/soumission, par téléphone (10 derniers chiffres) : 3 / 24 h, même règle. */
  soumissionTelephoneJour: { route: "soumission:telephone:jour", fenetreSecondes: 86_400, max: 3 },
  /**
   * POST /api/soumission, global (clé « global ») : 100 / 24 h, sous le quota
   * Resend. Compté SEULEMENT sur les soumissions valides (après le pot de miel,
   * la validation et les doublons), jamais sur les robots : voir
   * app/api/soumission/route.ts.
   */
  soumissionGlobaleJour: { route: "soumission:global:jour", fenetreSecondes: 86_400, max: 100 },
  /** POST /api/track, par IP : 120 / min (au-delà : 204 silencieux, rien d'enregistré). */
  suiviIpMinute: { route: "track:ip:min", fenetreSecondes: 60, max: 120 },
  /*
   * POST /admin/auth/password. Tout est compté AVANT la vérification du mot de
   * passe (100 essais simultanés ne passent pas) et un mauvais nom d'utilisateur
   * compte comme un mauvais mot de passe. Navigateur inconnu : IP, puis
   * empreinte, puis global, arrêt au premier refus (un attaquant déjà bloqué
   * n'alimente plus le global). Navigateur connu : compteurs d'appareil seuls.
   */
  /** Navigateur inconnu, par IP : 3 / h. */
  connexionIpHeure: { route: "auth-mdp:ip:1h", fenetreSecondes: 3_600, max: 3 },
  /** Navigateur inconnu, par IP : 5 / 24 h. */
  connexionIpJour: { route: "auth-mdp:ip:24h", fenetreSecondes: 86_400, max: 5 },
  /** Navigateur inconnu, par empreinte (même navigateur derrière un VPN) : 3 / h. */
  connexionEmpreinteHeure: { route: "auth-mdp:empreinte:1h", fenetreSecondes: 3_600, max: 3 },
  /** Navigateur inconnu, par empreinte : 5 / 24 h. */
  connexionEmpreinteJour: { route: "auth-mdp:empreinte:24h", fenetreSecondes: 86_400, max: 5 },
  /** Navigateurs inconnus au total (clé « global ») : 5 / h. Jamais effacé. */
  connexionGlobaleHeure: { route: "auth-mdp:global:1h", fenetreSecondes: 3_600, max: 5 },
  /** Navigateurs inconnus au total (clé « global ») : 10 / 24 h. Jamais effacé. */
  connexionGlobaleJour: { route: "auth-mdp:global:24h", fenetreSecondes: 86_400, max: 10 },
  /** Navigateur connu (témoin signé), par appareil : 3 / 15 min. */
  connexionAppareil15min: { route: "auth-mdp:appareil:15min", fenetreSecondes: 900, max: 3 },
  /** Navigateur connu (témoin signé), par appareil : 10 / 24 h. */
  connexionAppareilJour: { route: "auth-mdp:appareil:24h", fenetreSecondes: 86_400, max: 10 },
  /** GET /admin/auth/callback, par IP : 20 / 10 min (au-delà : /admin/login?error=trop_de_tentatives). */
  callbackIp10min: { route: "auth-callback:ip:10min", fenetreSecondes: 600, max: 20 },
  /**
   * POST /admin/auth/mfa/verification (code de la double authentification),
   * par compte (user.id) : 3 essais / 15 min. Chaque essai compte AVANT l'appel
   * à Supabase (la limite doit précéder la vérification) : 3 codes faux → le
   * 4e essai reçoit 429. Un code juste efface les deux compteurs.
   */
  mfaCompte15min: { route: "auth-mfa:compte:15min", fenetreSecondes: 900, max: 3 },
  /** POST /admin/auth/mfa/verification, par IP : 3 essais / 15 min (même règle). */
  mfaIp15min: { route: "auth-mfa:ip:15min", fenetreSecondes: 900, max: 3 },
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

/** Clé envoyée à la base : aucune IP ni courriel en clair. */
function cleHachee(secret: string, route: string, cle: string): string {
  return createHmac("sha256", secret).update(`${route}:${cle}`).digest("hex");
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

  const empreinte = cleHachee(secret, route, cle);
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
 * Remet à zéro le compteur de (route, cle), par exemple après une connexion
 * réussie. Ne lève jamais d'erreur : un échec est journalisé `limite.erreur`
 * et le compteur s'éteint de lui-même à la fin de sa fenêtre.
 */
export async function effacerLimite(route: string, cle: string): Promise<void> {
  const secret = secretRpc();
  const sb = clientRpc();
  if (!secret || !sb) {
    void journaliser(EVENEMENTS.limiteErreur, {
      resultat: "echec",
      durable: false,
      details: { route, operation: "effacer", motif: "configuration" },
    });
    return;
  }
  if (!route || !cle) {
    void journaliser(EVENEMENTS.limiteErreur, {
      resultat: "echec",
      details: { route, operation: "effacer", motif: "parametres" },
    });
    return;
  }
  try {
    const { error } = await sb.rpc("limite_effacer", {
      p_secret: secret,
      p_cle: cleHachee(secret, route, cle),
    });
    if (error) {
      void journaliser(EVENEMENTS.limiteErreur, {
        resultat: "echec",
        details: { route, operation: "effacer", motif: "rpc", errcode: error.code },
      });
    }
  } catch {
    void journaliser(EVENEMENTS.limiteErreur, {
      resultat: "echec",
      details: { route, operation: "effacer", motif: "exception" },
    });
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
