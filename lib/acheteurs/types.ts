/*
 * Agent « Acheteurs » : types et constantes partagés (serveur et navigateur).
 *
 * Sur une soumission, « Trouver des acheteurs » met la demande en file
 * (table recherches_acheteurs). L'agent de l'ordinateur de l'utilisateur
 * (scripts/agent-acheteurs, gratuit : son forfait Claude Max) la prend, fait
 * chercher Claude sur le Web et renvoie la réponse ; le site la lit
 * (lib/acheteurs/reponse.ts), range les compagnies dans le carnet (table
 * acheteurs) et envoie l'offre par le chemin de l'Envoi en gros. Le site
 * n'appelle jamais d'IA.
 */

export const STATUTS_RECHERCHE = ["en_attente", "en_cours", "resultats", "echec"] as const;
export type StatutRecherche = (typeof STATUTS_RECHERCHE)[number];

/** Une recherche « en cours » depuis plus longtemps est reprise (ordinateur éteint en pleine recherche). */
export const DELAI_REPRISE_MS = 30 * 60_000;
/** Recherches prises au plus par 24 h : protège le forfait Claude Max de l'utilisateur. */
export const RECHERCHES_PAR_JOUR = 15;
/** Montré sur une recherche en attente quand le plafond est atteint. */
export const MESSAGE_PLAFOND = `Plafond de ${RECHERCHES_PAR_JOUR} recherches par 24 h atteint (il protège votre forfait Claude) : celle-ci partira plus tard, toute seule.`;
/** Au-delà, l'écran prévient que l'ordinateur de l'agent semble éteint (il passe toutes les 5 min). */
export const ATTENTE_LONGUE_MS = 12 * 60_000;

/** Raisons d'échec que l'agent de l'ordinateur peut renvoyer (scripts/agent-acheteurs/agent.ps1). */
export const ECHECS_AGENT = ["delai", "tours", "connexion", "limite", "autre"] as const;
export type EchecAgent = (typeof ECHECS_AGENT)[number];

/** Message affiché à l'admin pour chaque raison d'échec (jamais de détail technique). */
export const MESSAGES_ECHEC: Record<EchecAgent, string> = {
  delai: "Claude n'a pas fini à temps (15 minutes). Relancez la recherche, ou retirez quelques articles.",
  tours: "La recherche était trop longue pour Claude. Retirez quelques articles, puis relancez.",
  connexion:
    "Claude n'est pas prêt sur votre ordinateur (connexion ou installation) : refaites la connexion (guide de l'agent), puis relancez.",
  limite: "Limite de votre forfait Claude atteinte pour l'instant. Relancez la recherche plus tard.",
  autre: "La recherche n'a pas abouti. Relancez-la.",
};

/** achete_surplus : une page dit qu'elle rachète ; a_sonder : elle vend l'article, sans plus. */
export const CONFIANCES = ["achete_surplus", "a_sonder"] as const;
export type Confiance = (typeof CONFIANCES)[number];

export const LIBELLES_CONFIANCE: Record<Confiance, string> = {
  achete_surplus: "Achète du surplus",
  a_sonder: "À sonder",
};

/** Une ligne d'article d'une soumission (quantité inconnue = null). */
export type Article = { quantite: number | null; description: string };

export type Prix = {
  bas: number | null;
  haut: number | null;
  devise: string | null;
  /** D'où vient la fourchette (ventes eBay conclues, prix affichés…). */
  base: string | null;
  sources: string[];
};

export type LigneResultat = {
  article: string;
  quantite: number | null;
  etat: string | null;
  prix: Prix;
};

/** Ce que Claude dit d'une compagnie pour une famille d'articles ; le contact est dans le carnet. */
export type AcheteurFamille = {
  domaine: string;
  raison: string | null;
  preuve: string;
  confiance: Confiance;
};

export type FamilleResultat = {
  nom: string;
  rare: boolean;
  lignes: LigneResultat[];
  acheteurs: AcheteurFamille[];
};

export type Courriel = { objet: string; message: string };
export type Langue = "fr" | "en";
export type CourrielsResultat = Record<Langue, Courriel | null>;

export type ResultatRecherche = { familles: FamilleResultat[]; courriels: CourrielsResultat };

/** Compagnie lue dans la réponse, prête pour le carnet (une par domaine). */
export type AcheteurLu = {
  nom: string;
  domaine: string;
  site: string | null;
  ville: string | null;
  region: string | null;
  /** Code ISO à deux lettres (CA, US…). */
  pays: string | null;
  courriel: string | null;
  telephone: string | null;
  formulaire: string | null;
  sources: string[];
  confiance: Confiance;
  categories: string[];
  modeles: string[];
  notes: string | null;
};

/** Fiche du carnet (table acheteurs). */
export type AcheteurCarnet = AcheteurLu & { id: string; verifie: boolean; created_at: string };

/** Partie de la réponse refusée, avec sa raison (affichée à l'admin). */
export type Refus = { ou: string; raison: string };

/** Recherche d'une soumission, telle que la lisent les écrans (table recherches_acheteurs). */
export type RechercheAcheteurs = {
  id: string;
  soumission_id: string;
  statut: StatutRecherche;
  articles: Article[];
  /** Compagnies exclues de la demande (« Chercher d'autres acheteurs »). */
  exclus: number;
  /** Derniers résultats lus (gardés pendant une nouvelle recherche). */
  resultats: ResultatRecherche | null;
  lignes_refusees: number;
  erreur: string | null;
  demande_le: string;
  pris_le: string | null;
  resultats_le: string | null;
};

/**
 * Offre habituelle d'un acheteur en gros, en part de la valeur marchande
 * (page « We buy surplus » d'Industrial Automation Co., essai du 2026-11-03).
 */
export const PART_OFFRE_EN_GROS = { min: 0.4, max: 0.6 } as const;

export const LIMITES = {
  /** Lignes d'articles par recherche. */
  articles: 60,
  /** Caractères par ligne d'article. */
  ligne: 300,
  /** Texte des articles saisi par l'admin. */
  texteArticles: 20_000,
  /** Réponse de Claude renvoyée par l'agent de l'ordinateur. */
  reponse: 200_000,
  familles: 20,
  lignesParFamille: 60,
  acheteursParFamille: 15,
  /** Compagnies déjà trouvées listées dans une nouvelle demande. */
  domainesExclus: 40,
} as const;

/** Langue du courriel d'un acheteur : français au Québec, anglais ailleurs. */
export function langueAcheteur(a: Pick<AcheteurLu, "pays" | "region">): Langue {
  if (a.pays !== "CA") return "en";
  return /qu[ée]bec|^qc$/i.test((a.region ?? "").trim()) ? "fr" : "en";
}
