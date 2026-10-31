import { describe, expect, it } from "vitest";
import {
  ACCEPT_DOCUMENTS,
  formaterTaille,
  MAX_PIECES,
  MAX_TOTAL_PIECES,
  problemeTaillesPieces,
  verifierPieces,
} from "@/lib/crm/pieces-jointes";
import { HEIC_VALIDE, JPEG_VALIDE, ole, octets, PDF_VALIDE, PNG_VALIDE, XLSX_VALIDE, zip } from "../securite/f2-outils";

/*
 * Pièces jointes de l'envoi en gros (lib/crm/pieces-jointes.ts) : type réel lu
 * dans les octets, liste blanche (photos JPG/PNG, PDF, Excel, CSV, Word),
 * nombre et poids, noms assainis et uniques.
 */

const MO = 1024 * 1024;

describe("formaterTaille", () => {
  it("Ko arrondis (1 Ko au moins), Mo à une décimale, sans « ,0 »", () => {
    expect(formaterTaille(10)).toBe("1 Ko");
    expect(formaterTaille(319_488)).toBe("312 Ko");
    expect(formaterTaille(2.44 * MO)).toBe("2,4 Mo");
    expect(formaterTaille(MAX_TOTAL_PIECES)).toBe("7 Mo");
    expect(formaterTaille(1_536 * 1024 * 1024)).toBe("1 536 Mo");
  });
});

describe("problemeTaillesPieces", () => {
  it("dans les limites : aucun problème", () => {
    expect(problemeTaillesPieces([])).toBeNull();
    expect(problemeTaillesPieces(Array(MAX_PIECES).fill(100_000))).toBeNull();
    expect(problemeTaillesPieces([MAX_TOTAL_PIECES])).toBeNull();
  });

  it("trop de pièces ou trop lourd : message clair", () => {
    expect(problemeTaillesPieces(Array(MAX_PIECES + 1).fill(10))).toMatch(/15 au plus/);
    expect(problemeTaillesPieces([4 * MO, 3 * MO + 1])).toMatch(/7 Mo au total au plus \(7 Mo choisis\)/);
  });
});

describe("verifierPieces", () => {
  it("photos et documents permis : type réel, type MIME déduit, nom gardé", () => {
    const r = verifierPieces([
      { nom: "lot-1.jpg", contenu: JPEG_VALIDE() },
      { nom: "capture.png", contenu: PNG_VALIDE() },
      { nom: "Liste du lot.pdf", contenu: PDF_VALIDE() },
      { nom: "inventaire.xlsx", contenu: XLSX_VALIDE() },
      { nom: "ancien.xls", contenu: ole("Workbook") },
      { nom: "liste.csv", contenu: octets("Modèle;Qté\nLatitude 5420;40\n") },
      { nom: "fiche.docx", contenu: zip({ "[Content_Types].xml": "<Types/>", "word/document.xml": "<w/>" }) },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pieces.map((p) => [p.nom, p.mime])).toEqual([
      ["lot-1.jpg", "image/jpeg"],
      ["capture.png", "image/png"],
      ["Liste du lot.pdf", "application/pdf"],
      ["inventaire.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["ancien.xls", "application/vnd.ms-excel"],
      ["liste.csv", "text/csv"],
      ["fiche.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ]);
  });

  it("le contenu décide, pas le nom : extension corrigée, chemin retiré", () => {
    const r = verifierPieces([
      { nom: "photo.jpg", contenu: PNG_VALIDE() },
      { nom: "../../secret/liste.pdf", contenu: PDF_VALIDE() },
    ]);
    expect(r.ok && r.pieces.map((p) => p.nom)).toEqual(["photo.png", "liste.pdf"]);
  });

  it("noms en double : « (2) », « (3) », sans tenir compte de la casse", () => {
    const r = verifierPieces([
      { nom: "photo.jpg", contenu: JPEG_VALIDE() },
      { nom: "PHOTO.jpg", contenu: JPEG_VALIDE() },
      { nom: "photo.jpg", contenu: JPEG_VALIDE() },
    ]);
    expect(r.ok && r.pieces.map((p) => p.nom)).toEqual(["photo.jpg", "PHOTO (2).jpg", "photo (3).jpg"]);
  });

  it.each([
    ["page HTML renommée en PDF", "offre.pdf", octets("<!doctype html><html><script>alert(1)</script></html>")],
    ["SVG renommé en JPG", "lot.jpg", octets('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ["exécutable", "liste.pdf", octets("MZ", new Uint8Array(64))],
    ["classeur à macros", "liste.xlsx", zip({ "[Content_Types].xml": "<Types/>", "xl/workbook.xml": "<w/>", "xl/vbaProject.bin": "x" })],
    ["photo HEIC (non convertie)", "IMG_0001.heic", HEIC_VALIDE()],
    ["archive ZIP", "photos.zip", zip({ "a.txt": "a" })],
  ])("refusé : %s", (_cas, nom, contenu) => {
    const r = verifierPieces([{ nom: "ok.pdf", contenu: PDF_VALIDE() }, { nom, contenu }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^Format non accepté : /);
  });

  it("fichier vide, trop de pièces, trop lourd : refusés", () => {
    expect(verifierPieces([{ nom: "vide.pdf", contenu: new Uint8Array(0) }])).toEqual({
      ok: false,
      error: "Pièce jointe vide : vide.pdf.",
    });
    const trop = Array.from({ length: MAX_PIECES + 1 }, (_, i) => ({ nom: `p${i}.jpg`, contenu: JPEG_VALIDE() }));
    expect(verifierPieces(trop).ok).toBe(false);
    const lourd = octets(PDF_VALIDE(), new Uint8Array(MAX_TOTAL_PIECES));
    expect(verifierPieces([{ nom: "gros.pdf", contenu: lourd }]).ok).toBe(false);
  });

  it("aucune pièce jointe : rien à vérifier", () => {
    expect(verifierPieces([])).toEqual({ ok: true, pieces: [] });
  });
});

describe("ACCEPT_DOCUMENTS", () => {
  it("filtre du sélecteur : PDF, Excel, CSV et Word seulement", () => {
    expect(ACCEPT_DOCUMENTS.split(",").filter((a) => a.startsWith("."))).toEqual([
      ".pdf",
      ".xlsx",
      ".xls",
      ".csv",
      ".docx",
      ".doc",
    ]);
  });
});
