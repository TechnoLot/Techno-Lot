import { formaterNombre } from "@/lib/crm/envoi-en-gros";
import {
  detecterType,
  LONGUEUR_MAX_NOM,
  nomAffichable,
  nomPieceJointe,
  TYPES_FICHIERS,
  type TypeFichier,
} from "@/lib/securite/fichiers";

/*
 * Pièces jointes de l'envoi en gros (photos du lot, liste en PDF ou Excel) :
 * logique PURE, partagée par le navigateur (refus tôt, mêmes listes) et par
 * les actions serveur (le contrôle qui compte). Le type réel est lu dans les
 * octets (lib/securite/fichiers.ts), jamais déduit du nom ni du type annoncé.
 *
 * Les photos sont réduites et réencodées en JPEG dans le navigateur avant
 * l'envoi (components/admin/crm/pieces-jointes-navigateur.ts) : courriel léger
 * et métadonnées retirées (position GPS de l'appareil comprise).
 */

/** Champ du FormData qui porte les pièces jointes (test et chaque lot). */
export const CHAMP_PIECE = "piece";

/** 15 pièces jointes au plus par courriel. */
export const MAX_PIECES = 15;

/**
 * 7 Mo de pièces jointes au plus : encodées pour l'envoi (base64, +33 %),
 * elles laissent le courriel sous 10 Mo, limite de réception courante des
 * serveurs de courriel d'entreprise.
 */
export const MAX_TOTAL_PIECES = 7 * 1024 * 1024;

/** Photos réduites dans le navigateur : plus grand côté en pixels, qualité JPEG. */
export const PHOTO_COTE_MAX = 1600;
export const PHOTO_QUALITE = 0.82;

/** Photos : JPEG (ce que produit la réduction du navigateur) ou PNG. */
export const TYPES_PHOTOS = ["jpeg", "png"] as const satisfies readonly TypeFichier[];

/** Documents : liste du lot (PDF, Excel, CSV) ou document Word. */
export const TYPES_DOCUMENTS = ["pdf", "xlsx", "xls", "csv", "docx", "doc"] as const satisfies readonly TypeFichier[];

const TYPES_PERMIS: ReadonlySet<TypeFichier> = new Set<TypeFichier>([...TYPES_PHOTOS, ...TYPES_DOCUMENTS]);

/** Filtre du sélecteur de documents (extensions et types MIME). */
export const ACCEPT_DOCUMENTS = [
  ...TYPES_DOCUMENTS.flatMap((t) => TYPES_FICHIERS[t].extensions.map((e) => `.${e}`)),
  ...TYPES_DOCUMENTS.map((t) => TYPES_FICHIERS[t].mime),
].join(",");

export type PieceJointe = {
  /** Nom assaini, unique dans le courriel (« photo (2).jpg »). */
  nom: string;
  type: TypeFichier;
  /** Type MIME déduit du type réel (jamais celui du navigateur). */
  mime: string;
  contenu: Uint8Array;
};

export type VerdictPieces = { ok: true; pieces: PieceJointe[] } | { ok: false; error: string };

export function estPhoto(type: TypeFichier): boolean {
  return (TYPES_PHOTOS as readonly TypeFichier[]).includes(type);
}

export function estDocument(type: TypeFichier): boolean {
  return (TYPES_DOCUMENTS as readonly TypeFichier[]).includes(type);
}

/**
 * Taille lisible, identique au serveur et dans le navigateur : « 312 Ko »,
 * « 2,4 Mo », « 7 Mo ».
 */
export function formaterTaille(octets: number): string {
  if (octets < 1024 * 1024) return `${formaterNombre(Math.max(1, Math.round(octets / 1024)))} Ko`;
  const dixiemes = Math.round((octets / (1024 * 1024)) * 10);
  const entier = Math.trunc(dixiemes / 10);
  const decimale = dixiemes % 10;
  return `${formaterNombre(entier)}${decimale ? `,${decimale}` : ""} Mo`;
}

export function messageFormatRefuse(nom: string): string {
  return `Format non accepté : ${nomAffichable(nom)}. Pièces jointes permises : photos (JPG, PNG), PDF, Excel, CSV et Word.`;
}

/**
 * Nombre et poids total, contrôlés AVANT toute lecture du contenu : message
 * prêt à afficher, ou null si tout va.
 */
export function problemeTaillesPieces(tailles: readonly number[]): string | null {
  if (tailles.length > MAX_PIECES) {
    return `Trop de pièces jointes : ${MAX_PIECES} au plus par courriel.`;
  }
  const total = tailles.reduce((somme, t) => somme + t, 0);
  if (total > MAX_TOTAL_PIECES) {
    return `Pièces jointes trop lourdes : ${formaterTaille(MAX_TOTAL_PIECES)} au total au plus (${formaterTaille(total)} choisis). Retire des photos ou joins un PDF plus léger.`;
  }
  return null;
}

/**
 * Noms en double : « photo.jpg », « photo (2).jpg »… (insensible à la casse,
 * 100 caractères au plus). Aussi appliqué dans le navigateur : la liste
 * affichée porte les noms que recevront les destinataires.
 */
export function nomsUniques<T extends { nom: string }>(pieces: readonly T[]): T[] {
  const pris = new Set<string>();
  return pieces.map((piece) => {
    let nom = piece.nom;
    const point = nom.lastIndexOf(".");
    const tronc = point > 0 ? nom.slice(0, point) : nom;
    const ext = point > 0 ? nom.slice(point) : "";
    for (let n = 2; pris.has(nom.toLowerCase()); n++) {
      const suffixe = ` (${n})`;
      nom = `${tronc.slice(0, LONGUEUR_MAX_NOM - ext.length - suffixe.length)}${suffixe}${ext}`;
    }
    pris.add(nom.toLowerCase());
    return nom === piece.nom ? piece : { ...piece, nom };
  });
}

/**
 * Vérifie les pièces jointes d'un envoi : nombre, poids total, fichier non
 * vide, type réel permis (photo ou document), nom assaini et unique. Le
 * premier fichier refusé arrête tout : rien n'est envoyé sans ses pièces.
 */
export function verifierPieces(fichiers: readonly { nom: string; contenu: Uint8Array }[]): VerdictPieces {
  const probleme = problemeTaillesPieces(fichiers.map((f) => f.contenu.byteLength));
  if (probleme) return { ok: false, error: probleme };

  const pieces: PieceJointe[] = [];
  for (const f of fichiers) {
    if (f.contenu.byteLength === 0) return { ok: false, error: `Pièce jointe vide : ${nomAffichable(f.nom)}.` };
    const type = detecterType(f.contenu, f.nom);
    if (!type || !TYPES_PERMIS.has(type)) return { ok: false, error: messageFormatRefuse(f.nom) };
    pieces.push({ nom: nomPieceJointe(f.nom, type), type, mime: TYPES_FICHIERS[type].mime, contenu: f.contenu });
  }
  return { ok: true, pieces: nomsUniques(pieces) };
}
