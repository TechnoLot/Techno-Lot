import type { ContactStage } from "@/lib/crm/types";

/*
 * Envoi en gros du CRM (/admin/crm/envoi-en-gros) : logique PURE, sans import
 * serveur (ni Resend, ni Supabase), donc importable par un composant
 * « use client ». Le navigateur s'en sert pour le résumé en direct ; le
 * serveur la rejoue sur le texte brut reçu (revalidation complète) avant la
 * vérification et avant chaque lot.
 *
 *  - analyse d'une liste collée ou d'un CSV exporté d'Excel : virgule,
 *    point-virgule ou tabulation, BOM UTF-8, guillemets, ligne « sep=; » ;
 *    en-tête facultatif reconnu par le nom des colonnes ;
 *  - normalisation et validation des courriels (même règle que `courriel`,
 *    lib/securite/schemas.ts), doublons retirés ;
 *  - découpage en lots de 100 (maximum de l'envoi groupé de Resend) ;
 *  - rendu des variables (moteur du CRM, ré-exporté par lib/crm/email.ts),
 *    replis de l'envoi manuel et plan d'envoi (exclusions).
 */

/** Courriels par requête groupée de Resend (maximum de l'API). */
export const TAILLE_LOT = 100;
/** Destinataires au plus par envoi : au-delà, découper la liste. */
export const MAX_DESTINATAIRES = 500;
/** Lignes utiles (adresses candidates) au plus dans la liste. */
export const MAX_LIGNES_UTILES = 1_000;
/** Taille maximale du texte des destinataires, en caractères (environ 100 Ko). */
export const MAX_TEXTE_DESTINATAIRES = 100_000;
export const MAX_OBJET = 200;
export const MAX_CORPS = 10_000;
/**
 * `outreach_activities.outcome` d'un envoi en gros (activity_type
 * `manual_note`) : trace de l'envoi et base de la déduplication « déjà reçu
 * cet objet ». Jamais `intro_email_sent` ni `followup_sent`, que les relances
 * automatiques (app/api/admin/auto-relances) suivent.
 */
export const OUTCOME_ENVOI_EN_GROS = "envoi_en_gros";
/** Longueurs maximales des valeurs reprises de la liste (bornes des fiches du CRM). */
export const LONGUEURS_CHAMPS = { prenom: 100, nom: 100, compagnie: 200, titre: 160 } as const;

// --- Rendu des modèles ------------------------------------------------------------

export type VariablesModele = { prenom: string; nom: string; compagnie: string; titre: string };

/**
 * Remplace les variables {{prenom}}, {{nom}}, {{compagnie}}, {{titre}}
 * d'un modèle par les valeurs du contact. Insensible aux espaces
 * ({{ prenom }}) et aux accents manquants.
 */
export function renderTemplate(text: string, vars: VariablesModele): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    switch (key.toLowerCase()) {
      case "prenom":
      case "prénom":
        return vars.prenom;
      case "nom":
        return vars.nom;
      case "compagnie":
      case "entreprise":
        return vars.compagnie;
      case "titre":
        return vars.titre;
      default:
        return match;
    }
  });
}

// --- Courriels ----------------------------------------------------------------------

// Caractères invisibles (U+200B à U+200D, U+2060, BOM U+FEFF), insécable (U+00A0),
// séparateurs de ligne (U+2028, U+2029) et diacritiques combinants (U+0300 à
// U+036F) : construits par code de caractère, jamais écrits tels quels dans le
// source (U+2028 couperait une expression régulière littérale).
const BOM = String.fromCharCode(0xfeff);
const INVISIBLES = String.fromCharCode(0x200b, 0x200c, 0x200d, 0x2060, 0xfeff);
const INVISIBLES_BORDS = new RegExp(`^[${INVISIBLES}]+|[${INVISIBLES}]+$`, "g");
const ESPACE_INSECABLE = String.fromCharCode(0xa0);
const DIACRITIQUES = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

/** Courriel comparable : sans espaces ni caractères invisibles en bordure, en minuscules. */
export function normaliserCourriel(valeur: string): string {
  return valeur.trim().replace(INVISIBLES_BORDS, "").trim().toLowerCase();
}

/**
 * Même expression que `z.email()` de Zod 4 (`courriel`, lib/securite/schemas.ts) :
 * le navigateur et le serveur classent chaque adresse de la même façon, et
 * Resend ne reçoit que des adresses valides (une seule adresse refusée fait
 * échouer tout le lot). Accord vérifié par tests/crm/envoi-en-gros-liste.test.ts.
 */
const COURRIEL_RE =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

export function courrielValide(email: string): boolean {
  return email.length > 0 && email.length <= 254 && COURRIEL_RE.test(email);
}

/** Adresse d'une cellule : « Nom <adresse> » (Outlook) et « mailto: » acceptés. */
function adresseDeCellule(cellule: string): string {
  let valeur = cellule.trim();
  const chevrons = /<([^<>]*)>/.exec(valeur);
  if (chevrons && chevrons[1].includes("@")) valeur = chevrons[1];
  return normaliserCourriel(valeur.replace(/^\s*mailto:/i, ""));
}

// Caractères de contrôle (sauts de ligne et tabulations compris) et séparateurs
// de ligne Unicode : jamais dans une valeur reprise (elle peut aller dans l'objet).
const CONTROLES = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f, 0x2028, 0x2029)}]+`,
  "g",
);

/** Valeur d'une ligne de texte : contrôles retirés, espaces réduits, `max` caractères ; vide → null. */
function nettoyerValeur(valeur: string | undefined, max: number): string | null {
  if (!valeur) return null;
  const propre = valeur.replace(CONTROLES, " ").replace(/\s+/g, " ").trim().slice(0, max).trim();
  return propre || null;
}

// --- Analyse de la liste ----------------------------------------------------------------

export type ChampListe = "email" | "prenom" | "nom" | "compagnie" | "titre";
export type Separateur = "," | ";" | "\t";

export type Destinataire = {
  /** Courriel normalisé (minuscules). */
  email: string;
  /** Ligne d'origine dans le texte (1 = première ligne). */
  ligne: number;
  prenom: string | null;
  nom: string | null;
  compagnie: string | null;
  titre: string | null;
};

export type LigneInvalide = { ligne: number; valeur: string };
export type Doublon = { ligne: number; email: string; premiereLigne: number };
export type ProblemeListe = "vide" | "trop_long" | "trop_de_lignes" | "trop_de_destinataires" | "aucun_valide";

export type AnalyseListe = {
  /** Adresses valides, sans doublon, dans l'ordre de la liste. */
  destinataires: Destinataire[];
  invalides: LigneInvalide[];
  /** Doublons retirés (même courriel, casse ignorée). */
  doublons: Doublon[];
  /** Adresses candidates lues (lignes de données non vides). */
  lignesUtiles: number;
  separateur: Separateur | null;
  /** Colonnes repérées par l'en-tête (index à partir de 0), ou null sans en-tête. */
  colonnes: Partial<Record<ChampListe, number>> | null;
  /** Problèmes bloquants (aucun envoi possible tant qu'il en reste). */
  problemes: ProblemeListe[];
};

/** Noms de colonnes reconnus (sans accents, minuscules), par ordre de priorité. */
const ALIAS: Record<ChampListe, readonly string[]> = {
  email: [
    "courriel",
    "adresse courriel",
    "courriel professionnel",
    "email",
    "e mail",
    "adresse email",
    "adresse e mail",
    "email address",
    "e mail address",
    "adresse de messagerie",
    "adresse electronique",
    "mail",
  ],
  prenom: ["prenom", "first name", "firstname", "given name"],
  nom: ["nom", "nom de famille", "last name", "lastname", "surname", "family name"],
  compagnie: [
    "compagnie",
    "entreprise",
    "societe",
    "company",
    "company name",
    "nom de l entreprise",
    "nom de la compagnie",
    "organisation",
    "organization",
    "employeur",
  ],
  // « Fonction » d'abord : dans un export Outlook, « Titre » est la civilité (M., Mme).
  titre: ["titre du poste", "job title", "fonction", "poste", "titre", "title"],
};

/** Repli du courriel : « Courriel 1 », « E-mail (bureau) »… */
const PREFIXES_COURRIEL = ["courriel", "email", "e mail"];

function normaliserEntete(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(DIACRITIQUES, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Colonnes d'une ligne d'en-tête, ou null si ce n'est pas un en-tête. */
function colonnesDeLEnTete(cellules: readonly string[]): Partial<Record<ChampListe, number>> | null {
  if (cellules.some((c) => c.includes("@"))) return null;
  const noms = cellules.map(normaliserEntete);
  const colonnes: Partial<Record<ChampListe, number>> = {};
  const prises = new Set<number>();
  for (const champ of Object.keys(ALIAS) as ChampListe[]) {
    for (const alias of ALIAS[champ]) {
      const i = noms.findIndex((n, j) => n === alias && !prises.has(j));
      if (i >= 0) {
        colonnes[champ] = i;
        prises.add(i);
        break;
      }
    }
  }
  if (colonnes.email === undefined) {
    const i = noms.findIndex(
      (n, j) => !prises.has(j) && PREFIXES_COURRIEL.some((p) => n === p || n.startsWith(`${p} `)),
    );
    if (i >= 0) colonnes.email = i;
  }
  return Object.keys(colonnes).length > 0 ? colonnes : null;
}

function compterHorsGuillemets(ligne: string, separateur: string): number {
  let n = 0;
  let dedans = false;
  for (const c of ligne) {
    if (c === '"') dedans = !dedans;
    else if (c === separateur && !dedans) n++;
  }
  return n;
}

/** Séparateur le plus régulier sur les premières lignes (à égalité : tabulation, puis point-virgule). */
function detecterSeparateur(texte: string): Separateur | null {
  const lignes = texte
    .split("\n")
    .filter((l) => l.trim() !== "")
    .slice(0, 50);
  let meilleur: Separateur | null = null;
  let meilleurScore = 0;
  for (const s of ["\t", ";", ","] as const) {
    let lignesAvec = 0;
    let total = 0;
    for (const l of lignes) {
      const n = compterHorsGuillemets(l, s);
      if (n > 0) {
        lignesAvec++;
        total += n;
      }
    }
    const score = lignesAvec * 100_000 + total;
    if (score > meilleurScore) {
      meilleur = s;
      meilleurScore = score;
    }
  }
  return meilleur;
}

type Enregistrement = { cellules: string[]; ligne: number };

/**
 * Enregistrements CSV (RFC 4180 : champ entre guillemets, "" pour un guillemet,
 * saut de ligne permis entre guillemets) ; lignes vides ignorées, numéro de la
 * ligne où commence chaque enregistrement. `guillemetOuvert` : un guillemet
 * n'a jamais été refermé (l'appelant relit alors sans guillemets).
 */
function lireEnregistrements(
  texte: string,
  separateur: Separateur | null,
  guillemets: boolean,
): { enregistrements: Enregistrement[]; guillemetOuvert: boolean } {
  const enregistrements: Enregistrement[] = [];
  let cellules: string[] = [];
  let cellule = "";
  let dedans = false;
  let ligne = 1;
  let debut = 1;

  const terminer = () => {
    cellules.push(cellule);
    if (cellules.some((c) => c.trim() !== "")) {
      enregistrements.push({ cellules: cellules.map((c) => c.trim()), ligne: debut });
    }
    cellules = [];
    cellule = "";
  };

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (dedans) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          cellule += '"';
          i++;
        } else {
          dedans = false;
        }
      } else {
        if (c === "\n") ligne++;
        cellule += c;
      }
    } else if (guillemets && c === '"' && cellule.trim() === "") {
      dedans = true;
      cellule = "";
    } else if (separateur !== null && c === separateur) {
      cellules.push(cellule);
      cellule = "";
    } else if (c === "\n") {
      terminer();
      ligne++;
      debut = ligne;
    } else {
      cellule += c;
    }
  }
  terminer();
  return { enregistrements, guillemetOuvert: dedans };
}

/** Colonne qui contient le plus de « @ » (à égalité : la première), ou null. */
function colonneAvecArobase(enregistrements: readonly Enregistrement[]): number | null {
  const comptes: number[] = [];
  for (const e of enregistrements) {
    e.cellules.forEach((c, i) => {
      if (c.includes("@")) comptes[i] = (comptes[i] ?? 0) + 1;
    });
  }
  let meilleure: number | null = null;
  let maximum = 0;
  for (let i = 0; i < comptes.length; i++) {
    const n = comptes[i] ?? 0;
    if (n > maximum) {
      meilleure = i;
      maximum = n;
    }
  }
  return meilleure;
}

/** Adresses d'une cellule d'une liste simple : « Nom <adresse> », ou mots séparés par espace, virgule ou point-virgule. */
function adressesDeListeSimple(cellule: string): string[] {
  if (!cellule) return [];
  const chevrons = [...cellule.matchAll(/<([^<>]*)>/g)].map((m) => m[1]).filter((v) => v.includes("@"));
  if (chevrons.length > 0) return chevrons;
  return cellule.split(/[\s,;]+/).filter(Boolean);
}

type Candidat = { valeur: string; ligne: number; cellules: string[] | null };

/**
 * Analyse le texte des destinataires (zone de texte ou CSV importé).
 *
 *  - En-tête reconnu (courriel/email, prénom, nom, compagnie/entreprise,
 *    titre…) : colonnes repérées par leur nom ; sans colonne de courriel
 *    nommée, celle qui contient des @.
 *  - Sans en-tête : si chaque cellule contient un @, c'est une liste simple
 *    (une ou plusieurs adresses par ligne, « Nom <adresse> » d'Outlook) ;
 *    sinon la colonne qui contient des @ (prénom, nom… ignorés).
 */
export function analyserListe(texteBrut: string): AnalyseListe {
  const problemes: ProblemeListe[] = [];
  if (texteBrut.length > MAX_TEXTE_DESTINATAIRES) problemes.push("trop_long");

  // Au-delà de la limite, l'analyse reste bornée (le serveur refuse de toute façon).
  let texte = texteBrut
    .slice(0, MAX_TEXTE_DESTINATAIRES)
    .replace(new RegExp(`^${BOM}`), "")
    .replace(/\r\n?/g, "\n");

  // Ligne « sep=; » d'Excel : séparateur imposé ; la ligne est vidée (numéros conservés).
  let separateur: Separateur | null = null;
  const indication = /^[ \t]*"?sep=([,;\t])"?[ \t]*(?=\n|$)/i.exec(texte);
  if (indication) {
    separateur = indication[1] as Separateur;
    texte = texte.slice(indication[0].length);
  } else {
    separateur = detecterSeparateur(texte);
  }

  let lecture = lireEnregistrements(texte, separateur, true);
  if (lecture.guillemetOuvert) lecture = lireEnregistrements(texte, separateur, false);
  const enregistrements = lecture.enregistrements;

  const colonnes = enregistrements.length > 0 ? colonnesDeLEnTete(enregistrements[0].cellules) : null;
  const donnees = colonnes ? enregistrements.slice(1) : enregistrements;

  let candidats: Candidat[];
  if (colonnes) {
    const colEmail = colonnes.email ?? colonneAvecArobase(donnees);
    candidats = donnees.map((e) => ({
      valeur: colEmail === null ? "" : (e.cellules[colEmail] ?? ""),
      ligne: e.ligne,
      cellules: e.cellules,
    }));
  } else if (donnees.every((e) => e.cellules.every((c) => c === "" || c.includes("@")))) {
    candidats = donnees.flatMap((e) =>
      e.cellules.flatMap(adressesDeListeSimple).map((valeur) => ({ valeur, ligne: e.ligne, cellules: null })),
    );
  } else {
    const colEmail = colonneAvecArobase(donnees);
    candidats = donnees.map((e) => ({
      valeur: colEmail === null ? (e.cellules.find((c) => c !== "") ?? "") : (e.cellules[colEmail] ?? ""),
      ligne: e.ligne,
      cellules: null,
    }));
  }

  const destinataires: Destinataire[] = [];
  const invalides: LigneInvalide[] = [];
  const doublons: Doublon[] = [];
  const vus = new Map<string, number>();

  const champ = (c: Candidat, nom: Exclude<ChampListe, "email">): string | null => {
    const i = colonnes?.[nom];
    return i === undefined || !c.cellules ? null : nettoyerValeur(c.cellules[i], LONGUEURS_CHAMPS[nom]);
  };

  for (const c of candidats) {
    const email = adresseDeCellule(c.valeur);
    if (!courrielValide(email)) {
      invalides.push({ ligne: c.ligne, valeur: nettoyerValeur(c.valeur, 80) ?? "(vide)" });
      continue;
    }
    const premiereLigne = vus.get(email);
    if (premiereLigne !== undefined) {
      doublons.push({ ligne: c.ligne, email, premiereLigne });
      continue;
    }
    vus.set(email, c.ligne);
    destinataires.push({
      email,
      ligne: c.ligne,
      prenom: champ(c, "prenom"),
      nom: champ(c, "nom"),
      compagnie: champ(c, "compagnie"),
      titre: champ(c, "titre"),
    });
  }

  if (candidats.length === 0) problemes.push("vide");
  else if (destinataires.length === 0) problemes.push("aucun_valide");
  if (candidats.length > MAX_LIGNES_UTILES) problemes.push("trop_de_lignes");
  if (destinataires.length > MAX_DESTINATAIRES) problemes.push("trop_de_destinataires");

  return {
    destinataires,
    invalides,
    doublons,
    lignesUtiles: candidats.length,
    separateur,
    colonnes,
    problemes,
  };
}

/**
 * Nombre en français (« 10 000 », espace insécable) : même texte sur le
 * serveur et dans le navigateur (toLocaleString varie selon la version d'ICU).
 */
export function formaterNombre(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_INSECABLE);
}

const nombre = formaterNombre;

/** Message français d'un problème de liste. */
export function messageProbleme(probleme: ProblemeListe, analyse: AnalyseListe): string {
  switch (probleme) {
    case "vide":
      return "Colle une liste d'adresses ou importe un CSV.";
    case "aucun_valide":
      return "Aucune adresse valide dans la liste.";
    case "trop_long":
      return `La liste dépasse ${nombre(MAX_TEXTE_DESTINATAIRES)} caractères : découpe-la en plusieurs envois.`;
    case "trop_de_lignes":
      return `La liste compte ${nombre(analyse.lignesUtiles)} lignes utiles (${nombre(MAX_LIGNES_UTILES)} au plus) : découpe-la en plusieurs envois.`;
    case "trop_de_destinataires":
      return `La liste compte ${nombre(analyse.destinataires.length)} adresses valides : ${MAX_DESTINATAIRES} au plus par envoi. Découpe-la en plusieurs listes et envoie-les l'une après l'autre.`;
  }
}

/** Premier problème bloquant (message français), ou null si la liste peut être vérifiée. */
export function problemeBloquant(analyse: AnalyseListe): string | null {
  const [premier] = analyse.problemes;
  return premier ? messageProbleme(premier, analyse) : null;
}

// --- Lots -------------------------------------------------------------------------------

/** Découpe en lots de `taille` (100 par défaut, maximum de Resend), dans l'ordre. */
export function decouperEnLots<T>(elements: readonly T[], taille: number = TAILLE_LOT): T[][] {
  if (!Number.isInteger(taille) || taille < 1) throw new RangeError("Taille de lot invalide.");
  const lots: T[][] = [];
  for (let i = 0; i < elements.length; i += taille) lots.push(elements.slice(i, i + taille));
  return lots;
}

/** Nombre de lots pour `n` destinataires. */
export function nombreDeLots(n: number, taille: number = TAILLE_LOT): number {
  return n > 0 ? Math.ceil(n / taille) : 0;
}

// --- Plan d'envoi ---------------------------------------------------------------------------

/** Fiche du CRM qui porte déjà l'adresse (comparaison en minuscules). */
export type ContactConnu = {
  id: string;
  /** Courriel normalisé. */
  email: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  stage: ContactStage;
  company_id: string | null;
  unsubscribed_at: string | null;
  /** Nom de la compagnie liée, s'il y en a une. */
  compagnie: string | null;
};

/**
 * Variables du modèle pour un destinataire : la valeur de la liste, sinon celle
 * de sa fiche du CRM, sinon le repli de l'envoi manuel (prénom → « bonjour »,
 * compagnie → « votre entreprise », nom et titre → vide).
 */
export function variablesDestinataire(d: Destinataire, contact: ContactConnu | null): VariablesModele {
  return {
    prenom: d.prenom ?? (contact?.first_name?.trim() || "bonjour"),
    nom: d.nom ?? (contact?.last_name?.trim() || ""),
    compagnie: d.compagnie ?? (contact?.compagnie?.trim() || "votre entreprise"),
    titre: d.titre ?? (contact?.title?.trim() || ""),
  };
}

/** Objet comparable (déduplication « déjà reçu cet objet ») : espaces réduits, minuscules. */
export function normaliserObjet(objet: string): string {
  return objet.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Clé d'une compagnie : nom sans tenir compte de la casse ni des espaces en trop. */
export function cleCompagnie(nom: string): string {
  return nom.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Objet rendu sur une seule ligne (une variable n'y glisse jamais de saut de ligne). */
function objetSurUneLigne(objet: string): string {
  return objet.replace(CONTROLES, " ").replace(/\s+/g, " ").trim() || "Techno Lot";
}

export type CourrielPrevu = {
  destinataire: Destinataire;
  /** Fiche existante, ou null : elle sera créée au moment de l'envoi. */
  contact: ContactConnu | null;
  /** Objet et corps rendus pour ce destinataire. */
  objet: string;
  corps: string;
};

export type PlanEnvoi = {
  prets: CourrielPrevu[];
  /** Désabonnés (LCAP), même si la demande a été notée sur une autre fiche. */
  desabonnes: Destinataire[];
  /** Ont déjà reçu cet objet par l'envoi en gros. */
  dejaRecus: Destinataire[];
};

/**
 * Plan d'envoi (serveur) : retire les adresses désabonnées et celles qui ont
 * déjà reçu cet objet (rendu pour elles) par l'envoi en gros, puis rend
 * l'objet et le corps de chaque courriel. L'ordre de la liste est conservé.
 */
export function planifierEnvoi(p: {
  destinataires: readonly Destinataire[];
  /** Fiches du CRM par courriel normalisé. */
  contacts: ReadonlyMap<string, ContactConnu>;
  /** Courriels normalisés des contacts désabonnés. */
  desabonnes: ReadonlySet<string>;
  /** Objets normalisés déjà reçus par l'envoi en gros, par courriel normalisé. */
  objetsRecus: ReadonlyMap<string, ReadonlySet<string>>;
  objet: string;
  corps: string;
}): PlanEnvoi {
  const plan: PlanEnvoi = { prets: [], desabonnes: [], dejaRecus: [] };
  for (const d of p.destinataires) {
    const contact = p.contacts.get(d.email) ?? null;
    if (p.desabonnes.has(d.email) || contact?.unsubscribed_at) {
      plan.desabonnes.push(d);
      continue;
    }
    const vars = variablesDestinataire(d, contact);
    const objet = objetSurUneLigne(renderTemplate(p.objet, vars));
    if (p.objetsRecus.get(d.email)?.has(normaliserObjet(objet))) {
      plan.dejaRecus.push(d);
      continue;
    }
    plan.prets.push({ destinataire: d, contact, objet, corps: renderTemplate(p.corps, vars) });
  }
  return plan;
}
