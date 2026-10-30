import { describe, expect, it } from "vitest";
import {
  detecterType,
  entreesZip,
  LIMITES_FICHIERS,
  nomPieceJointe,
  verifierFichiers,
  verifierTailles,
} from "@/lib/securite/fichiers";
import {
  HEIC_VALIDE,
  JPEG_VALIDE,
  ole,
  octets,
  PDF_VALIDE,
  PNG_VALIDE,
  XLSX_VALIDE,
  zip,
} from "./f2-outils";

describe("détection du type réel (octets magiques)", () => {
  it("reconnaît les formats acceptés", () => {
    expect(detecterType(PDF_VALIDE(), "liste.pdf")).toBe("pdf");
    expect(detecterType(JPEG_VALIDE(), "a.jpg")).toBe("jpeg");
    expect(detecterType(PNG_VALIDE(), "a.png")).toBe("png");
    expect(detecterType(octets("GIF89a", new Uint8Array(10)), "a.gif")).toBe("gif");
    expect(detecterType(octets("RIFF", [0, 0, 0, 0], "WEBPVP8 ", new Uint8Array(8)), "a.webp")).toBe("webp");
    expect(detecterType(HEIC_VALIDE(), "IMG_1.HEIC")).toBe("heic");
    expect(detecterType(XLSX_VALIDE(), "inventaire.xlsx")).toBe("xlsx");
    expect(detecterType(ole("Workbook"), "vieux.xls")).toBe("xls");
    expect(detecterType(ole("WordDocument"), "lettre.doc")).toBe("doc");
    expect(detecterType(octets("﻿marque;modèle;qté\nDell;7490;12\n"), "liste.csv")).toBe("csv");
  });

  it("refuse un HTML renommé en .jpg", () => {
    expect(detecterType(octets("<!DOCTYPE html><html><script>alert(1)</script></html>"), "photo.jpg")).toBeNull();
  });

  it("refuse un SVG contenant un script, quel que soit son nom", () => {
    const svg = octets('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(detecterType(svg, "image.svg")).toBeNull();
    expect(detecterType(svg, "image.png")).toBeNull();
    // Même déguisé en CSV : balisage refusé.
    expect(detecterType(svg, "liste.csv")).toBeNull();
    expect(detecterType(octets("  <?xml version='1.0'?><svg/>"), "liste.csv")).toBeNull();
  });

  it("refuse exécutables, scripts et archives inconnues", () => {
    expect(detecterType(octets("MZ", new Uint8Array(64)), "setup.pdf")).toBeNull();
    expect(detecterType(octets([0x7f], "ELF", new Uint8Array(16)), "a.xlsx")).toBeNull();
    expect(detecterType(octets("#!/bin/sh\nrm -rf /\n"), "script.pdf")).toBeNull();
    // ZIP sans [Content_Types].xml (archive quelconque).
    expect(detecterType(zip({ "virus.exe": "MZ" }), "inventaire.xlsx")).toBeNull();
    // Classeur à macros renommé (.xlsm → .xlsx).
    expect(
      detecterType(
        zip({ "[Content_Types].xml": "<Types/>", "xl/workbook.xml": "<w/>", "xl/vbaProject.bin": "x" }),
        "inventaire.xlsx",
      ),
    ).toBeNull();
    // Fichier OLE qui n'est ni Excel ni Word (ex. installateur .msi).
    expect(detecterType(ole("SummaryInformation"), "liste.xls")).toBeNull();
    // OLE avec macros VBA.
    expect(detecterType(octets(ole("Workbook"), ole("_VBA_PROJECT")), "liste.xls")).toBeNull();
    // Vidéo MP4 (boîte ftyp, marque isom).
    expect(detecterType(octets([0, 0, 0, 0x18], "ftypisom", new Uint8Array(8)), "a.heic")).toBeNull();
  });

  it("texte : UTF-8 sans octet nul, extension .csv/.txt obligatoire", () => {
    expect(detecterType(octets("a;b\n1;2\n"), "liste")).toBeNull();
    expect(detecterType(octets("a;b", [0], "c"), "liste.csv")).toBeNull();
    expect(detecterType(octets("caf", [0xe9], "\n"), "liste.csv")).toBeNull(); // Windows-1252, pas UTF-8
  });

  it("lit les entrées d'un ZIP et refuse une archive tronquée", () => {
    expect(entreesZip(XLSX_VALIDE())).toContain("[Content_Types].xml");
    const z = XLSX_VALIDE();
    expect(entreesZip(z.slice(0, z.length - 10))).toBeNull();
  });
});

describe("noms de pièces jointes", () => {
  it("retire tout chemin : ../../x.pdf → x.pdf", () => {
    expect(nomPieceJointe("../../x.pdf", "pdf")).toBe("x.pdf");
    expect(nomPieceJointe("..\\..\\windows\\system32\\x.pdf", "pdf")).toBe("x.pdf");
    expect(nomPieceJointe("/etc/passwd", "pdf")).toBe("passwd.pdf");
  });

  it("retire contrôles, guillemets et caractères interdits", () => {
    const nom = nomPieceJointe('a"b\r\nc\u0000d\u202Egpj.pdf', "pdf");
    expect(nom).toBe("a_bcdgpj.pdf");
    expect(nomPieceJointe("rapport<script>.pdf", "pdf")).toBe("rapport_script_.pdf");
  });

  it("extension cohérente avec le type détecté", () => {
    expect(nomPieceJointe("photo.png", "jpeg")).toBe("photo.jpg");
    expect(nomPieceJointe("photo.JPEG", "jpeg")).toBe("photo.jpeg");
    expect(nomPieceJointe("inventaire", "xlsx")).toBe("inventaire.xlsx");
    expect(nomPieceJointe("", "csv")).toBe("fichier.csv");
    expect(nomPieceJointe("...", "pdf")).toBe("fichier.pdf");
  });

  it("100 caractères au plus", () => {
    const nom = nomPieceJointe(`${"x".repeat(500)}.pdf`, "pdf");
    expect(nom.length).toBeLessThanOrEqual(100);
    expect(nom.endsWith(".pdf")).toBe(true);
  });
});

describe("vérification d'un envoi", () => {
  it("accepte un envoi conforme et donne type MIME + nom assaini", () => {
    const r = verifierFichiers([
      { champ: "inventaire", nom: "../liste.xlsx", taille: 0, contenu: XLSX_VALIDE() },
      { champ: "photos", nom: "IMG.HEIC", taille: 0, contenu: HEIC_VALIDE() },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fichiers.map((f) => [f.nom, f.mime])).toEqual([
        ["liste.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        ["IMG.heic", "image/heic"],
      ]);
    }
  });

  it("refuse un type valide mais pas pour ce champ (PDF dans les photos)", () => {
    const r = verifierFichiers([{ champ: "photos", nom: "a.pdf", taille: 0, contenu: PDF_VALIDE() }]);
    expect(r).toEqual({ ok: false, motif: "type_refuse", nom: "a.pdf" });
  });

  it("refuse un fichier trop gros, trop de fichiers, un total trop lourd", () => {
    const max = LIMITES_FICHIERS.maxParFichier;
    expect(verifierTailles([{ champ: "photos", nom: "gros.jpg", taille: max + 1 }])).toMatchObject({
      ok: false,
      motif: "fichier_trop_gros",
    });
    expect(
      verifierTailles(Array.from({ length: 11 }, (_, i) => ({ champ: "photos" as const, nom: `${i}.jpg`, taille: 1 }))),
    ).toMatchObject({ ok: false, motif: "trop_de_fichiers" });
    expect(
      verifierTailles([
        { champ: "photos", nom: "a.jpg", taille: 8 * 1024 * 1024 },
        { champ: "photos", nom: "b.jpg", taille: 8 * 1024 * 1024 },
      ]),
    ).toMatchObject({ ok: false, motif: "total_trop_gros" });
    expect(verifierTailles([{ champ: "photos", nom: "a.jpg", taille: max }])).toBeNull();
  });

  it("un vrai fichier trop gros est refusé avant l'analyse du contenu", () => {
    const gros = new Uint8Array(LIMITES_FICHIERS.maxParFichier + 1);
    gros.set([0xff, 0xd8, 0xff]);
    expect(verifierFichiers([{ champ: "photos", nom: "a.jpg", taille: 0, contenu: gros }])).toMatchObject({
      ok: false,
      motif: "fichier_trop_gros",
    });
  });
});
