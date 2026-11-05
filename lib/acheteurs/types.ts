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
  /** Vrai seulement si Claude a vu des ventes conclues ; sinon, des prix demandés (absent : recherche plus ancienne). */
  vendu?: boolean;
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

/*
 * Lecture des pièces jointes d'une soumission : une passe à part, sans aucun
 * outil, qui propose une liste d'articles (table lectures_soumissions).
 */

export const STATUTS_LECTURE = ["en_attente", "en_cours", "lue", "echec"] as const;
export type StatutLecture = (typeof STATUTS_LECTURE)[number];

/** confirme : une photo montre le modèle ; non_vu : écrit, aucune photo ; doute : l'admin doit trancher. */
export const VERIFICATIONS = ["confirme", "non_vu", "doute"] as const;
export type Verification = (typeof VERIFICATIONS)[number];

export type EtatArticle = "neuf" | "usage";

/** Article proposé par la lecture des pièces jointes. */
export type ArticleLu = Article & {
  etat: EtatArticle | null;
  verification: Verification;
  remarque: string | null;
  photos: number[];
};

export type RolePiece = "tableur" | "pdf" | "photo" | "aucun";

/** Une pièce jointe du courriel d'une soumission, telle que la lecture l'a classée. */
export type PieceLue = {
  nom: string;
  pieceId: string;
  type: string;
  role: RolePiece;
  /** Numéro de photo donné à Claude (1, 2…) ; null pour le reste. */
  numero: number | null;
  lu: boolean;
  /** Pourquoi elle n'a pas été lue (affiché à l'admin). */
  raison: string | null;
};

/** Lecture d'une soumission, telle que la lisent les écrans (table lectures_soumissions). */
export type LectureSoumission = {
  id: string;
  soumission_id: string;
  statut: StatutLecture;
  articles: ArticleLu[];
  articles_ignores: number;
  pieces: PieceLue[];
  erreur: string | null;
  demande_le: string;
  pris_le: string | null;
  lue_le: string | null;
};

/** Lectures prises au plus par 24 h : protège le forfait contre un robot du formulaire. */
export const LECTURES_PAR_JOUR = 20;
/** Montré sur une lecture en attente quand le plafond est atteint. */
export const MESSAGE_PLAFOND_LECTURE = `Plafond de ${LECTURES_PAR_JOUR} lectures par 24 h atteint (il protège votre forfait Claude) : celle-ci partira plus tard, toute seule.`;
/** Lecture automatique des soumissions reçues depuis cette date (et depuis 30 jours au plus). */
export const LECTURE_DEPUIS = "2026-11-04T00:00:00Z";
export const LECTURE_FENETRE_JOURS = 30;
/** Laisse au courriel de la soumission le temps d'arriver dans la boîte. */
export const LECTURE_DELAI_COURRIEL_MS = 2 * 60_000;

/** Message affiché à l'admin pour chaque raison d'échec d'une lecture. */
export const MESSAGES_ECHEC_LECTURE: Record<EchecAgent, string> = {
  delai: "Claude n'a pas fini de lire à temps. Relisez les pièces jointes.",
  tours: "Claude n'a pas fini de lire. Relisez les pièces jointes.",
  connexion:
    "Claude n'est pas prêt sur votre ordinateur (connexion ou installation) : refaites la connexion (guide de l'agent), puis relisez.",
  limite: "Limite de votre forfait Claude atteinte pour l'instant. Relisez plus tard.",
  autre: "La lecture n'a pas abouti. Relisez les pièces jointes.",
};

export const LIMITES_LECTURE = {
  /** Feuilles lues par classeur. */
  feuilles: 6,
  /** Rangées lues par feuille. */
  rangees: 5_000,
  colonnes: 40,
  /** Caractères par cellule. */
  cellule: 120,
  /** Texte de tableur envoyé à Claude (tous fichiers confondus). */
  texteTableur: 40_000,
  /** XML décompressé d'une feuille ou des chaînes partagées. */
  xmlFeuille: 30 * 1024 * 1024,
  xmlTotal: 60 * 1024 * 1024,
  /** Entrées lues dans l'archive. */
  entrees: 2_000,
  photos: 10,
  documents: 5,
  /** Article lu. */
  description: 160,
  remarque: 240,
} as const;

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
