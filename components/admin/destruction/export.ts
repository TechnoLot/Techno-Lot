import { getFontEmbedCSS, toCanvas } from "html-to-image";

/**
 * Export du certificat affiché à l'écran, dans le navigateur : photo PNG à
 * 300 ppp (2550 × 3300) et PDF d'une page Lettre qui contient cette image.
 * Aucun service externe : html-to-image dessine le certificat tel quel (mêmes
 * polices, même mise en page que l'aperçu).
 */

const LARGEUR = 816; // 8,5 po × 96 px
const HAUTEUR = 1056; // 11 po × 96 px
const PIXELS_PAR_PX = 300 / 96;

async function dessiner(noeud: HTMLElement): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const fontEmbedCSS = await getFontEmbedCSS(noeud);
  const options = {
    width: LARGEUR,
    height: HAUTEUR,
    backgroundColor: "#ffffff",
    fontEmbedCSS,
    pixelRatio: PIXELS_PAR_PX,
  };
  // Premier passage minuscule : Safari n'applique parfois les polices intégrées qu'au 2e rendu.
  await toCanvas(noeud, { ...options, pixelRatio: 0.1 });
  return toCanvas(noeud, options);
}

function versBlob(canvas: HTMLCanvasElement, type: string, qualite?: number): Promise<Blob> {
  return new Promise((ok, ko) =>
    canvas.toBlob((blob) => (blob ? ok(blob) : ko(new Error("image vide"))), type, qualite),
  );
}

/** Chaîne PDF en UTF-16BE (titre avec accents). */
function texteUtf16(texte: string): string {
  let hex = "FEFF";
  for (let i = 0; i < texte.length; i++) {
    hex += texte.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  }
  return `<${hex}>`;
}

/** PDF minimal d'une page Lettre (612 × 792 pt) : l'image JPEG, pleine page. */
export function pdfDepuisJpeg(jpeg: Uint8Array, largeur: number, hauteur: number, titre: string): Blob {
  const morceaux: Uint8Array[] = [];
  const decalages: number[] = [];
  let position = 0;
  const encodeur = new TextEncoder();
  const ajouter = (octets: Uint8Array) => {
    morceaux.push(octets);
    position += octets.length;
  };
  // Tout le texte écrit ici est en ASCII : nombre d'octets = nombre de caractères.
  const ecrire = (texte: string) => ajouter(encodeur.encode(texte));
  const objet = (n: number, contenu: string) => {
    decalages[n] = position;
    ecrire(`${n} 0 obj\n${contenu}\nendobj\n`);
  };

  // En-tête + ligne de 4 octets > 127 : le fichier est reconnu comme binaire.
  ecrire("%PDF-1.4\n");
  ajouter(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  objet(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objet(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objet(
    3,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
  );
  decalages[4] = position;
  ecrire(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${largeur} /Height ${hauteur} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  );
  ajouter(jpeg);
  ecrire("\nendstream\nendobj\n");
  const dessin = "q 612 0 0 792 0 0 cm /Im0 Do Q";
  objet(5, `<< /Length ${dessin.length} >>\nstream\n${dessin}\nendstream`);
  objet(6, `<< /Title ${texteUtf16(titre)} /Author (Techno Lot) /Creator (technolot.ca) >>`);

  const debutXref = position;
  const entrees = decalages
    .slice(1)
    .map((d) => `${String(d).padStart(10, "0")} 00000 n \n`)
    .join("");
  ecrire(
    `xref\n0 ${decalages.length}\n0000000000 65535 f \n${entrees}trailer\n<< /Size ${decalages.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`,
  );

  const fichier = new Uint8Array(position);
  let curseur = 0;
  for (const octets of morceaux) {
    fichier.set(octets, curseur);
    curseur += octets.length;
  }
  return new Blob([fichier], { type: "application/pdf" });
}

function enregistrerFichier(blob: Blob, nomFichier: string) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Télécharge le certificat affiché (`noeud`, 816 × 1056 px) en PDF ou en photo PNG. */
export async function telechargerCertificat(
  noeud: HTMLElement,
  format: "pdf" | "png",
  nomFichier: string,
  titre: string,
): Promise<void> {
  const canvas = await dessiner(noeud);
  if (format === "png") {
    enregistrerFichier(await versBlob(canvas, "image/png"), nomFichier);
    return;
  }
  const jpeg = new Uint8Array(await (await versBlob(canvas, "image/jpeg", 0.95)).arrayBuffer());
  enregistrerFichier(pdfDepuisJpeg(jpeg, canvas.width, canvas.height, titre), nomFichier);
}
