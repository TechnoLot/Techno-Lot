import "server-only";
import { inflateRawSync } from "node:zlib";
import { LIMITES_LECTURE } from "@/lib/acheteurs/types";
import { repertoireZip, type EntreeZip } from "@/lib/securite/fichiers";

/*
 * Tableurs d'une soumission, réduits à une grille de texte pour Claude. Aucune
 * règle fixe ne comprend un vrai tableau croisé : on garde seulement les
 * cellules, leur position et les fusions, et c'est Claude qui lit.
 *
 * Le fichier vient du formulaire public : tout est borné (LIMITES_LECTURE,
 * `maxOutputLength` à chaque décompression) et le XML est parcouru par
 * `indexOf` : un motif `<row…>…</row>` ferait des millions de reprises sur un
 * fichier piégé sans balise de fin. Seules les cellules sont lues, jamais les
 * métadonnées (`docProps`, `absPath`).
 */

export type Cellule = { colonne: string; valeur: string };
export type Rangee = { numero: number; cellules: Cellule[] };
export type Feuille = {
  nom: string;
  fusions: string[];
  rangees: Rangee[];
  /** Une limite a arrêté la lecture : la liste de cette feuille ou du classeur est incomplète. */
  coupee?: boolean;
};

/** Nom de la seule feuille d'un CSV (jamais le nom du fichier). */
const NOM_FEUILLE_CSV = "Données";
const FUSIONS_MAX = 200;
const NOM_FEUILLE_MAX = 80;
const ENTETE_RANGEES = 20;
const ENTETE_CELLULES = 3;
const NOTE_TRONQUE = "(fichier tronqué)";

// --- Texte ---------------------------------------------------------------------------

const ENTITES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Une seule passe : « &amp;lt; » reste « &lt; ». */
function decoderEntites(texte: string): string {
  return texte
    .replace(/&(?:(amp|lt|gt|quot|apos)|#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6}));/g, (brut, nom, dec, hex) => {
      if (nom) return ENTITES[nom];
      const code = dec ? Number(dec) : parseInt(hex, 16);
      return code <= 0x10ffff ? String.fromCodePoint(code) : brut;
    })
    .replace(/_x([0-9a-fA-F]{4})_/g, (_brut, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** Valeur d'une cellule : caractères invisibles retirés, espaces réduits, longueur bornée. */
function nettoyer(texte: string): string {
  return texte
    .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITES_LECTURE.cellule)
    .trim();
}

/** 1 → A, 27 → AA. */
function lettreColonne(index: number): string {
  let lettres = "";
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) {
    lettres = String.fromCharCode(65 + ((n - 1) % 26)) + lettres;
  }
  return lettres;
}

/** A → 1, AA → 27. */
function indexColonne(lettres: string): number {
  let n = 0;
  for (const c of lettres.toUpperCase()) n = n * 26 + c.charCodeAt(0) - 64;
  return n;
}

// --- XML ------------------------------------------------------------------------------

type Balise = { attributs: string; contenu: string; debut: number; fin: number };

function estFinDeNom(c: string | undefined): boolean {
  return c === ">" || c === "/" || c === " " || c === "\t" || c === "\n" || c === "\r";
}

/**
 * Balises `nom` d'un XML, auto-fermées ou non. `<row r="1"/>` n'avale pas la
 * rangée suivante, et `<c` ne prend pas `<col` ni `<cols`. Sans balise de fin,
 * le parcours s'arrête : il ne repart jamais du début.
 */
function* balises(xml: string, nom: string): Generator<Balise> {
  const ouvrante = `<${nom}`;
  const fermante = `</${nom}>`;
  let p = xml.indexOf(ouvrante);
  while (p >= 0) {
    if (!estFinDeNom(xml[p + ouvrante.length])) {
      p = xml.indexOf(ouvrante, p + 1);
      continue;
    }
    const finOuvrante = xml.indexOf(">", p);
    if (finOuvrante < 0) return;
    const attributs = xml.slice(p + ouvrante.length, finOuvrante);
    if (attributs.endsWith("/")) {
      yield { attributs: attributs.slice(0, -1), contenu: "", debut: p, fin: finOuvrante + 1 };
      p = xml.indexOf(ouvrante, finOuvrante + 1);
      continue;
    }
    const finContenu = xml.indexOf(fermante, finOuvrante + 1);
    if (finContenu < 0) return;
    const fin = finContenu + fermante.length;
    yield { attributs, contenu: xml.slice(finOuvrante + 1, finContenu), debut: p, fin };
    p = xml.indexOf(ouvrante, fin);
  }
}

function premiere(xml: string, nom: string): Balise | null {
  for (const b of balises(xml, nom)) return b;
  return null;
}

const MOTIFS_ATTRIBUT = new Map<string, RegExp>();

/** Attribut par son nom exact (`t` ne prend pas `ht`). */
function attribut(attributs: string, nom: string): string | null {
  let motif = MOTIFS_ATTRIBUT.get(nom);
  if (!motif) {
    motif = new RegExp(`(?:^|\\s)${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);
    MOTIFS_ATTRIBUT.set(nom, motif);
  }
  const m = motif.exec(attributs);
  return m ? (m[1] ?? m[2]) : null;
}

/** `r:id`, quel que soit le préfixe choisi par le logiciel qui a écrit le fichier. */
function relationDe(attributs: string): string | null {
  const m = /(?:^|\s)[\w.-]+:id\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(attributs);
  return m ? (m[1] ?? m[2]) : null;
}

/** Certains logiciels écrivent `<x:row>` : le préfixe ne change rien au sens. */
function sansPrefixes(xml: string): string {
  return xml.replace(/<(\/?)[A-Za-z_][\w.-]*:/g, "<$1");
}

/** Texte d'un `<si>` ou d'un `<is>` : ses `<t>`, sauf ceux de la phonétique (`<rPh>`). */
function texteRiche(contenu: string): string {
  let lisible = "";
  let p = 0;
  for (const phonetique of balises(contenu, "rPh")) {
    lisible += contenu.slice(p, phonetique.debut);
    p = phonetique.fin;
  }
  lisible += contenu.slice(p);
  let texte = "";
  for (const t of balises(lisible, "t")) texte += decoderEntites(t.contenu);
  return texte;
}

// --- Archive --------------------------------------------------------------------------

function lireU16(o: Uint8Array, i: number): number {
  return o[i] | (o[i + 1] << 8);
}

function lireU32(o: Uint8Array, i: number): number {
  return (o[i] | (o[i + 1] << 8) | (o[i + 2] << 16) | (o[i + 3] << 24)) >>> 0;
}

/** Rend le XML d'une entrée ; null : absente, ou méthode de compression inconnue. */
type LireEntree = (nom: string) => string | null;

/** Lecteur d'une archive. Plafond dépassé ou entrée invalide : exception, reçue par `lireXlsx`. */
function ouvrirArchive(octets: Uint8Array, entrees: readonly EntreeZip[]): LireEntree {
  const parNom = new Map<string, EntreeZip>();
  for (const e of entrees) {
    const cle = e.nom.toLowerCase();
    if (!parNom.has(cle)) parNom.set(cle, e);
  }
  let lus = 0;

  return (nom) => {
    const e = parNom.get(nom.toLowerCase());
    if (!e) return null;
    if (e.decalage + 30 > octets.length || lireU32(octets, e.decalage) !== 0x04034b50) {
      throw new Error("En-tête local invalide.");
    }
    const debut = e.decalage + 30 + lireU16(octets, e.decalage + 26) + lireU16(octets, e.decalage + 28);
    const fin = debut + e.tailleCompressee;
    if (fin > octets.length) throw new Error("Entrée hors du fichier.");

    const max = Math.min(LIMITES_LECTURE.xmlFeuille, LIMITES_LECTURE.xmlTotal - lus);
    let brut: Uint8Array;
    if (e.methode === 8) {
      brut = inflateRawSync(octets.subarray(debut, fin), { maxOutputLength: max });
    } else if (e.methode === 0) {
      if (e.tailleCompressee > max) throw new Error("Entrée trop lourde.");
      brut = octets.subarray(debut, fin);
    } else {
      return null;
    }
    lus += brut.length;
    return sansPrefixes(new TextDecoder("utf-8").decode(brut));
  };
}

// --- Classeur .xlsx --------------------------------------------------------------------

type FeuilleDeclaree = { nom: string; cible: string };

/** `worksheets/a.xml` ou `/xl/worksheets/a.xml` → chemin dans l'archive. */
function cheminCible(cible: string): string {
  const parties: string[] = cible.startsWith("/") ? [] : ["xl"];
  for (const partie of cible.split("/")) {
    if (partie === "..") parties.pop();
    else if (partie && partie !== ".") parties.push(partie);
  }
  return parties.join("/");
}

/** Feuilles visibles, dans l'ordre du classeur. */
function feuillesDeclarees(lire: LireEntree): FeuilleDeclaree[] | null {
  const classeur = lire("xl/workbook.xml");
  const relations = lire("xl/_rels/workbook.xml.rels");
  if (!classeur || !relations) return null;

  const cibles = new Map<string, string>();
  for (const r of balises(relations, "Relationship")) {
    const id = attribut(r.attributs, "Id");
    const cible = attribut(r.attributs, "Target");
    if (id && cible) cibles.set(id, decoderEntites(cible));
  }

  const feuilles: FeuilleDeclaree[] = [];
  for (const s of balises(classeur, "sheet")) {
    const etat = attribut(s.attributs, "state");
    if (etat === "hidden" || etat === "veryHidden") continue;
    const relation = relationDe(s.attributs);
    const cible = relation ? cibles.get(relation) : undefined;
    if (!cible) continue;
    const nom = nettoyer(decoderEntites(attribut(s.attributs, "name") ?? "")).slice(0, NOM_FEUILLE_MAX);
    feuilles.push({ nom, cible: cheminCible(cible) });
  }
  return feuilles;
}

function chainesPartagees(lire: LireEntree): string[] {
  const xml = lire("xl/sharedStrings.xml");
  if (!xml) return [];
  const chaines: string[] = [];
  for (const si of balises(xml, "si")) chaines.push(texteRiche(si.contenu));
  return chaines;
}

function colonnesMasquees(xml: string): Set<number> {
  const masquees = new Set<number>();
  for (const col of balises(xml, "col")) {
    if (!estVrai(attribut(col.attributs, "hidden"))) continue;
    const debut = Math.max(1, Number(attribut(col.attributs, "min")) || 1);
    const fin = Math.min(LIMITES_LECTURE.colonnes, Number(attribut(col.attributs, "max")) || debut);
    for (let i = debut; i <= fin; i++) masquees.add(i);
  }
  return masquees;
}

function estVrai(v: string | null): boolean {
  return v === "1" || v === "true";
}

function valeurCellule(contenu: string, type: string | null, chaines: readonly string[]): string {
  if (type === "b" || type === "e") return "";
  if (type === "inlineStr") {
    const is = premiere(contenu, "is");
    return is ? texteRiche(is.contenu) : "";
  }
  const v = premiere(contenu, "v")?.contenu ?? "";
  if (type === "s") return v ? (chaines[Number(v)] ?? "") : "";
  return decoderEntites(v);
}

function rangeeDe(
  contenu: string,
  numero: number,
  masquees: ReadonlySet<number>,
  chaines: readonly string[],
): Rangee | null {
  const cellules: Cellule[] = [];
  let colonne = 0;
  for (const c of balises(contenu, "c")) {
    // Référence absente ou illisible : la position dans la rangée.
    const m = /^([A-Za-z]{1,3})\d{1,7}$/.exec(attribut(c.attributs, "r") ?? "");
    colonne = m ? indexColonne(m[1]) : colonne + 1;
    if (colonne > LIMITES_LECTURE.colonnes) break;
    if (masquees.has(colonne)) continue;
    const valeur = nettoyer(valeurCellule(c.contenu, attribut(c.attributs, "t"), chaines));
    if (valeur) cellules.push({ colonne: lettreColonne(colonne), valeur });
  }
  return cellules.length > 0 ? { numero, cellules } : null;
}

function fusionsDe(xml: string): string[] {
  const fusions: string[] = [];
  for (const m of balises(xml, "mergeCell")) {
    const ref = attribut(m.attributs, "ref");
    if (!ref || !/^[A-Za-z]{1,3}\d{1,7}(?::[A-Za-z]{1,3}\d{1,7})?$/.test(ref)) continue;
    fusions.push(ref);
    if (fusions.length >= FUSIONS_MAX) break;
  }
  return fusions;
}

function lireFeuille(nom: string, xml: string, chaines: readonly string[]): Feuille {
  const masquees = colonnesMasquees(xml);
  const rangees: Rangee[] = [];
  let coupee = false;
  let numero = 0;
  const donnees = premiere(xml, "sheetData");
  if (donnees) {
    for (const r of balises(donnees.contenu, "row")) {
      const annonce = Number(attribut(r.attributs, "r"));
      numero = Number.isInteger(annonce) && annonce > 0 ? annonce : numero + 1;
      if (estVrai(attribut(r.attributs, "hidden"))) continue;
      const rangee = rangeeDe(r.contenu, numero, masquees, chaines);
      if (!rangee) continue;
      if (rangees.length >= LIMITES_LECTURE.rangees) {
        coupee = true;
        break;
      }
      rangees.push(rangee);
    }
  }
  return { nom, fusions: fusionsDe(xml), rangees, ...(coupee && { coupee }) };
}

/** Feuilles visibles d'un classeur .xlsx ; null : illisible, malformé ou trop lourd. */
export function lireXlsx(octets: Uint8Array): Feuille[] | null {
  try {
    const entrees = repertoireZip(octets);
    if (!entrees || entrees.length > LIMITES_LECTURE.entrees) return null;
    const lire = ouvrirArchive(octets, entrees);
    const declarees = feuillesDeclarees(lire);
    if (!declarees) return null;
    const chaines = chainesPartagees(lire);
    const feuilles: Feuille[] = [];
    for (const { nom, cible } of declarees.slice(0, LIMITES_LECTURE.feuilles)) {
      const xml = lire(cible);
      if (xml) feuilles.push(lireFeuille(nom, xml, chaines));
    }
    const derniere = feuilles[feuilles.length - 1];
    if (derniere && declarees.length > LIMITES_LECTURE.feuilles) derniere.coupee = true;
    return feuilles;
  } catch {
    // Décompression refusée ou entrée invalide : fichier du public, jamais d'exception qui remonte.
    return null;
  }
}

// --- CSV --------------------------------------------------------------------------------

function decoderCsv(octets: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(octets);
  } catch {
    return new TextDecoder("windows-1252").decode(octets);
  }
}

const SEPARATEURS = ["\t", ";", ","] as const;
const LIGNES_ECHANTILLON = 30;

/** Le séparateur présent sur le plus de lignes, hors guillemets (égalité : « ; » passe avant « , »). */
function devinerSeparateur(texte: string): string {
  const presences = new Map<string, number>(SEPARATEURS.map((s) => [s, 0]));
  const vus = new Set<string>();
  let guillemets = false;
  let lignes = 0;
  const finir = () => {
    for (const s of vus) presences.set(s, (presences.get(s) ?? 0) + 1);
    vus.clear();
    lignes++;
  };
  for (let i = 0; i < texte.length && lignes < LIGNES_ECHANTILLON; i++) {
    const c = texte[i];
    if (c === '"') guillemets = !guillemets;
    else if (guillemets) continue;
    else if (c === "\n") finir();
    else if (presences.has(c)) vus.add(c);
  }
  finir();
  let choix = ",";
  let meilleur = 0;
  for (const s of SEPARATEURS) {
    const n = presences.get(s) ?? 0;
    if (n > meilleur) {
      choix = s;
      meilleur = n;
    }
  }
  return choix;
}

/**
 * Rangées d'un CSV : guillemets, guillemets doublés, sauts de ligne dans un
 * champ. Lit une rangée de plus que la limite : seule façon de savoir qu'il en
 * restait.
 */
function rangeesCsv(texte: string, separateur: string, decalage: number): { rangees: Rangee[]; coupee: boolean } {
  const plafond = LIMITES_LECTURE.rangees + 1;
  const rangees: Rangee[] = [];
  let champ = "";
  let cellules: Cellule[] = [];
  let colonne = 1;
  let numero = 1 + decalage;
  let guillemets = false;
  let debutChamp = true;

  // Plus que la cellule gardée : inutile de bâtir un champ de 10 Mo.
  const ajouter = (c: string) => {
    if (champ.length <= LIMITES_LECTURE.cellule * 4) champ += c;
  };
  const finirChamp = () => {
    const valeur = nettoyer(champ);
    if (valeur && colonne <= LIMITES_LECTURE.colonnes) cellules.push({ colonne: lettreColonne(colonne), valeur });
    champ = "";
    colonne++;
    debutChamp = true;
  };
  const finirRangee = () => {
    finirChamp();
    if (cellules.length > 0) rangees.push({ numero, cellules });
    cellules = [];
    colonne = 1;
    numero++;
  };

  for (let i = 0; i < texte.length && rangees.length < plafond; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c !== '"') ajouter(c);
      else if (texte[i + 1] === '"') {
        ajouter('"');
        i++;
      } else guillemets = false;
    } else if (c === '"' && debutChamp) {
      guillemets = true;
      debutChamp = false;
    } else if (c === separateur) {
      finirChamp();
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      finirRangee();
    } else {
      ajouter(c);
      debutChamp = false;
    }
  }
  if (rangees.length < plafond && (champ || cellules.length > 0)) finirRangee();
  const coupee = rangees.length > LIMITES_LECTURE.rangees;
  return { rangees: rangees.slice(0, LIMITES_LECTURE.rangees), coupee };
}

/** Fichier CSV (UTF-8, sinon Windows-1252, format d'Excel sous Windows) ; ligne « sep=; » reconnue. */
export function lireCsv(octets: Uint8Array): Feuille[] {
  let texte = decoderCsv(octets);
  let separateur: string | null = null;
  let decalage = 0;
  const sep = /^sep=([^\r\n])\r?\n/i.exec(texte);
  if (sep) {
    separateur = sep[1];
    texte = texte.slice(sep[0].length);
    decalage = 1;
  }
  const { rangees, coupee } = rangeesCsv(texte, separateur ?? devinerSeparateur(texte), decalage);
  if (rangees.length === 0) return [];
  return [{ nom: NOM_FEUILLE_CSV, fusions: [], rangees, ...(coupee && { coupee }) }];
}

// --- Grille de texte ---------------------------------------------------------------------

const NUMERO_PRIVE = "(?:numero|num|no|n[°º]?|#)\\.?";

/** Ces mots ne désignent jamais un produit : privés où qu'ils soient dans l'en-tête. */
const ENTETES_PRIVES = [
  "utilisateurs?",
  "usagers?",
  "users?",
  "username",
  "employes?",
  "employees?",
  "assignes?",
  "assigned",
  "proprietaires?",
  "owners?",
  "responsables?",
  "courriels?",
  "e-?mails?",
  "adresses?",
  "address(?:es)?",
  "serial",
  "s/n",
  "n/s",
  "imei",
  "hostnames?",
  "host name",
  "nom d hote",
  "nom de l ordinateur",
  "computer name",
  `${NUMERO_PRIVE} ?(?:de |d |du )?serie`,
  `${NUMERO_PRIVE} ?(?:de |d |du )?inventaire`,
  "code[- ]?barres?",
  "barcodes?",
];

const AUTOUR = (mots: string) => `(?:^|[^a-z0-9])(?:${mots})(?:$|[^a-z0-9])`;

/** Comparés à un en-tête en minuscules, sans accents, les apostrophes remplacées par des espaces. */
const ENTETE_PRIVE = new RegExp(AUTOUR(ENTETES_PRIVES.join("|")));
/** Privé seulement si c'est tout l'en-tête : « Asset Model », « Mac mini » et « IP Phone » restent. */
const ENTETE_PRIVE_SEUL = /^(?:sn|mac|ip|tags?|assets?|asset (?:tag|id|no|number|num|#))$/;
/** Privé seulement si les valeurs sont des numéros : une colonne « Téléphone » peut lister des iPhone. */
const ENTETE_TELEPHONE = new RegExp(AUTOUR("telephones?|phones?|cellulaires?|cell|tel"));

const VALEUR_QUANTITE = /^\d{1,5}$/;
const VALEUR_TELEPHONE = /^[\d\s().+-]{7,}$/;
const PART_QUANTITES = 0.8;
const PART_TELEPHONES = 0.5;

function enteteComparable(entete: string): string {
  return entete
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s:.]+$/, "");
}

/** Part des valeurs qui suivent le motif (0 sans valeur). */
function part(valeurs: readonly string[], motif: RegExp): number {
  if (valeurs.length === 0) return 0;
  return valeurs.filter((v) => motif.test(v)).length / valeurs.length;
}

/**
 * Vrai si la colonne contient une donnée privée. L'en-tête décide d'abord, puis
 * les valeurs : une colonne de quantités reste, quel que soit son en-tête
 * (« Téléphones : 2 », « Employés : 12 »). « Usagé » n'est pas « usager ».
 * `lireValeurs` n'est appelée que pour un en-tête suspect.
 */
function colonnePrivee(entete: string, lireValeurs: () => string[]): boolean {
  const propre = enteteComparable(entete);
  const privee = ENTETE_PRIVE.test(propre) || ENTETE_PRIVE_SEUL.test(propre);
  if (!privee && !ENTETE_TELEPHONE.test(propre)) return false;
  const valeurs = lireValeurs();
  if (part(valeurs, VALEUR_QUANTITE) >= PART_QUANTITES) return false;
  return privee || part(valeurs, VALEUR_TELEPHONE) >= PART_TELEPHONES;
}

/** Position de la rangée d'en-tête : la première des 20 avec au moins 3 cellules de texte ; -1 sinon. */
function positionEntete(rangees: readonly Rangee[]): number {
  return rangees
    .slice(0, ENTETE_RANGEES)
    .findIndex((r) => r.cellules.filter((c) => /\p{L}/u.test(c.valeur)).length >= ENTETE_CELLULES);
}

/** Valeurs non vides d'une colonne, sous la rangée d'en-tête. */
function valeursSous(rangees: readonly Rangee[], entete: number, colonne: string): string[] {
  return rangees
    .slice(entete + 1)
    .flatMap((r) => r.cellules.filter((c) => c.colonne === colonne).map((c) => c.valeur));
}

function ligneRangee(r: Rangee, nombre: number): string {
  const cellules = r.cellules.map((c) => `${c.colonne}=${c.valeur}`).join(" | ");
  return nombre > 1 ? `L${r.numero} (× ${nombre}): ${cellules}` : `L${r.numero}: ${cellules}`;
}

/** Lignes d'une feuille : colonnes privées retirées, rangées identiques regroupées sous l'en-tête. */
function lignesFeuille(feuille: Feuille): string[] {
  const entete = positionEntete(feuille.rangees);
  const privees = new Set(
    entete < 0
      ? []
      : feuille.rangees[entete].cellules
          .filter((c) => colonnePrivee(c.valeur, () => valeursSous(feuille.rangees, entete, c.colonne)))
          .map((c) => c.colonne),
  );

  const groupes = new Map<string, { rangee: Rangee; nombre: number }>();
  feuille.rangees.forEach((r, position) => {
    const cellules = r.cellules.filter((c) => !privees.has(c.colonne));
    if (cellules.length === 0) return;
    const rangee = { numero: r.numero, cellules };
    const cle = entete >= 0 && position > entete ? JSON.stringify(cellules) : `#${position}`;
    const groupe = groupes.get(cle);
    if (groupe) groupe.nombre++;
    else groupes.set(cle, { rangee, nombre: 1 });
  });

  const lignes = [`Feuille « ${feuille.nom} »`];
  if (feuille.fusions.length > 0) lignes.push(`Cellules fusionnées : ${feuille.fusions.join(", ")}`);
  for (const { rangee, nombre } of groupes.values()) lignes.push(ligneRangee(rangee, nombre));
  return lignes;
}

/**
 * Grille de texte des feuilles, seule chose de l'inventaire qui part vers
 * Claude (après `masquerClient`). Au-delà de `max` caractères, coupe à la fin
 * d'une rangée. Une feuille `coupee` porte la même note : l'admin doit savoir
 * que la liste est incomplète.
 */
export function feuillesEnTexte(
  feuilles: Feuille[],
  max: number = LIMITES_LECTURE.texteTableur,
): { texte: string; tronque: boolean } {
  const budget = max - NOTE_TRONQUE.length - 1;
  const morceaux: string[] = [];
  let longueur = 0;
  let tronque = false;
  for (const feuille of feuilles) {
    if (feuille.rangees.length === 0 && !feuille.coupee) continue;
    const lignes = lignesFeuille(feuille);
    if (morceaux.length > 0) lignes.unshift("");
    for (const ligne of lignes) {
      if (longueur + ligne.length + 1 > budget) {
        if (morceaux[morceaux.length - 1] !== NOTE_TRONQUE) morceaux.push(NOTE_TRONQUE);
        return { texte: morceaux.join("\n"), tronque: true };
      }
      morceaux.push(ligne);
      longueur += ligne.length + 1;
    }
    if (feuille.coupee) {
      morceaux.push(NOTE_TRONQUE);
      longueur += NOTE_TRONQUE.length + 1;
      tronque = true;
    }
  }
  return { texte: morceaux.join("\n"), tronque };
}
