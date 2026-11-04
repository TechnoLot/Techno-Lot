import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { feuillesEnTexte, lireCsv, lireXlsx, type Feuille } from "@/lib/acheteurs/classeur";
import { LIMITES_LECTURE } from "@/lib/acheteurs/types";
import { repertoireZip } from "@/lib/securite/fichiers";

/*
 * Tableurs d'une soumission : un classeur est construit dans chaque test (petit
 * écrivain ZIP) pour éprouver ce qu'Excel écrit vraiment, et ce qu'un fichier
 * piégé du formulaire public pourrait écrire. Toutes les données sont fictives.
 */

type Fichiers = Record<string, string | Uint8Array>;

const texteOctets = new TextEncoder();

function u16(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff];
}
function u32(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
}

/** Archive ZIP compressée (deflate), ou stockée avec `stocke`. Le CRC n'est pas vérifié à la lecture. */
function zip(fichiers: Fichiers, stocke = false): Uint8Array {
  const locaux: number[][] = [];
  const blocs: Uint8Array[] = [];
  const centraux: Uint8Array[] = [];
  let decalage = 0;
  for (const [nom, contenu] of Object.entries(fichiers)) {
    const brut = typeof contenu === "string" ? texteOctets.encode(contenu) : contenu;
    const donnees = stocke ? brut : new Uint8Array(deflateRawSync(brut));
    const nomOctets = [...texteOctets.encode(nom)];
    const methode = stocke ? 0 : 8;
    const commun = [...u16(20), ...u16(0), ...u16(methode), ...u16(0), ...u16(0), ...u32(0), ...u32(donnees.length), ...u32(brut.length), ...u16(nomOctets.length), ...u16(0)];
    const local = [0x50, 0x4b, 0x03, 0x04, ...commun, ...nomOctets];
    locaux.push(local);
    blocs.push(Uint8Array.from(local), donnees);
    centraux.push(
      Uint8Array.from([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...commun, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(decalage), ...nomOctets]),
    );
    decalage += local.length + donnees.length;
  }
  const tailleCentrale = centraux.reduce((s, c) => s + c.length, 0);
  const fin = Uint8Array.from([0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(centraux.length), ...u16(centraux.length), ...u32(tailleCentrale), ...u32(decalage), ...u16(0)]);
  const morceaux = [...blocs, ...centraux, fin];
  const sortie = new Uint8Array(morceaux.reduce((s, m) => s + m.length, 0));
  let p = 0;
  for (const m of morceaux) {
    sortie.set(m, p);
    p += m.length;
  }
  return sortie;
}

const TYPE_FEUILLE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";

type FeuilleTest = { nom: string; xml: string | Uint8Array; etat?: string; cible?: string };

function classeur(feuilles: FeuilleTest[], chaines?: string, autres: Fichiers = {}, stocke = false): Uint8Array {
  const sheets = feuilles
    .map((f, i) => `<sheet name="${f.nom}" sheetId="${i + 1}"${f.etat ? ` state="${f.etat}"` : ""} r:id="rId${i + 1}"/>`)
    .join("");
  const rels = feuilles
    .map((f, i) => `<Relationship Id="rId${i + 1}" Type="${TYPE_FEUILLE}" Target="${f.cible ?? `worksheets/sheet${i + 1}.xml`}"/>`)
    .join("");
  const fichiers: Fichiers = {
    "[Content_Types].xml": "<Types/>",
    "xl/workbook.xml": `<?xml version="1.0"?><workbook xmlns:r="urn:r"><sheets>${sheets}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships>${rels}</Relationships>`,
    ...autres,
  };
  if (chaines !== undefined) fichiers["xl/sharedStrings.xml"] = `<sst>${chaines}</sst>`;
  feuilles.forEach((f, i) => {
    fichiers[(f.cible ?? `worksheets/sheet${i + 1}.xml`).replace(/^\/xl\/|^/, "xl/").replace("xl/xl/", "xl/")] = f.xml;
  });
  return zip(fichiers, stocke);
}

function feuille(contenu: string, apres = ""): string {
  return `<worksheet><sheetData>${contenu}</sheetData>${apres}</worksheet>`;
}

function grille(octets: Uint8Array): string {
  const feuilles = lireXlsx(octets);
  if (!feuilles) throw new Error("Classeur illisible.");
  return feuillesEnTexte(feuilles).texte;
}

function fauxTexte(texte: string): Feuille[] {
  // Une ligne par rangée, cellules séparées par « | ».
  return [
    {
      nom: "Test",
      fusions: [],
      rangees: texte.split("\n").map((ligne, i) => ({
        numero: i + 1,
        cellules: ligne.split("|").map((valeur, j) => ({ colonne: String.fromCharCode(65 + j), valeur })),
      })),
    },
  ];
}

describe("repertoireZip", () => {
  it("rend la méthode, les tailles et le décalage de chaque entrée", () => {
    const o = zip({ "a.txt": "aaaa", "b.txt": "bb" }, true);
    const entrees = repertoireZip(o);
    expect(entrees?.map((e) => [e.nom, e.methode, e.tailleCompressee, e.tailleReelle])).toEqual([
      ["a.txt", 0, 4, 4],
      ["b.txt", 0, 2, 2],
    ]);
    expect(entrees?.[0].decalage).toBe(0);
    expect(entrees?.[1].decalage).toBe(30 + 5 + 4);
  });

  it("refuse une archive tronquée", () => {
    const o = zip({ "a.txt": "aaaa" });
    expect(repertoireZip(o.slice(0, o.length - 10))).toBeNull();
  });
});

describe("lireXlsx : tableau croisé", () => {
  // Imite un vrai inventaire : fusions, abréviations, lieux, cellules vides auto-fermées, clé de modèles, prix.
  const chaines = ["Neuf, quantité", "Usagé, quantité", "Lieu", "wap", "cap", "Omni", "Port-Fictif", "Val-Exemple", "Prix demandé"]
    .map((c) => `<si><t>${c}</t></si>`)
    .join("");
  const s = (colonne: string, i: number) => `<c r="${colonne}" t="s"><v>${i}</v></c>`;
  const n = (colonne: string, v: number) => `<c r="${colonne}"><v>${v}</v></c>`;
  const xml = feuille(
    [
      `<row r="1"><c r="C1" s="3"/></row>`,
      `<row r="2">${s("C2", 0)}<c r="D2" s="3"/><c r="E2" s="3"/>${s("H2", 1)}</row>`,
      `<row r="3"/>`,
      `<row r="4">${s("B4", 2)}${s("C4", 3)}${s("D4", 4)}${s("E4", 5)}${s("H4", 3)}</row>`,
      `<row r="5">${s("B5", 6)}${n("C5", 1)}<c r="D5" s="3"/>${n("E5", 5)}${n("H5", 2)}</row>`,
      `<row r="6">${s("B6", 7)}${n("D6", 3)}</row>`,
      `<row r="7"/>`,
      `<row r="8"><c r="A8" t="inlineStr"><is><t>wap : MODELE-FICTIF-A1</t></is></c></row>`,
      `<row r="9"><c r="A9" t="inlineStr"><is><t>cap : MODELE-FICTIF-B2</t></is></c></row>`,
      `<row r="10">${s("A10", 8)}${n("C10", 45.5)}</row>`,
    ].join(""),
    `<mergeCells count="2"><mergeCell ref="C2:G3"/><mergeCell ref="H2:M3"/></mergeCells>`,
  );

  it("donne la grille attendue, ligne par ligne", () => {
    expect(grille(classeur([{ nom: "Inventaire", xml }], chaines)).split("\n")).toEqual([
      "Feuille « Inventaire »",
      "Cellules fusionnées : C2:G3, H2:M3",
      "L2: C=Neuf, quantité | H=Usagé, quantité",
      "L4: B=Lieu | C=wap | D=cap | E=Omni | H=wap",
      "L5: B=Port-Fictif | C=1 | E=5 | H=2",
      "L6: B=Val-Exemple | D=3",
      "L8: A=wap : MODELE-FICTIF-A1",
      "L9: A=cap : MODELE-FICTIF-B2",
      "L10: A=Prix demandé | C=45.5",
    ]);
  });

  it("lit aussi un classeur à entrées stockées", () => {
    const feuilles = lireXlsx(classeur([{ nom: "Inventaire", xml }], chaines, {}, true));
    expect(feuilles?.[0].rangees).toHaveLength(7);
  });
});

describe("lireXlsx : feuilles", () => {
  const simple = feuille(`<row r="1"><c r="A1"><v>1</v></c></row>`);

  it("ignore les feuilles masquées, dans l'ordre du classeur", () => {
    const feuilles = lireXlsx(
      classeur([
        { nom: "Une", xml: simple },
        { nom: "Cachée", xml: simple, etat: "hidden" },
        { nom: "Très cachée", xml: simple, etat: "veryHidden" },
        { nom: "Deux", xml: simple, etat: "visible" },
      ]),
    );
    expect(feuilles?.map((f) => f.nom)).toEqual(["Une", "Deux"]);
  });

  it("suit une cible absolue", () => {
    const feuilles = lireXlsx(classeur([{ nom: "Une", xml: simple, cible: "/xl/worksheets/sheet1.xml" }]));
    expect(feuilles?.[0].rangees).toHaveLength(1);
  });

  it("lit 6 feuilles au plus", () => {
    const feuilles = Array.from({ length: 8 }, (_, i) => ({ nom: `F${i}`, xml: simple }));
    expect(lireXlsx(classeur(feuilles))).toHaveLength(LIMITES_LECTURE.feuilles);
  });

  it("n'expose pas les métadonnées du classeur", () => {
    const octets = classeur([{ nom: "Une", xml: simple }], undefined, {
      "docProps/core.xml": "<cp><dc:creator>Marie Tremblay</dc:creator></cp>",
    });
    expect(grille(octets)).not.toContain("Marie");
  });

  it("décode le nom de la feuille", () => {
    expect(lireXlsx(classeur([{ nom: "A&amp;B", xml: simple }]))?.[0].nom).toBe("A&B");
  });
});

describe("lireXlsx : cellules et rangées", () => {
  function cellules(chaines: string | undefined, contenu: string): string[] {
    const feuilles = lireXlsx(classeur([{ nom: "F", xml: feuille(contenu) }], chaines));
    return feuilles?.[0].rangees.flatMap((r) => r.cellules.map((c) => `${r.numero}${c.colonne}=${c.valeur}`)) ?? [];
  }

  it("concatène le texte riche sans la phonétique", () => {
    const si = `<si><r><rPr><b/></rPr><t>Del</t></r><r><t xml:space="preserve">l </t></r><t>Wyse</t><rPh sb="0" eb="1"><t>デル</t></rPh></si>`;
    expect(cellules(si, `<row r="1"><c r="A1" t="s"><v>0</v></c></row>`)).toEqual(["1A=Dell Wyse"]);
  });

  it("lit une chaîne en ligne et une formule texte", () => {
    const contenu = `<row r="1"><c r="A1" t="inlineStr"><is><t>Écran</t></is></c><c r="B1" t="str"><f>A1</f><v>Écran 2</v></c></row>`;
    expect(cellules(undefined, contenu)).toEqual(["1A=Écran", "1B=Écran 2"]);
  });

  it("ignore les booléens et les erreurs", () => {
    const contenu = `<row r="1"><c r="A1" t="b"><v>1</v></c><c r="B1" t="e"><v>#REF!</v></c><c r="C1"><v>7</v></c></row>`;
    expect(cellules(undefined, contenu)).toEqual(["1C=7"]);
  });

  it("décode les entités une seule fois, et _x000D_", () => {
    const si = `<si><t>AT&amp;T &lt;5G&gt; &quot;é&#233;&#xE9;&apos; &amp;lt; a&#10;b_x000D_c</t></si>`;
    expect(cellules(si, `<row r="1"><c r="A1" t="s"><v>0</v></c></row>`)).toEqual([`1A=AT&T <5G> "ééé' &lt; a b c`]);
  });

  it("ne confond pas <row/> et <c/> auto-fermés avec le suivant", () => {
    const contenu = `<row r="1"/><row r="2"><c r="A2" s="1"/><c r="B2"><v>2</v></c></row><row r="3" spans="1:2"/><row r="4"><c r="A4"><v>4</v></c></row>`;
    expect(cellules(undefined, contenu)).toEqual(["2B=2", "4A=4"]);
  });

  it("déduit la colonne et la rangée quand `r` est absent", () => {
    const contenu = `<row><c><v>1</v></c><c><v>2</v></c></row><row><c/><c><v>3</v></c></row>`;
    expect(cellules(undefined, contenu)).toEqual(["1A=1", "1B=2", "2B=3"]);
  });

  it("ignore un index de chaîne invalide", () => {
    expect(cellules("<si><t>a</t></si>", `<row r="1"><c r="A1" t="s"><v>9</v></c><c r="B1" t="s"><v/></c></row>`)).toEqual([]);
  });

  it("ignore les rangées et colonnes masquées", () => {
    const xml = `<worksheet><cols><col min="2" max="3" hidden="1"/><col min="4" max="4" width="9"/></cols><sheetData><row r="1"><c r="A1"><v>1</v></c><c r="B1"><v>2</v></c><c r="C1"><v>3</v></c><c r="D1"><v>4</v></c></row><row r="2" hidden="1"><c r="A2"><v>5</v></c></row></sheetData></worksheet>`;
    const feuilles = lireXlsx(classeur([{ nom: "F", xml }]));
    expect(feuilles?.[0].rangees).toEqual([
      { numero: 1, cellules: [{ colonne: "A", valeur: "1" }, { colonne: "D", valeur: "4" }] },
    ]);
  });

  it("comprend les balises à préfixe", () => {
    const xml = `<x:worksheet><x:sheetData><x:row r="1"><x:c r="A1" t="inlineStr"><x:is><x:t>Écran</x:t></x:is></x:c></x:row></x:sheetData></x:worksheet>`;
    expect(lireXlsx(classeur([{ nom: "F", xml }]))?.[0].rangees[0].cellules).toEqual([{ colonne: "A", valeur: "Écran" }]);
  });

  it("borne la cellule, les colonnes et les rangées", () => {
    const longue = `<c r="A1" t="inlineStr"><is><t>  ${"x".repeat(500)}  </t></is></c>`;
    const loin = `<c r="AN1"><v>40</v></c><c r="AO1"><v>41</v></c>`;
    const rangees = Array.from({ length: LIMITES_LECTURE.rangees + 5 }, (_, i) => `<row r="${i + 2}"><c r="A${i + 2}"><v>${i}</v></c></row>`);
    const feuilles = lireXlsx(classeur([{ nom: "F", xml: feuille(`<row r="1">${longue}${loin}</row>${rangees.join("")}`) }]));
    const [premiere] = feuilles?.[0].rangees ?? [];
    expect(premiere.cellules.map((c) => c.colonne)).toEqual(["A", "AN"]);
    expect(premiere.cellules[0].valeur).toHaveLength(LIMITES_LECTURE.cellule);
    expect(feuilles?.[0].rangees).toHaveLength(LIMITES_LECTURE.rangees);
  });
});

describe("lireXlsx : fichiers malformés ou piégés", () => {
  const bon = () => classeur([{ nom: "F", xml: feuille(`<row r="1"><c r="A1"><v>1</v></c></row>`) }]);

  it("rend null pour une archive tronquée", () => {
    const o = bon();
    expect(lireXlsx(o.slice(0, o.length - 30))).toBeNull();
    expect(lireXlsx(o.slice(0, 20))).toBeNull();
    expect(lireXlsx(new Uint8Array())).toBeNull();
  });

  it("rend null pour autre chose qu'une archive", () => {
    expect(lireXlsx(texteOctets.encode("pas un classeur"))).toBeNull();
  });

  it("rend null sans classeur ni relations", () => {
    expect(lireXlsx(zip({ "a.txt": "a" }))).toBeNull();
    expect(lireXlsx(zip({ "xl/workbook.xml": "<workbook/>" }))).toBeNull();
  });

  it("rend null si le décalage d'une entrée sort du fichier", () => {
    const o = bon();
    const vue = new DataView(o.buffer, o.byteOffset);
    // Champ « décalage » de chaque entrée du répertoire central : hors du fichier.
    let p = vue.getUint32(o.length - 22 + 16, true);
    for (const e of repertoireZip(o) ?? []) {
      vue.setUint32(p + 42, o.length + 100, true);
      p += 46 + e.nom.length;
    }
    expect(lireXlsx(o)).toBeNull();
  });

  it("rend null si l'en-tête local annonce un nom qui déborde", () => {
    const o = zip({ "xl/workbook.xml": "<workbook/>", "xl/_rels/workbook.xml.rels": "<Relationships/>" });
    new DataView(o.buffer, o.byteOffset).setUint16(26, 0xffff, true);
    expect(lireXlsx(o)).toBeNull();
  });

  it("rend null si le flux compressé est corrompu", () => {
    const o = zip({ "xl/workbook.xml": "<workbook/>".repeat(50), "xl/_rels/workbook.xml.rels": "<Relationships/>" });
    const debut = 30 + "xl/workbook.xml".length;
    o.fill(0xff, debut, debut + 10);
    expect(lireXlsx(o)).toBeNull();
  });

  it("rend null pour une bombe de décompression, sans plantage", () => {
    const bombe = new Uint8Array(40 * 1024 * 1024);
    const o = classeur([{ nom: "F", xml: bombe }]);
    expect(o.length).toBeLessThan(200 * 1024);
    expect(lireXlsx(o)).toBeNull();
  });

  it("rend null quand le total décompressé dépasse le plafond", () => {
    const lourde = new Uint8Array(25 * 1024 * 1024).fill(0x20);
    const feuilles = [0, 1, 2].map((i) => ({ nom: `F${i}`, xml: lourde }));
    expect(lireXlsx(classeur(feuilles))).toBeNull();
  });

  it("rend null au-delà de 2 000 entrées", () => {
    const fichiers: Fichiers = {};
    for (let i = 0; i < LIMITES_LECTURE.entrees + 1; i++) fichiers[`x/${i}`] = "";
    expect(lireXlsx(zip(fichiers))).toBeNull();
  });

  it("passe vite sur des balises jamais fermées", () => {
    const debut = performance.now();
    const feuilles = lireXlsx(classeur([{ nom: "F", xml: `<worksheet><sheetData>${"<row><c>".repeat(500_000)}</sheetData></worksheet>` }]));
    expect(feuilles?.[0].rangees).toEqual([]);
    expect(performance.now() - debut).toBeLessThan(3_000);
  });
});

describe("lireCsv", () => {
  const ligne = (feuilles: Feuille[], i: number) => feuilles[0].rangees[i].cellules.map((c) => `${c.colonne}=${c.valeur}`);

  it("lit un CSV « ; » en Windows-1252", () => {
    // « Modèle;Qté » puis « Écran 24 po;3 », octets Windows-1252.
    const octets = Uint8Array.from([0x4d, 0x6f, 0x64, 0xe8, 0x6c, 0x65, 0x3b, 0x51, 0x74, 0xe9, 0x0d, 0x0a, 0xc9, 0x63, 0x72, 0x61, 0x6e, 0x20, 0x32, 0x34, 0x20, 0x70, 0x6f, 0x3b, 0x33, 0x0d, 0x0a]);
    const feuilles = lireCsv(octets);
    expect(ligne(feuilles, 0)).toEqual(["A=Modèle", "B=Qté"]);
    expect(ligne(feuilles, 1)).toEqual(["A=Écran 24 po", "B=3"]);
    expect(feuilles[0].rangees[1].numero).toBe(2);
  });

  it("retire le BOM UTF-8", () => {
    const feuilles = lireCsv(texteOctets.encode("﻿Écran,Qté\n"));
    expect(ligne(feuilles, 0)).toEqual(["A=Écran", "B=Qté"]);
  });

  it("gère les guillemets, les guillemets doublés et les sauts de ligne", () => {
    const feuilles = lireCsv(texteOctets.encode(`"Dell, Latitude","Écran ""24"""\n"ligne\nsuite",2\n`));
    expect(ligne(feuilles, 0)).toEqual(["A=Dell, Latitude", `B=Écran "24"`]);
    expect(ligne(feuilles, 1)).toEqual(["A=ligne suite", "B=2"]);
  });

  it("devine la tabulation", () => {
    expect(ligne(lireCsv(texteOctets.encode("a\tb,c\nd\te\n")), 0)).toEqual(["A=a", "B=b,c"]);
  });

  it("préfère « ; » aux virgules décimales", () => {
    expect(ligne(lireCsv(texteOctets.encode("1,5;2,5\n3,5;4,5\n")), 0)).toEqual(["A=1,5", "B=2,5"]);
  });

  it("ne compte pas un séparateur entre guillemets", () => {
    expect(ligne(lireCsv(texteOctets.encode(`"a;b;c",d\n"e;f",g\n`)), 0)).toEqual(["A=a;b;c", "B=d"]);
  });

  it("suit la ligne sep= d'Excel, et garde le numéro de ligne", () => {
    const feuilles = lireCsv(texteOctets.encode("sep=;\na,b;c\n"));
    expect(ligne(feuilles, 0)).toEqual(["A=a,b", "B=c"]);
    expect(feuilles[0].rangees[0].numero).toBe(2);
  });

  it("garde les cases vides dans la numérotation des colonnes", () => {
    expect(ligne(lireCsv(texteOctets.encode(";;x\n")), 0)).toEqual(["C=x"]);
  });

  it("lit la dernière ligne sans saut de ligne et ignore les lignes vides", () => {
    const feuilles = lireCsv(texteOctets.encode("a;b\n\n;\nc;d"));
    expect(feuilles[0].rangees.map((r) => r.numero)).toEqual([1, 4]);
  });

  it("ne rend rien pour un fichier vide", () => {
    expect(lireCsv(texteOctets.encode(" \n"))).toEqual([]);
  });

  it("borne les rangées et la cellule", () => {
    const long = `${"x".repeat(500)}\n`.repeat(LIMITES_LECTURE.rangees + 3);
    const feuilles = lireCsv(texteOctets.encode(long));
    expect(feuilles[0].rangees).toHaveLength(LIMITES_LECTURE.rangees);
    expect(feuilles[0].rangees[0].cellules[0].valeur).toHaveLength(LIMITES_LECTURE.cellule);
  });
});

describe("feuillesEnTexte : colonnes privées", () => {
  it("retire une colonne privée de toute la feuille", () => {
    const { texte } = feuillesEnTexte(
      fauxTexte("Modèle|Utilisateur|Lieu|N° de série\nDell 5400|Marie Tremblay|Port-Fictif|ABC123\nDell 5410|Luc Gagnon|Val-Exemple|DEF456"),
    );
    expect(texte.split("\n")).toEqual([
      "Feuille « Test »",
      "L1: A=Modèle | C=Lieu",
      "L2: A=Dell 5400 | C=Port-Fictif",
      "L3: A=Dell 5410 | C=Val-Exemple",
    ]);
  });

  it.each([
    "Utilisateur",
    "Usager",
    "User",
    "Employé",
    "Assigné à",
    "Propriétaire",
    "Owner",
    "Responsable",
    "Courriel",
    "E-mail",
    "Email",
    "Adresse",
    "Adresse IP",
    "Adresse MAC",
    "Address",
    "Numéro de série",
    "N° de série",
    "no de série",
    "Serial",
    "Serial number",
    "S/N",
    "SN",
    "IMEI",
    "MAC",
    "IP",
    "Hostname",
    "Nom d'hôte",
    "Nom de l’ordinateur",
    "Computer name",
    "N° d'inventaire",
    "Numéro d'inventaire",
    "Asset",
    "Asset tag",
    "Asset ID",
    "Asset #",
    "Tag",
    "Tags",
    "Code-barres",
    "Barcode",
  ])("retire « %s »", (entete) => {
    const { texte } = feuillesEnTexte(fauxTexte(`Modèle|Lieu|${entete}\nDell|Port-Fictif|secret`));
    expect(texte).not.toContain("secret");
    expect(texte).toContain("A=Dell | B=Port-Fictif");
  });

  it.each([
    "Nom",
    "Modèle",
    "Description",
    "Lieu",
    "Marque",
    "Usagé, quantité",
    "Machine",
    "Snapdragon",
    "Stage",
    "Série",
    "Asset Type",
    "Asset Model",
    "Asset Description",
    "Mac mini",
    "IP Phone",
    "Tag type",
  ])(
    "garde « %s »",
    (entete) => {
      const { texte } = feuillesEnTexte(fauxTexte(`Quantité|État|${entete}\n1|neuf|valeur`));
      expect(texte).toContain("C=valeur");
    },
  );

  it("garde les quantités et le matériel d'un vrai export d'inventaire", () => {
    const csv = [
      "Asset Tag;Asset Type;Asset Model;Serial;Employé;Téléphones;IP Phone",
      "A1;Portable;Latitude 5410;S1;Marie;2;1",
      "A2;Portable;Latitude 5410;S2;Paul;2;1",
      "A3;Écran;P2419H;S3;Luc;1;0",
    ].join("\n");
    expect(feuillesEnTexte(lireCsv(texteOctets.encode(csv))).texte.split("\n")).toEqual([
      "Feuille « Données »",
      "L1: B=Asset Type | C=Asset Model | F=Téléphones | G=IP Phone",
      "L2 (× 2): B=Portable | C=Latitude 5410 | F=2 | G=1",
      "L4: B=Écran | C=P2419H | F=1 | G=0",
    ]);
  });

  it("retire « Téléphone » si ses valeurs sont des numéros", () => {
    const { texte } = feuillesEnTexte(fauxTexte("Modèle|Lieu|Téléphone\nDell|Port-Fictif|514-555-0123\nHP|Val-Exemple|(514) 555-0199"));
    expect(texte).not.toContain("555");
    expect(texte).toContain("L2: A=Dell | B=Port-Fictif");
  });

  it("garde « Téléphone » s'il liste des appareils", () => {
    const { texte } = feuillesEnTexte(fauxTexte("Modèle|Lieu|Téléphone\nDell|Port-Fictif|iPhone 12\nHP|Val-Exemple|iPhone 13"));
    expect(texte).toContain("C=iPhone 12");
  });

  it("retire « Téléphone » dès que la moitié des valeurs sont des numéros", () => {
    const { texte } = feuillesEnTexte(fauxTexte("Modèle|Lieu|Tél\nDell|Port-Fictif|514-555-0123\nHP|Val-Exemple|poste 12"));
    expect(texte).not.toContain("poste 12");
  });

  it("retire « Mac » seul, garde « Mac mini »", () => {
    const seul = feuillesEnTexte(fauxTexte("Modèle|Lieu|Mac\nDell|Port-Fictif|00:1A:2B:3C:4D:5E")).texte;
    expect(seul).not.toContain("00:1A");
    const mini = feuillesEnTexte(fauxTexte("Modèle|Lieu|Mac mini\nDell|Port-Fictif|A2348")).texte;
    expect(mini).toContain("C=A2348");
  });

  it("garde une colonne de quantités, quel que soit son en-tête", () => {
    const lignes = "Modèle|Lieu|Employés|Serial\nDell|Port-Fictif|12|4\nHP|Val-Exemple|7|2\nLenovo|Lac-Exemple|120|1\nAsus|Mont-Fictif|3|6\nAcer|Pont-Exemple|15|8";
    const { texte } = feuillesEnTexte(fauxTexte(lignes));
    expect(texte).toContain("L2: A=Dell | B=Port-Fictif | C=12 | D=4");
  });

  it("retire une colonne privée si moins de 80 % des valeurs sont des quantités", () => {
    const lignes = "Modèle|Lieu|Employé\nDell|Port-Fictif|12\nHP|Val-Exemple|Marie\nLenovo|Lac-Exemple|7\nAsus|Mont-Fictif|Paul";
    expect(feuillesEnTexte(fauxTexte(lignes)).texte).not.toContain("Marie");
  });

  it("ne prend pas un nombre de plus de 5 chiffres pour une quantité", () => {
    const { texte } = feuillesEnTexte(fauxTexte("Modèle|Lieu|Serial\nDell|Port-Fictif|123456\nHP|Val-Exemple|123457"));
    expect(texte).not.toContain("123456");
  });

  it("ne cherche l'en-tête que dans les 20 premières rangées", () => {
    const debut = Array.from({ length: 20 }, (_, i) => `rangée ${i}`).join("\n");
    const { texte } = feuillesEnTexte(fauxTexte(`${debut}\nModèle|Lieu|Courriel\nDell|Port-Fictif|gardé`));
    expect(texte).toContain("C=gardé");
  });

  it("retire la rangée qui ne contenait que du privé", () => {
    const { texte } = feuillesEnTexte([
      {
        nom: "Test",
        fusions: [],
        rangees: [
          { numero: 1, cellules: [{ colonne: "A", valeur: "Modèle" }, { colonne: "B", valeur: "Lieu" }, { colonne: "C", valeur: "Courriel" }] },
          { numero: 2, cellules: [{ colonne: "C", valeur: "secret" }] },
        ],
      },
    ]);
    expect(texte.split("\n")).toEqual(["Feuille « Test »", "L1: A=Modèle | B=Lieu"]);
  });
});

describe("feuillesEnTexte : regroupement et troncature", () => {
  it("regroupe les rangées identiques sous l'en-tête", () => {
    const lignes = ["Marque|Modèle|État", ...Array(57).fill("Dell|Latitude 5410|usagé"), "HP|840 G5|usagé", "Dell|Latitude 5410|usagé"];
    expect(feuillesEnTexte(fauxTexte(lignes.join("\n"))).texte.split("\n")).toEqual([
      "Feuille « Test »",
      "L1: A=Marque | B=Modèle | C=État",
      "L2 (× 58): A=Dell | B=Latitude 5410 | C=usagé",
      "L59: A=HP | B=840 G5 | C=usagé",
    ]);
  });

  it("regroupe après le retrait des colonnes privées", () => {
    const texte = "Modèle|Lieu|Serial\nDell|Port-Fictif|S1\nDell|Port-Fictif|S2";
    expect(feuillesEnTexte(fauxTexte(texte)).texte).toContain("L2 (× 2): A=Dell | B=Port-Fictif");
  });

  it("ne regroupe pas au-dessus de l'en-tête ni sans en-tête", () => {
    const avecEntete = feuillesEnTexte(fauxTexte("Titre\nTitre\nMarque|Modèle|État\nDell|5400|neuf")).texte;
    expect(avecEntete).toContain("L1: A=Titre\nL2: A=Titre\n");
    const sansEntete = feuillesEnTexte(fauxTexte("a|1\na|1")).texte;
    expect(sansEntete).toContain("L1: A=a | B=1\nL2: A=a | B=1");
  });

  it("sépare les feuilles et saute celles qui sont vides", () => {
    const [une] = fauxTexte("a|1");
    const texte = feuillesEnTexte([une, { nom: "Vide", fusions: [], rangees: [] }, { ...une, nom: "Deux" }]).texte;
    expect(texte).toBe("Feuille « Test »\nL1: A=a | B=1\n\nFeuille « Deux »\nL1: A=a | B=1");
  });

  it("coupe à la fin d'une rangée et le dit", () => {
    const lignes = Array.from({ length: 100 }, (_, i) => `Dell ${i}|${i}`);
    const { texte, tronque } = feuillesEnTexte(fauxTexte(lignes.join("\n")), 200);
    expect(tronque).toBe(true);
    expect(texte.length).toBeLessThanOrEqual(200);
    const fin = texte.split("\n");
    expect(fin[fin.length - 1]).toBe("(fichier tronqué)");
    expect(fin[fin.length - 2]).toMatch(/^L\d+: A=Dell \d+ \| B=\d+$/);
  });

  it("ne tronque pas ce qui tient", () => {
    expect(feuillesEnTexte(fauxTexte("a|1"))).toEqual({ texte: "Feuille « Test »\nL1: A=a | B=1", tronque: false });
  });
});

describe("coupures de lecture", () => {
  const rangeesDifferentes = (n: number) =>
    Array.from({ length: n }, (_, i) => `<row r="${i + 1}"><c r="A${i + 1}"><v>${i}</v></c></row>`).join("");
  const AMPLE = 1_000_000;

  it("signale un classeur coupé à 5 000 rangées", () => {
    const feuilles = lireXlsx(classeur([{ nom: "F", xml: feuille(rangeesDifferentes(5_001)) }])) ?? [];
    expect(feuilles[0].coupee).toBe(true);
    expect(feuilles[0].rangees).toHaveLength(LIMITES_LECTURE.rangees);
    const { texte, tronque } = feuillesEnTexte(feuilles, AMPLE);
    expect(tronque).toBe(true);
    expect(texte.endsWith("L5000: A=4999\n(fichier tronqué)")).toBe(true);
  });

  it("ne signale rien à exactement 5 000 rangées", () => {
    const feuilles = lireXlsx(classeur([{ nom: "F", xml: feuille(rangeesDifferentes(5_000)) }])) ?? [];
    expect(feuilles[0].coupee).toBeUndefined();
    expect(feuillesEnTexte(feuilles, AMPLE).tronque).toBe(false);
  });

  it("signale un CSV coupé à 5 000 rangées", () => {
    const lignes = (n: number) => Array.from({ length: n }, (_, i) => `a${i};${i}`).join("\n");
    const coupe = lireCsv(texteOctets.encode(lignes(5_001)));
    expect(coupe[0].coupee).toBe(true);
    expect(coupe[0].rangees).toHaveLength(LIMITES_LECTURE.rangees);
    const { texte, tronque } = feuillesEnTexte(coupe, AMPLE);
    expect(tronque).toBe(true);
    expect(texte.endsWith("(fichier tronqué)")).toBe(true);
    const entier = lireCsv(texteOctets.encode(`${lignes(5_000)}\n`));
    expect(entier[0].coupee).toBeUndefined();
    expect(feuillesEnTexte(entier, AMPLE).tronque).toBe(false);
  });

  it("signale un classeur de 7 feuilles visibles sur la dernière gardée", () => {
    const simple = feuille(`<row r="1"><c r="A1"><v>1</v></c></row>`);
    const liste = Array.from({ length: 7 }, (_, i) => ({ nom: `F${i + 1}`, xml: simple }));
    const feuilles = lireXlsx(classeur(liste)) ?? [];
    expect(feuilles.map((f) => f.coupee)).toEqual([undefined, undefined, undefined, undefined, undefined, true]);
    const { texte, tronque } = feuillesEnTexte(feuilles);
    expect(tronque).toBe(true);
    expect(texte.endsWith("Feuille « F6 »\nL1: A=1\n(fichier tronqué)")).toBe(true);
  });

  it("ne compte pas les feuilles masquées dans le plafond", () => {
    const simple = feuille(`<row r="1"><c r="A1"><v>1</v></c></row>`);
    const liste = Array.from({ length: 7 }, (_, i) => ({ nom: `F${i + 1}`, xml: simple, etat: i === 0 ? "hidden" : undefined }));
    const feuilles = lireXlsx(classeur(liste)) ?? [];
    expect(feuilles).toHaveLength(6);
    expect(feuilles.some((f) => f.coupee)).toBe(false);
  });

  it("n'écrit qu'une note et respecte `max` quand une feuille coupée précède la limite", () => {
    const [une] = fauxTexte("a|1");
    const { texte, tronque } = feuillesEnTexte(
      [{ ...une, coupee: true }, { ...une, nom: "Deux" }],
      "Feuille « Test »\nL1: A=a | B=1\n(fichier tronqué)".length + 1,
    );
    expect(tronque).toBe(true);
    expect(texte).toBe("Feuille « Test »\nL1: A=a | B=1\n(fichier tronqué)");
  });
});
