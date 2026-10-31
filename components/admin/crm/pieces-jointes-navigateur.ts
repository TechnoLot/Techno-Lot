import {
  CHAMP_PIECE,
  estDocument,
  messageFormatRefuse,
  PHOTO_COTE_MAX,
  PHOTO_QUALITE,
  problemeTaillesPieces,
} from "@/lib/crm/pieces-jointes";
import { detecterType, nomAffichable, nomPieceJointe, type TypeFichier } from "@/lib/securite/fichiers";

/*
 * Pièces jointes de l'envoi en gros, côté navigateur seulement (canvas,
 * URL d'aperçu) : préparation avant l'envoi au serveur, qui refait tous les
 * contrôles (lib/crm/envoi-en-gros-serveur.ts, lirePieces).
 */

/** Pièce jointe prête, gardée dans le navigateur jusqu'à l'envoi. */
export type PieceLocale = {
  id: string;
  /** Nom assaini, tel que reçu par les destinataires. */
  nom: string;
  taille: number;
  type: TypeFichier;
  photo: boolean;
  blob: Blob;
  /** URL d'aperçu (photos seulement), à libérer au retrait. */
  apercu: string | null;
};

export type PreparationPiece = { ok: true; piece: PieceLocale } | { ok: false; error: string };

/** Image d'après le type annoncé ou l'extension ; son contenu est vérifié au décodage. */
export function ressembleAPhoto(fichier: File): boolean {
  return fichier.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|tiff?)$/i.test(fichier.name);
}

/**
 * Photo réduite (plus grand côté : 1600 px) et réencodée en JPEG sur fond
 * blanc. Le réencodage retire les métadonnées de la photo, dont la position
 * GPS de l'appareil. Échoue si le navigateur ne sait pas lire l'image (ex.
 * HEIC d'iPhone dans Chrome sous Windows).
 */
export async function reduirePhoto(fichier: Blob): Promise<Blob> {
  const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  try {
    const echelle = Math.min(1, PHOTO_COTE_MAX / Math.max(image.width, image.height));
    const largeur = Math.max(1, Math.round(image.width * echelle));
    const hauteur = Math.max(1, Math.round(image.height * echelle));
    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const contexte = canvas.getContext("2d");
    if (!contexte) throw new Error("canvas indisponible");
    contexte.fillStyle = "#ffffff";
    contexte.fillRect(0, 0, largeur, hauteur);
    contexte.drawImage(image, 0, 0, largeur, hauteur);
    const blob = await new Promise<Blob | null>((resoudre) => canvas.toBlob(resoudre, "image/jpeg", PHOTO_QUALITE));
    if (!blob) throw new Error("encodage JPEG impossible");
    return blob;
  } finally {
    image.close();
  }
}

/**
 * Prépare un fichier choisi ou glissé : photo → réduite en JPEG ; document →
 * type réel lu dans ses octets (PDF, Excel, CSV, Word), comme le serveur.
 */
export async function preparerPiece(fichier: File): Promise<PreparationPiece> {
  const id = crypto.randomUUID();
  if (ressembleAPhoto(fichier)) {
    try {
      const blob = await reduirePhoto(fichier);
      return {
        ok: true,
        piece: {
          id,
          nom: nomPieceJointe(fichier.name, "jpeg"),
          taille: blob.size,
          type: "jpeg",
          photo: true,
          blob,
          apercu: URL.createObjectURL(blob),
        },
      };
    } catch {
      return {
        ok: false,
        error: `Photo illisible dans ce navigateur : ${nomAffichable(fichier.name)}. Enregistre-la en JPG (les photos HEIC de l'iPhone ne s'ouvrent pas partout), puis ajoute-la de nouveau.`,
      };
    }
  }

  const probleme = problemeTaillesPieces([fichier.size]);
  if (probleme) return { ok: false, error: probleme };
  if (fichier.size === 0) return { ok: false, error: `Fichier vide : ${nomAffichable(fichier.name)}.` };
  const type = detecterType(new Uint8Array(await fichier.arrayBuffer()), fichier.name);
  if (!type || !estDocument(type)) return { ok: false, error: messageFormatRefuse(fichier.name) };
  return {
    ok: true,
    piece: { id, nom: nomPieceJointe(fichier.name, type), taille: fichier.size, type, photo: false, blob: fichier, apercu: null },
  };
}

/** FormData des pièces jointes pour les actions (rien sans pièce jointe). */
export function formDataPieces(pieces: readonly PieceLocale[]): FormData | undefined {
  if (pieces.length === 0) return undefined;
  const donnees = new FormData();
  for (const p of pieces) donnees.append(CHAMP_PIECE, p.blob, p.nom);
  return donnees;
}
