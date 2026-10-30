/**
 * Pièces jointes du formulaire public (check 18) : le VRAI type d'un fichier
 * est lu dans ses premiers octets (« octets magiques »), jamais déduit du nom
 * ni du `Content-Type` envoyé par le navigateur (tous deux choisis par le
 * client).
 *
 * Sans `server-only` ni `"use client"` : logique pure, partagée par
 * `/api/soumission` (contrôle qui compte) et `components/SubmissionForm.tsx`
 * (mêmes listes, pour refuser tôt dans le navigateur).
 *
 * Refusés : SVG, HTML, XML, JS, exécutables, archives autres que les
 * classeurs/documents Office, classeurs à macros (vbaProject), et tout ce qui
 * n'est pas reconnu.
 */

export type TypeFichier =
  | "pdf"
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "heic"
  | "avif"
  | "xlsx"
  | "docx"
  | "xls"
  | "doc"
  | "csv"
  | "txt";

type DescriptionType = {
  /** Type MIME transmis à Resend (jamais celui du navigateur). */
  mime: string;
  /** Extensions acceptées pour ce type ; la première est la forme canonique. */
  extensions: readonly string[];
};

export const TYPES_FICHIERS: Record<TypeFichier, DescriptionType> = {
  pdf: { mime: "application/pdf", extensions: ["pdf"] },
  jpeg: { mime: "image/jpeg", extensions: ["jpg", "jpeg"] },
  png: { mime: "image/png", extensions: ["png"] },
  webp: { mime: "image/webp", extensions: ["webp"] },
  gif: { mime: "image/gif", extensions: ["gif"] },
  heic: { mime: "image/heic", extensions: ["heic", "heif"] },
  avif: { mime: "image/avif", extensions: ["avif"] },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extensions: ["xlsx"],
  },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: ["docx"],
  },
  xls: { mime: "application/vnd.ms-excel", extensions: ["xls"] },
  doc: { mime: "application/msword", extensions: ["doc"] },
  csv: { mime: "text/csv", extensions: ["csv"] },
  txt: { mime: "text/plain", extensions: ["txt"] },
};

/**
 * Liste blanche par champ = ce que le formulaire accepte réellement
 * (`accept=".xls,.xlsx,.csv,.pdf"` pour l'inventaire, images pour les photos).
 */
export const TYPES_PAR_CHAMP = {
  inventaire: ["pdf", "xlsx", "xls", "csv"],
  photos: ["jpeg", "png", "webp", "gif", "heic", "avif"],
} as const satisfies Record<string, readonly TypeFichier[]>;

export type ChampFichier = keyof typeof TYPES_PAR_CHAMP;

export const CHAMPS_FICHIERS = Object.keys(TYPES_PAR_CHAMP) as ChampFichier[];

/** Extensions acceptées par champ (pour le filtre du navigateur). */
export const EXTENSIONS_PAR_CHAMP: Record<ChampFichier, readonly string[]> = {
  inventaire: TYPES_PAR_CHAMP.inventaire.flatMap((t) => TYPES_FICHIERS[t].extensions),
  photos: TYPES_PAR_CHAMP.photos.flatMap((t) => TYPES_FICHIERS[t].extensions),
};

/** Types MIME acceptés par champ (repli du navigateur quand le nom n'a pas d'extension). */
export const MIMES_PAR_CHAMP: Record<ChampFichier, readonly string[]> = {
  inventaire: TYPES_PAR_CHAMP.inventaire.map((t) => TYPES_FICHIERS[t].mime),
  photos: [...TYPES_PAR_CHAMP.photos.map((t) => TYPES_FICHIERS[t].mime), "image/heif"],
};

export const LIMITES_FICHIERS = {
  /** 10 Mo par fichier. */
  maxParFichier: 10 * 1024 * 1024,
  /** 15 Mo au total (comme l'indique le formulaire). */
  maxTotal: 15 * 1024 * 1024,
  /** 10 fichiers au plus par envoi. */
  maxFichiers: 10,
} as const;

/** Longueur maximale du nom de pièce jointe (extension comprise). */
export const LONGUEUR_MAX_NOM = 100;

// --- Octets magiques ----------------------------------------------------------------

function commencePar(o: Uint8Array, signature: readonly number[], decalage = 0): boolean {
  if (o.length < decalage + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (o[decalage + i] !== signature[i]) return false;
  }
  return true;
}

function ascii(o: Uint8Array, debut: number, fin: number): string {
  let s = "";
  for (let i = debut; i < Math.min(fin, o.length); i++) s += String.fromCharCode(o[i]);
  return s;
}

function lireU16(o: Uint8Array, i: number): number {
  return o[i] | (o[i + 1] << 8);
}

function lireU32(o: Uint8Array, i: number): number {
  return (o[i] | (o[i + 1] << 8) | (o[i + 2] << 16) | (o[i + 3] << 24)) >>> 0;
}

/** Cherche une suite d'octets (recherche naïve, suffisante pour ≤ 10 Mo). */
function contient(o: Uint8Array, aiguille: Uint8Array, depuis = 0, jusqua = o.length): boolean {
  const fin = Math.min(jusqua, o.length) - aiguille.length;
  externe: for (let i = depuis; i <= fin; i++) {
    for (let j = 0; j < aiguille.length; j++) {
      if (o[i + j] !== aiguille[j]) continue externe;
    }
    return true;
  }
  return false;
}

/** Nom de flux OLE en UTF-16LE (« Workbook » → W\0o\0r\0…). */
function utf16le(s: string): Uint8Array {
  const o = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) o[i * 2] = s.charCodeAt(i) & 0xff;
  return o;
}

const SIG_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const SIG_JPEG = [0xff, 0xd8, 0xff];
const SIG_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const SIG_ZIP = [0x50, 0x4b, 0x03, 0x04];
const SIG_OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/** Marques « ftyp » HEIF/HEIC (photos d'iPhone et d'Android récents). */
const MARQUES_HEIC = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);
const MARQUES_AVIF = new Set(["avif", "avis"]);

/** Limites de l'analyse d'une archive Office (bombe de décompression). */
const ZIP_MAX_ENTREES = 5_000;
const ZIP_MAX_DECOMPRESSE = 300 * 1024 * 1024;

/**
 * Noms des entrées d'une archive ZIP, lus dans le répertoire central (fin du
 * fichier), ou null si l'archive est mal formée ou dépasse les limites.
 */
export function entreesZip(o: Uint8Array): string[] | null {
  // Enregistrement de fin de répertoire central : 22 octets + commentaire (≤ 65 535).
  const minFin = Math.max(0, o.length - 22 - 0xffff);
  let fin = -1;
  for (let i = o.length - 22; i >= minFin; i--) {
    if (o[i] === 0x50 && o[i + 1] === 0x4b && o[i + 2] === 0x05 && o[i + 3] === 0x06) {
      fin = i;
      break;
    }
  }
  if (fin < 0) return null;
  const total = lireU16(o, fin + 10);
  const taille = lireU32(o, fin + 12);
  const debut = lireU32(o, fin + 16);
  if (total === 0xffff || debut === 0xffffffff) return null; // ZIP64 : jamais produit par Office pour ces tailles
  if (total > ZIP_MAX_ENTREES || debut + taille > fin) return null;

  const noms: string[] = [];
  let decompresse = 0;
  let p = debut;
  for (let n = 0; n < total; n++) {
    if (p + 46 > fin || lireU32(o, p) !== 0x02014b50) return null;
    decompresse += lireU32(o, p + 24);
    if (decompresse > ZIP_MAX_DECOMPRESSE) return null;
    const lgNom = lireU16(o, p + 28);
    const lgExtra = lireU16(o, p + 30);
    const lgCommentaire = lireU16(o, p + 32);
    if (p + 46 + lgNom > fin) return null;
    noms.push(ascii(o, p + 46, p + 46 + lgNom));
    p += 46 + lgNom + lgExtra + lgCommentaire;
  }
  return noms;
}

function typeOffice(o: Uint8Array): TypeFichier | null {
  const noms = entreesZip(o);
  if (!noms) return null;
  const ensemble = new Set(noms.map((n) => n.toLowerCase()));
  if (!ensemble.has("[content_types].xml")) return null;
  // Classeur ou document à macros (.xlsm / .docm renommés) : refusé.
  if (noms.some((n) => /(^|\/)vbaproject\.bin$/i.test(n))) return null;
  if (ensemble.has("xl/workbook.xml")) return "xlsx";
  if (ensemble.has("word/document.xml")) return "docx";
  return null;
}

const OLE_WORKBOOK = utf16le("Workbook");
const OLE_BOOK = utf16le("Book");
const OLE_WORD = utf16le("WordDocument");
const OLE_VBA = utf16le("_VBA_PROJECT");

function typeOle(o: Uint8Array): TypeFichier | null {
  // Les noms de flux sont en UTF-16LE dans les secteurs du répertoire.
  if (contient(o, OLE_VBA)) return null; // macros VBA
  if (contient(o, OLE_WORD)) return "doc";
  if (contient(o, OLE_WORKBOOK) || contient(o, OLE_BOOK)) return "xls";
  return null; // autre fichier OLE (ex. installateur .msi) : refusé
}

/** Balisage en tête de texte : HTML, SVG, XML (refusés même renommés en .csv). */
const BALISAGE = /<\s*(!doctype|html|head|body|script|svg|\?xml|iframe|object|embed|meta|link|style|a\s|img\s)/i;

/**
 * Texte brut : UTF-8 valide, aucun octet nul ni caractère de contrôle autre
 * que tabulation, retour chariot, saut de ligne et saut de page, et aucun
 * balisage HTML/SVG/XML dans les 8 premiers Ko.
 */
export function estTexte(o: Uint8Array): boolean {
  if (o.length === 0) return false;
  for (let i = 0; i < o.length; i++) {
    const c = o[i];
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d && c !== 0x0c) return false;
    if (c === 0x7f) return false;
  }
  let texte: string;
  try {
    texte = new TextDecoder("utf-8", { fatal: true }).decode(o);
  } catch {
    return false;
  }
  const debut = texte.slice(0, 8192);
  return !BALISAGE.test(debut);
}

/**
 * Type réel d'après le contenu, ou null s'il n'est pas reconnu (ou refusé).
 * Pour un texte (aucun octet magique), l'extension déclarée choisit entre
 * CSV et TXT : un texte sans extension .csv/.txt est refusé.
 */
export function detecterType(o: Uint8Array, nomDeclare = ""): TypeFichier | null {
  if (commencePar(o, SIG_PDF)) return "pdf";
  if (commencePar(o, SIG_JPEG)) return "jpeg";
  if (commencePar(o, SIG_PNG)) return "png";
  if (ascii(o, 0, 6) === "GIF87a" || ascii(o, 0, 6) === "GIF89a") return "gif";
  if (ascii(o, 0, 4) === "RIFF" && ascii(o, 8, 12) === "WEBP") return "webp";
  if (o.length >= 12 && ascii(o, 4, 8) === "ftyp") {
    const marque = ascii(o, 8, 12).toLowerCase();
    if (MARQUES_HEIC.has(marque)) return "heic";
    if (MARQUES_AVIF.has(marque)) return "avif";
    return null; // vidéo MP4/MOV, etc.
  }
  if (commencePar(o, SIG_ZIP)) return typeOffice(o);
  if (commencePar(o, SIG_OLE)) return typeOle(o);

  const ext = extension(nomDeclare);
  if ((ext === "csv" || ext === "txt") && estTexte(o)) return ext;
  return null;
}

// --- Noms de fichiers ------------------------------------------------------------------

/** Extension en minuscules du dernier segment (« ../a/B.PDF » → « pdf »), ou "". */
export function extension(nom: string): string {
  const base = dernierSegment(nom);
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i + 1).toLowerCase() : "";
}

function dernierSegment(nom: string): string {
  const parties = String(nom).split(/[\\/]/);
  return parties[parties.length - 1] ?? "";
}

/**
 * Nom de pièce jointe sûr : dernier segment seulement (aucun chemin), sans
 * caractères de contrôle, guillemets ni caractères interdits sous Windows,
 * 100 caractères au plus, avec une extension cohérente avec le type détecté
 * (remplacée sinon). « ../../x.pdf » → « x.pdf ».
 */
export function nomPieceJointe(nomOriginal: string, type: TypeFichier): string {
  const { extensions } = TYPES_FICHIERS[type];
  let base = dernierSegment(nomOriginal ?? "").normalize("NFC");
  base = base
    .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/["'`<>:|?*;\\/]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  // Extension : gardée si elle correspond au type détecté, sinon remplacée.
  const i = base.lastIndexOf(".");
  let tronc = i > 0 ? base.slice(0, i) : base;
  const extDeclaree = i > 0 ? base.slice(i + 1).toLowerCase() : "";
  const ext = extensions.includes(extDeclaree) ? extDeclaree : extensions[0];

  tronc = tronc.replace(/^[.\s_-]+/, "").replace(/[.\s]+$/, "");
  if (!tronc) tronc = "fichier";
  const max = LONGUEUR_MAX_NOM - ext.length - 1;
  if (tronc.length > max) tronc = tronc.slice(0, max).replace(/[.\s]+$/, "") || "fichier";
  return `${tronc}.${ext}`;
}

// --- Vérification d'un envoi --------------------------------------------------------------

export type FichierRecu = { champ: ChampFichier; nom: string; taille: number };

export type MotifRefusFichier =
  | "trop_de_fichiers"
  | "fichier_trop_gros"
  | "total_trop_gros"
  | "type_refuse";

export type FichierAccepte = {
  champ: ChampFichier;
  type: TypeFichier;
  mime: string;
  /** Nom assaini (pièce jointe et liste du courriel). */
  nom: string;
  contenu: Uint8Array;
};

export type VerdictFichiers =
  | { ok: true; fichiers: FichierAccepte[] }
  | { ok: false; motif: MotifRefusFichier; nom?: string };

/**
 * Contrôle du nombre et des tailles AVANT toute lecture du contenu (les tailles
 * viennent de l'analyse du corps multipart, bornée par Content-Length).
 */
export function verifierTailles(fichiers: readonly FichierRecu[]): VerdictFichiers | null {
  if (fichiers.length > LIMITES_FICHIERS.maxFichiers) return { ok: false, motif: "trop_de_fichiers" };
  let total = 0;
  for (const f of fichiers) {
    if (f.taille > LIMITES_FICHIERS.maxParFichier) {
      return { ok: false, motif: "fichier_trop_gros", nom: f.nom };
    }
    total += f.taille;
  }
  if (total > LIMITES_FICHIERS.maxTotal) return { ok: false, motif: "total_trop_gros" };
  return null;
}

/**
 * Vérifie un envoi complet : nombre, tailles, type réel par champ, nom assaini.
 * Le premier fichier refusé arrête tout (le visiteur corrige et renvoie).
 */
export function verifierFichiers(
  fichiers: readonly (FichierRecu & { contenu: Uint8Array })[],
): VerdictFichiers {
  const tailles = verifierTailles(
    fichiers.map((f) => ({ champ: f.champ, nom: f.nom, taille: f.contenu.byteLength })),
  );
  if (tailles) return tailles;

  const acceptes: FichierAccepte[] = [];
  for (const f of fichiers) {
    const type = detecterType(f.contenu, f.nom);
    const permis: readonly TypeFichier[] = TYPES_PAR_CHAMP[f.champ];
    if (!type || !permis.includes(type)) {
      return { ok: false, motif: "type_refuse", nom: nomAffichable(f.nom) };
    }
    acceptes.push({
      champ: f.champ,
      type,
      mime: TYPES_FICHIERS[type].mime,
      nom: nomPieceJointe(f.nom, type),
      contenu: f.contenu,
    });
  }
  return { ok: true, fichiers: acceptes };
}

/** Nom d'origine réduit à un texte sûr pour un message d'erreur (≤ 80 car.). */
export function nomAffichable(nom: string): string {
  const base = dernierSegment(nom ?? "")
    .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
  return (base || "fichier").slice(0, 80);
}
