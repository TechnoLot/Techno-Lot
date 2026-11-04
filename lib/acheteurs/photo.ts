import "server-only";

/*
 * Photo d'une soumission, réencodée avant de partir vers Claude : jamais
 * l'original, ses métadonnées (GPS, appareil) peuvent désigner le client.
 * sharp est chargé à la demande : la route reste vivante si le binaire manque.
 */

const COTE_MAX = 1_568;
const QUALITE = 80;
/** Refuse une image piégée (petit fichier, des milliards de pixels). */
const PIXELS_MAX = 100_000_000;

/** Photo prête pour Claude : 1 568 px au plus, JPEG, sans métadonnées (GPS). Erreur : format illisible. */
export async function preparerPhoto(octets: Uint8Array): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(octets, { limitInputPixels: PIXELS_MAX })
    .rotate()
    .resize({ width: COTE_MAX, height: COTE_MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITE })
    .toBuffer();
}
