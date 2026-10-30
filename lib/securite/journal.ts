import "server-only";
import { after } from "next/server";
import { Resend } from "resend";
import { entetesDe, ipClient, IP_INCONNUE, type SourceEntetes } from "./ip";
import { clientRpc, secretRpc } from "./rpc";
import { limiter, TABLE_LIMITES } from "./limite";

/**
 * Journal de sécurité (check 08).
 *
 * `journaliser(evenement, champs)` :
 *  1. écrit UNE ligne JSON sur la sortie standard (journaux du processus Node
 *     chez Hostinger, ou de la fonction sur Vercel) ;
 *  2. l'insère durablement dans securite.journal par la fonction SQL
 *     `journal_securite_ajouter` (secret serveur SECURITE_RPC_SECRET), sans
 *     bloquer la réponse (`after()` de Next) et sans jamais lever d'erreur ;
 *  3. envoie un courriel d'alerte à CONTACT_EMAIL quand un seuil est franchi
 *     sur 5 minutes (au plus 1 courriel par type d'alerte et par heure).
 *
 * Rien de sensible n'est journalisé : clés sensibles masquées (mot de passe,
 * jeton, secret, cookie, Authorization…), valeurs nettoyées (sauts de ligne
 * retirés contre l'injection de journal, 300 caractères au plus), chemin SANS
 * la chaîne de requête (elle peut contenir un code ou un jeton). On journalise
 * des identifiants (user_id), jamais un profil complet.
 */

/** Événements prévus (nom stable : sert aux recherches et aux alertes). */
export const EVENEMENTS = {
  authConnexion: "auth.connexion",
  authEchec: "auth.echec",
  authDeconnexion: "auth.deconnexion",
  authLienMagique: "auth.lien_magique",
  authMotDePasseChange: "auth.mot_de_passe_change",
  authMfaActive: "auth.mfa_active",
  authMfaEchec: "auth.mfa_echec",
  adminRefus: "admin.refus",
  adminAction: "admin.action",
  cronRefus: "cron.refus",
  limiteDepassee: "limite.depassee",
  limiteErreur: "limite.erreur",
  webhookSignatureInvalide: "webhook.signature_invalide",
  erreur5xx: "erreur.5xx",
  erreur4xx: "erreur.4xx",
  formulaireRefuse: "formulaire.refuse",
  alerteEnvoyee: "alerte.envoyee",
} as const;

export type EvenementSecurite = (typeof EVENEMENTS)[keyof typeof EVENEMENTS];
export type ResultatJournal = "ok" | "refus" | "echec";

export type ChampsJournal = {
  resultat: ResultatJournal;
  /** Route handler : la requête (IP, user agent, méthode, chemin). */
  request?: Request;
  /** Server action ou page : `await headers()` de next/headers. */
  entetes?: SourceEntetes;
  requestId?: string | null;
  userId?: string | null;
  statut?: number;
  /** Sans `request` : méthode et chemin à consigner. */
  methode?: string;
  chemin?: string;
  /** Contexte utile (cible, motif, code…) : rédigé avant écriture. */
  details?: Record<string, unknown>;
  /** false : sortie standard seulement (pas d'insertion en base). */
  durable?: boolean;
};

export type LigneJournal = {
  ts: string;
  evenement: EvenementSecurite;
  resultat: ResultatJournal;
  user_id: string | null;
  ip: string;
  ua: string | null;
  request_id: string | null;
  methode: string | null;
  chemin: string | null;
  statut: number | null;
  details: Record<string, unknown>;
};

// --- Rédaction ------------------------------------------------------------------

export const MASQUE = "[masqué]";
const LONGUEUR_VALEUR = 300;
const LONGUEUR_UA = 200;
const CLES_MAX = 30;
const PROFONDEUR_MAX = 3;

/** Sous-chaînes de nom de clé qui désignent une valeur sensible. */
const CLE_SENSIBLE =
  /pass|mdp|secret|token|jeton|authori[sz]ation|cookie|api[-_]?key|apikey|bearer|jwt|otp|signature|refresh|session|credential|private/i;
/** Segments exacts (« cle », « key »…) : évite de masquer « client » ou « cleanup ». */
const SEGMENTS_SENSIBLES = new Set(["cle", "clé", "clef", "key", "pwd", "pin"]);
/**
 * Clés exactes : « code » désigne souvent un code d'autorisation ou un code
 * MFA (pour un code d'erreur, utiliser la clé « errcode »).
 */
const CLES_EXACTES_SENSIBLES = new Set(["code", "nonce", "state"]);
/** Valeurs qui ressemblent à un jeton, même sous une clé anodine. */
const VALEUR_SENSIBLE = [/^\s*bearer\s+\S/i, /eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]*/];
// Caractères de contrôle (dont sauts de ligne et tabulations) et séparateurs de
// ligne Unicode U+2028 / U+2029 (construits par code de caractère).
const CONTROLES = new RegExp(
  "[\\u0000-\\u001F\\u007F" + String.fromCharCode(0x2028, 0x2029) + "]+",
  "g",
);

export function cleSensible(cle: string): boolean {
  if (CLE_SENSIBLE.test(cle)) return true;
  if (CLES_EXACTES_SENSIBLES.has(cle.trim().toLowerCase())) return true;
  const segments = cle
    .split(/[^A-Za-zÀ-ÿ0-9]+|(?<=[a-zà-ÿ0-9])(?=[A-Z])/)
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  return segments.some((s) => SEGMENTS_SENSIBLES.has(s));
}

/** Chaîne sur une ligne, sans caractère de contrôle, tronquée. */
export function nettoyer(valeur: unknown, max = LONGUEUR_VALEUR): string {
  return String(valeur ?? "")
    .replace(CONTROLES, " ")
    .slice(0, max);
}

function redigerProfond(valeur: unknown, profondeur: number): unknown {
  if (valeur === null || valeur === undefined) return null;
  if (typeof valeur === "number") return Number.isFinite(valeur) ? valeur : null;
  if (typeof valeur === "boolean") return valeur;
  if (typeof valeur === "string") {
    return VALEUR_SENSIBLE.some((re) => re.test(valeur)) ? MASQUE : valeur;
  }
  if (typeof valeur === "bigint") return valeur.toString();
  if (valeur instanceof Error) {
    return { nom: valeur.name, message: redigerProfond(valeur.message, profondeur) };
  }
  if (profondeur >= PROFONDEUR_MAX) return "[…]";
  if (Array.isArray(valeur)) {
    return valeur.slice(0, CLES_MAX).map((v) => redigerProfond(v, profondeur + 1));
  }
  if (typeof valeur === "object") {
    const sortie: Record<string, unknown> = {};
    for (const [cle, v] of Object.entries(valeur as Record<string, unknown>).slice(0, CLES_MAX)) {
      sortie[nettoyer(cle, 60)] = cleSensible(cle) ? MASQUE : redigerProfond(v, profondeur + 1);
    }
    return sortie;
  }
  return null; // fonctions, symboles
}

/**
 * Détails rédigés : clés sensibles masquées (à toute profondeur), valeurs
 * d'une ligne et de 300 caractères au plus (objets imbriqués sérialisés).
 */
export function rediger(details: Record<string, unknown> | undefined): Record<string, unknown> {
  const sortie: Record<string, unknown> = {};
  if (!details) return sortie;
  for (const [cle, valeur] of Object.entries(details).slice(0, CLES_MAX)) {
    const nom = nettoyer(cle, 60);
    if (cleSensible(cle)) {
      sortie[nom] = MASQUE;
      continue;
    }
    const r = redigerProfond(valeur, 0);
    if (r === null || typeof r === "number" || typeof r === "boolean") sortie[nom] = r;
    else if (typeof r === "string") sortie[nom] = nettoyer(r);
    else {
      let json: string;
      try {
        json = JSON.stringify(r);
      } catch {
        json = "[non sérialisable]";
      }
      sortie[nom] = nettoyer(json);
    }
  }
  return sortie;
}

// --- Construction de la ligne ---------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cheminDe(request: Request): string | null {
  try {
    return new URL(request.url).pathname; // jamais la chaîne de requête
  } catch {
    return null;
  }
}

export function construireLigne(evenement: EvenementSecurite, champs: ChampsJournal): LigneJournal {
  const source = champs.request ?? champs.entetes;
  const ua = source ? entetesDe(source).get("user-agent") : null;
  const chemin = champs.request ? cheminDe(champs.request) : champs.chemin ?? null;
  const methode = champs.request?.method ?? champs.methode ?? null;
  return {
    ts: new Date().toISOString(), // UTC
    evenement,
    resultat: champs.resultat,
    user_id: champs.userId && UUID.test(champs.userId) ? champs.userId : null,
    ip: source ? ipClient(source) : IP_INCONNUE,
    ua: ua ? nettoyer(ua, LONGUEUR_UA) : null,
    request_id: champs.requestId ? nettoyer(champs.requestId, 64) : null,
    methode: methode ? nettoyer(methode, 10).toUpperCase() : null,
    chemin: chemin ? nettoyer(chemin) : null,
    statut: Number.isInteger(champs.statut) ? (champs.statut as number) : null,
    details: rediger(champs.details),
  };
}

// --- Alertes par courriel -------------------------------------------------------

export type Compteurs = { meme_ip_5min: number; total_5min: number };

export type RegleAlerte = {
  type: string;
  evenement: EvenementSecurite;
  compteur: keyof Compteurs;
  seuil: number;
  libelle: string;
};

/** Seuils sur 5 minutes. Égalité exacte : un seul courriel au franchissement. */
export const REGLES_ALERTE: readonly RegleAlerte[] = [
  { type: "auth_echec_ip", evenement: "auth.echec", compteur: "meme_ip_5min", seuil: 10, libelle: "échecs de connexion depuis une même adresse IP" },
  { type: "auth_echec_total", evenement: "auth.echec", compteur: "total_5min", seuil: 20, libelle: "échecs de connexion au total" },
  { type: "limites_depassees", evenement: "limite.depassee", compteur: "total_5min", seuil: 30, libelle: "requêtes refusées par les limites de débit (429)" },
  { type: "cron_refus", evenement: "cron.refus", compteur: "total_5min", seuil: 5, libelle: "appels de tâches planifiées refusés (mauvais secret)" },
  { type: "erreurs_5xx", evenement: "erreur.5xx", compteur: "total_5min", seuil: 10, libelle: "erreurs serveur (5xx)" },
  { type: "webhook_signature", evenement: "webhook.signature_invalide", compteur: "total_5min", seuil: 3, libelle: "webhooks à signature invalide" },
];

/** Règles dont le seuil vient d'être franchi par cet événement. */
export function alertesFranchies(evenement: EvenementSecurite, compteurs: unknown): RegleAlerte[] {
  if (!compteurs || typeof compteurs !== "object") return [];
  const c = compteurs as Record<string, unknown>;
  return REGLES_ALERTE.filter((r) => r.evenement === evenement && c[r.compteur] === r.seuil);
}

const RUNBOOK = "securite/SECURITY_RUNBOOK.md";

async function envoyerAlerte(regle: RegleAlerte, ligne: LigneJournal): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const de = process.env.FROM_EMAIL;
  const a = process.env.CONTACT_EMAIL;
  if (!apiKey || !de || !a) {
    console.warn(
      JSON.stringify({ ts: new Date().toISOString(), evenement: "alerte.non_envoyee", type: regle.type, motif: "configuration" }),
    );
    return;
  }
  const lignes = [
    "Alerte de sécurité — technolot.ca",
    "",
    `Type : ${regle.seuil} ${regle.libelle} en 5 minutes.`,
    `Événement : ${ligne.evenement}`,
    `Fenêtre : 5 minutes, jusqu'à ${ligne.ts} (UTC)`,
    ...(regle.compteur === "meme_ip_5min" ? [`Adresse IP : ${ligne.ip}`] : []),
    "",
    `Que faire : voir le runbook « ${RUNBOOK} » (journal : table securite.journal, événement ${ligne.evenement}).`,
    "Ce courriel est envoyé au plus une fois par heure pour ce type d'alerte.",
  ];
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: `Techno Lot <${de}>`,
    to: [a],
    subject: `Alerte de sécurité : ${regle.libelle}`,
    text: lignes.join("\n"),
  });
  if (error) {
    console.warn(
      JSON.stringify({ ts: new Date().toISOString(), evenement: "alerte.non_envoyee", type: regle.type, motif: "resend" }),
    );
    return;
  }
  void journaliser(EVENEMENTS.alerteEnvoyee, { resultat: "ok", details: { type: regle.type } });
}

async function verifierAlertes(ligne: LigneJournal, compteurs: unknown): Promise<void> {
  for (const regle of alertesFranchies(ligne.evenement, compteurs)) {
    const r = TABLE_LIMITES.alerteCourrielHeure;
    const { permis } = await limiter(r.route, regle.type, r.fenetreSecondes, r.max);
    if (permis) await envoyerAlerte(regle, ligne);
  }
}

// --- Écriture durable -------------------------------------------------------------

async function ecrireDurable(ligne: LigneJournal): Promise<void> {
  const secret = secretRpc();
  const sb = clientRpc();
  if (!secret || !sb) return; // configuration absente : sortie standard seulement
  const { data, error } = await sb.rpc("journal_securite_ajouter", {
    p_secret: secret,
    p_evenement: ligne.evenement,
    p_resultat: ligne.resultat,
    p_user_id: ligne.user_id,
    p_ip: ligne.ip,
    p_ua: ligne.ua,
    p_request_id: ligne.request_id,
    p_methode: ligne.methode,
    p_chemin: ligne.chemin,
    p_statut: ligne.statut,
    p_details: ligne.details,
  });
  if (error) {
    console.warn(
      JSON.stringify({ ts: new Date().toISOString(), evenement: "journal.erreur", code: nettoyer(error.code, 10) }),
    );
    return;
  }
  await verifierAlertes(ligne, data);
}

/**
 * Journalise un événement de sécurité. Ne bloque pas et ne lève jamais
 * d'erreur : appeler sans `await` (`void journaliser(…)`). La promesse
 * renvoyée (toujours résolue) sert aux tests et aux tâches qui veulent attendre.
 *
 * Exemple (route) :
 *   void journaliser(EVENEMENTS.adminAction, {
 *     resultat: "ok", request, requestId: ctx.requestId, userId: ctx.user.id,
 *     details: { action: "lot.supprime", cible: id },
 *   });
 */
export function journaliser(evenement: EvenementSecurite, champs: ChampsJournal): Promise<void> {
  let ligne: LigneJournal;
  try {
    ligne = construireLigne(evenement, champs);
    console.log(JSON.stringify(ligne));
  } catch {
    return Promise.resolve();
  }
  if (champs.durable === false) return Promise.resolve();

  const tache = ecrireDurable(ligne).catch(() => {
    // Jamais d'erreur vers l'appelant : la ligne est déjà sur la sortie standard.
  });
  try {
    // Garde la requête vivante jusqu'à la fin de l'écriture (Vercel), après la réponse.
    after(tache);
  } catch {
    // Hors d'une requête Next (tests, scripts) : la promesse continue seule.
  }
  return tache;
}
