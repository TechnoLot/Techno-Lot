import { describe, expect, it } from "vitest";
import {
  articlesDeDepart,
  classerPieces,
  construireDemandeLecture,
  echecPerime,
  lectureEnCours,
  lireArticlesLus,
  lirePiecesLues,
  lireReponseLecture,
  resumeFichiers,
  rolePiece,
  texteDuClient,
  versArticle,
} from "@/lib/acheteurs/pieces";
import { LIMITES, LIMITES_LECTURE, type ArticleLu, type LectureSoumission, type RechercheAcheteurs } from "@/lib/acheteurs/types";
import type { PieceJointe } from "@/lib/admin/courriel-types";

/*
 * Lecture des pièces jointes : classement, demande à Claude, lecture de sa
 * réponse (NON FIABLE). Toutes les données sont fictives.
 */

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function piece(nom: string, type = "application/octet-stream"): PieceJointe {
  return { id: `id-${nom}`, nom, type, taille: 1000 };
}

function article(a: Partial<ArticleLu> = {}): ArticleLu {
  return { quantite: 4, description: "Dell Latitude 5400", etat: null, verification: "non_vu", remarque: null, photos: [], ...a };
}

function lecture(l: Partial<LectureSoumission> = {}): LectureSoumission {
  return {
    id: "l1",
    soumission_id: "s1",
    statut: "lue",
    articles: [],
    articles_ignores: 0,
    pieces: [],
    erreur: null,
    demande_le: "2026-11-04T10:00:00Z",
    pris_le: null,
    lue_le: "2026-11-04T10:05:00Z",
    ...l,
  };
}

function recherche(r: Partial<RechercheAcheteurs> = {}): RechercheAcheteurs {
  return {
    id: "r1",
    soumission_id: "s1",
    statut: "en_attente",
    articles: [{ quantite: 2, description: "Cisco Meraki MR57" }],
    exclus: 0,
    resultats: null,
    lignes_refusees: 0,
    erreur: null,
    demande_le: "2026-11-04T09:00:00Z",
    pris_le: null,
    resultats_le: null,
    ...r,
  };
}

describe("rolePiece", () => {
  it.each([
    ["Stock.xlsx", XLSX, "tableur"],
    ["liste.csv", "text/csv", "tableur"],
    ["liste.CSV", "application/vnd.ms-excel", "tableur"],
    ["liste.pdf", "application/pdf", "pdf"],
    ["a.jpg", "image/jpeg", "photo"],
    ["a.jpeg", "image/jpeg", "photo"],
    ["a.png", "image/png", "photo"],
    ["a.webp", "image/webp", "photo"],
    ["a.gif", "image/gif", "photo"],
    ["a.tiff", "image/tiff", "photo"],
    ["a.tif", "image/tiff", "photo"],
    ["a.avif", "image/avif", "photo"],
    ["sans-extension", "image/jpeg; name=a", "photo"],
    ["sans-extension", "APPLICATION/PDF", "pdf"],
  ])("%s (%s) → %s", (nom, type, role) => {
    expect(rolePiece(nom, type)).toEqual({ role, raison: null });
  });

  it("explique ce qui n'est pas lu", () => {
    expect(rolePiece("a.heic", "image/heic")).toEqual({ role: "aucun", raison: "Photo HEIC : à regarder vous-même" });
    expect(rolePiece("a.heif", "")).toEqual({ role: "aucun", raison: "Photo HEIC : à regarder vous-même" });
    expect(rolePiece("sans", "image/heic").raison).toBe("Photo HEIC : à regarder vous-même");
    expect(rolePiece("a.bmp", "image/bmp")).toEqual({ role: "aucun", raison: "Format de photo non lu : à regarder vous-même" });
    expect(rolePiece("a.xls", "application/vnd.ms-excel")).toEqual({ role: "aucun", raison: "Ancien format Excel (.xls) : à ouvrir vous-même" });
    expect(rolePiece("a.docx", "application/msword")).toEqual({ role: "aucun", raison: "Format non lu" });
  });
});

describe("classerPieces", () => {
  it("numérote les photos seulement", () => {
    const pieces = classerPieces([piece("a.xlsx", XLSX), piece("1.jpg"), piece("b.heic"), piece("2.png"), piece("c.pdf")]);
    expect(pieces.map((p) => [p.nom, p.role, p.numero, p.lu])).toEqual([
      ["a.xlsx", "tableur", null, false],
      ["1.jpg", "photo", 1, false],
      ["b.heic", "aucun", null, false],
      ["2.png", "photo", 2, false],
      ["c.pdf", "pdf", null, false],
    ]);
    expect(pieces[0].pieceId).toBe("id-a.xlsx");
    expect(pieces[0].type).toBe(XLSX);
  });

  it("met de côté ce qui dépasse 10 photos ou 5 documents", () => {
    const photos = Array.from({ length: LIMITES_LECTURE.photos + 2 }, (_, i) => piece(`${i}.jpg`));
    const documents = ["a.xlsx", "b.csv", "c.pdf", "d.pdf", "e.pdf", "f.pdf"].map((n) => piece(n));
    const pieces = classerPieces([...photos, ...documents]);
    expect(pieces.filter((p) => p.role === "photo")).toHaveLength(10);
    expect(pieces.filter((p) => p.role === "tableur" || p.role === "pdf")).toHaveLength(5);
    const refusees = pieces.filter((p) => p.raison === "Trop de pièces : à ouvrir vous-même");
    expect(refusees.map((p) => p.nom)).toEqual(["10.jpg", "11.jpg", "f.pdf"]);
    expect(refusees.every((p) => p.role === "aucun" && p.numero === null)).toBe(true);
  });
});

describe("texteDuClient", () => {
  it("retire les en-têtes et le libellé, garde le reste", () => {
    const message =
      "Entreprise : Usine Exemple\nVille : Laval\nNom : Marie\nCourriel : m@exemple.example\nTéléphone : 514-555-0123\nMatériel : Portables\n\nDescription :\nVoir les fichiers joints.";
    expect(texteDuClient(message)).toBe("Matériel : Portables\n\nVoir les fichiers joints.");
  });

  it("garde le texte écrit sur la ligne du libellé", () => {
    expect(texteDuClient("Description : 3 écrans")).toBe("3 écrans");
  });

  it("donne une chaîne vide sans message", () => {
    expect(texteDuClient(null)).toBe("");
  });
});

describe("construireDemandeLecture", () => {
  const demande = construireDemandeLecture({
    message: "Voir les fichiers.",
    tableaux: [{ numero: 1, texte: "Feuille « Inventaire »\nL2: C=Neuf" }],
    pdfs: [2],
    photos: 5,
  });

  it("garde les règles validées à l'essai", () => {
    expect(demande).toContain("Dresse la liste complète du matériel offert : un article par modèle ET par état");
    expect(demande).toContain("Une cellule fusionnée couvre toutes ses colonnes : elle s'applique à chacune.");
    expect(demande).toContain("3. Ignore les prix.");
    expect(demande).toContain("« [client] » remplace ce qui a été masqué.");
    expect(demande).toContain(`   - "doute" : une photo contredit ce qui est écrit`);
    expect(demande).toContain(`{"articles":[{"description":"","quantite":0,"etat":"neuf","verification":"confirme","remarque":"","photos":[1]}]}`);
    expect(demande).toContain(`« etat » : "neuf", "usage" ou null.`);
  });

  it("assemble message, tableaux, PDF et photos dans l'ordre", () => {
    expect(demande.endsWith(
      [
        "LE MESSAGE DU CLIENT",
        "Voir les fichiers.",
        "",
        "FICHIER 1 (cellules non vides, ligne par ligne)",
        "Feuille « Inventaire »",
        "L2: C=Neuf",
        "",
        "FICHIER 2 : le PDF joint plus bas.",
        "LES PHOTOS (5) : jointes plus bas, numérotées.",
      ].join("\n"),
    )).toBe(true);
  });

  it("écrit « (aucun message) » et n'ajoute rien de vide", () => {
    const seul = construireDemandeLecture({ message: "  ", tableaux: [], pdfs: [], photos: 0 });
    expect(seul.endsWith("LE MESSAGE DU CLIENT\n(aucun message)")).toBe(true);
    expect(seul).not.toContain("FICHIER 1");
    expect(seul).not.toContain("LES PHOTOS");
  });

  it("ne contient jamais de nom de fichier", () => {
    const noms = ["Inventaire Usine Exemple.xlsx", "offre-marie.pdf", "photo_entrepot_laval.jpg"];
    const pieces = classerPieces(noms.map((n) => piece(n)));
    const texte = construireDemandeLecture({
      message: "",
      tableaux: pieces.filter((p) => p.role === "tableur").map((_, i) => ({ numero: i + 1, texte: "L1: A=1" })),
      pdfs: pieces.filter((p) => p.role === "pdf").map((_, i) => i + 2),
      photos: pieces.filter((p) => p.role === "photo").length,
    });
    for (const nom of noms) expect(texte).not.toContain(nom);
    expect(texte).not.toMatch(/\.(?:xlsx|pdf|jpg)|Usine|marie|entrepot/i);
    expect(texte).toContain("FICHIER 2 : le PDF joint plus bas.");
    expect(texte).toContain("LES PHOTOS (1)");
  });
});

describe("lireReponseLecture", () => {
  function lire(a: unknown) {
    const r = lireReponseLecture(JSON.stringify({ articles: [a] }));
    if (!r.ok) throw new Error(r.erreur);
    return r;
  }

  it("lit une réponse complète, dans un bloc ```json", () => {
    const r = lireReponseLecture(
      'Voici :\n```json\n{"articles":[{"description":"Ruckus R650","quantite":12,"etat":"neuf","verification":"confirme","remarque":"","photos":[1,3]}]}\n```',
    );
    expect(r).toEqual({
      ok: true,
      ignores: 0,
      articles: [{ description: "Ruckus R650", quantite: 12, etat: "neuf", verification: "confirme", remarque: null, photos: [1, 3] }],
    });
  });

  it("accepte une liste vide", () => {
    expect(lireReponseLecture('{"articles":[]}')).toEqual({ ok: true, articles: [], ignores: 0 });
  });

  it.each(["", "pas de JSON", "{}", '{"articles":"non"}', "[1,2]", '{"articles":[}'])("refuse « %s »", (reponse) => {
    expect(lireReponseLecture(reponse)).toEqual({
      ok: false,
      erreur: "Claude n'a pas rendu la liste dans le format attendu. Relisez les pièces jointes.",
    });
  });

  it("refuse une réponse trop longue", () => {
    const r = lireReponseLecture(`{"articles":[]}${" ".repeat(LIMITES.reponse)}`);
    expect(r.ok).toBe(false);
  });

  it("retire les URL de la description", () => {
    expect(lire({ description: "Ruckus R650 https://piege.example/a?b=1 www.piege.example ok" }).articles[0].description).toBe("Ruckus R650 ok");
  });

  it("saute un article sans description, ou réduit à une URL, et le compte", () => {
    const r = lireReponseLecture(
      JSON.stringify({ articles: [{ description: "" }, { description: "http://piege.example" }, { quantite: 2 }, "texte", null, { description: "R650" }] }),
    );
    expect(r).toMatchObject({ ok: true, ignores: 5 });
    expect(r.ok && r.articles).toHaveLength(1);
  });

  it("borne la description et la remarque", () => {
    const a = lire({ description: "x".repeat(250), remarque: "y".repeat(280) }).articles[0];
    expect(a.description).toHaveLength(LIMITES_LECTURE.description);
    expect(a.remarque).toHaveLength(LIMITES_LECTURE.remarque);
  });

  it.each([
    [12, 12],
    [0, 0],
    ["57", 57],
    ["1 200", 1200],
    [10_000_000, 10_000_000],
    [10_000_001, null],
    [-1, null],
    [1.5, null],
    ["environ 5", null],
    ["  ", null],
    [null, null],
    [true, null],
  ])("quantité %j → %j", (quantite, attendu) => {
    expect(lire({ description: "R650", quantite }).articles[0].quantite).toBe(attendu);
  });

  it.each([
    ["neuf", "neuf"],
    ["Neuf en boîte", "neuf"],
    ["new", "neuf"],
    ["usage", "usage"],
    ["Usagé", "usage"],
    ["used", "usage"],
    ["reconditionné", null],
    [null, null],
    [3, null],
  ])("état %j → %j", (etat, attendu) => {
    expect(lire({ description: "R650", etat }).articles[0].etat).toBe(attendu);
  });

  it("met une vérification inconnue en doute", () => {
    expect(lire({ description: "R650", verification: "sur" }).articles[0].verification).toBe("doute");
    expect(lire({ description: "R650" }).articles[0].verification).toBe("doute");
  });

  it("ne garde pas « confirme » sans photo", () => {
    expect(lire({ description: "R650", verification: "confirme", photos: [] }).articles[0].verification).toBe("non_vu");
    expect(lire({ description: "R650", verification: "confirme", photos: [0, "2"] }).articles[0].verification).toBe("non_vu");
  });

  it("garde des numéros de photo valides, uniques, 20 au plus", () => {
    const longue = Array.from({ length: 30 }, (_, i) => i + 1);
    expect(lire({ description: "R650", photos: [2, 2, 0, -1, 1.5, "3", 4] }).articles[0].photos).toEqual([2, 4]);
    expect(lire({ description: "R650", photos: longue }).articles[0].photos).toHaveLength(20);
    expect(lire({ description: "R650", photos: "1" }).articles[0].photos).toEqual([]);
  });

  it("compte les articles au-delà du plafond", () => {
    const articles = Array.from({ length: LIMITES.articles + 7 }, (_, i) => ({ description: `Article ${i}` }));
    const r = lireReponseLecture(JSON.stringify({ articles }));
    expect(r).toMatchObject({ ok: true, ignores: 7 });
    expect(r.ok && r.articles).toHaveLength(LIMITES.articles);
  });
});

describe("relecture du jsonb", () => {
  it("garde les articles valides, ignore les autres", () => {
    const bon = article({ etat: "usage", photos: [1], verification: "confirme" });
    expect(lireArticlesLus([bon, { description: "x" }, null, { ...bon, etat: "autre" }, { ...bon, photos: [0] }])).toEqual([bon]);
    expect(lireArticlesLus("non")).toEqual([]);
    expect(lireArticlesLus(null)).toEqual([]);
  });

  it("garde les pièces valides, ignore les autres", () => {
    const bonne = classerPieces([piece("1.jpg")])[0];
    expect(lirePiecesLues([bonne, { nom: "x" }, { ...bonne, role: "autre" }])).toEqual([bonne]);
    expect(lirePiecesLues(undefined)).toEqual([]);
  });
});

describe("versArticle", () => {
  it("ajoute l'état à la description", () => {
    expect(versArticle(article({ etat: "neuf" }))).toEqual({ quantite: 4, description: "Dell Latitude 5400 · neuf" });
    expect(versArticle(article({ etat: "usage" }))).toEqual({ quantite: 4, description: "Dell Latitude 5400 · usagé" });
    expect(versArticle(article({ quantite: null }))).toEqual({ quantite: null, description: "Dell Latitude 5400" });
  });
});

describe("resumeFichiers", () => {
  it.each([
    [["Stock.xlsx", "1.jpg", "2.jpg", "3.png", "4.heic", "5.jpeg"], "Stock.xlsx et 5 photos"],
    [["1.jpg", "2.jpg", "3.jpg"], "3 photos"],
    [["1.JPG"], "1 photo"],
    [["a.xlsx", "b.pdf", "1.jpg", "2.jpg"], "a.xlsx, b.pdf et 2 photos"],
    [["a.xlsx", "b.pdf", "c.csv", "1.jpg", "2.jpg"], "3 fichiers et 2 photos"],
    [["a.xlsx", "b.pdf", "c.csv"], "3 fichiers"],
    [["a.xlsx", "b.pdf"], "a.xlsx et b.pdf"],
    [["a.xlsx"], "a.xlsx"],
    [[], ""],
  ])("%j → « %s »", (noms, attendu) => {
    expect(resumeFichiers(noms)).toBe(attendu);
  });
});

describe("lectureEnCours", () => {
  it("vaut seulement pour une lecture en file ou prise", () => {
    expect(lectureEnCours(lecture({ statut: "en_attente" }))).toBe(true);
    expect(lectureEnCours(lecture({ statut: "en_cours" }))).toBe(true);
    expect(lectureEnCours(lecture({ statut: "lue" }))).toBe(false);
    expect(lectureEnCours(lecture({ statut: "echec" }))).toBe(false);
    expect(lectureEnCours(null)).toBe(false);
  });
});

describe("echecPerime", () => {
  const echec = recherche({ statut: "echec" });

  it("vaut pour un échec sans résultats, lancé avant la lecture", () => {
    expect(echecPerime(echec, lecture())).toBe(true);
  });

  it("ne vaut pas si la lecture est plus ancienne que la demande", () => {
    expect(echecPerime(echec, lecture({ lue_le: "2026-11-04T08:00:00Z" }))).toBe(false);
  });

  it("ne vaut pas avec des résultats, sans échec ou sans lecture", () => {
    expect(echecPerime({ ...echec, resultats: { familles: [], courriels: { fr: null, en: null } } }, lecture())).toBe(false);
    expect(echecPerime(recherche(), lecture())).toBe(false);
    expect(echecPerime(echec, null)).toBe(false);
    expect(echecPerime(null, lecture())).toBe(false);
    expect(echecPerime(echec, lecture({ statut: "en_cours", lue_le: null }))).toBe(false);
  });

  it("reste vrai pendant une relecture : la lecture réussie compte toujours", () => {
    expect(echecPerime(echec, lecture({ statut: "en_attente" }))).toBe(true);
    expect(echecPerime(echec, lecture({ statut: "echec" }))).toBe(true);
  });
});

describe("articlesDeDepart", () => {
  const description = "2 × Ruckus R650\nMarie, Usine Exemple";
  const mots = ["Marie", "Usine Exemple"];
  const confirme = article({ description: "Ubiquiti U6", etat: "neuf", verification: "confirme", photos: [1], remarque: "Vu sur la boîte" });
  const nonVu = article({ description: "Cisco 2960" });
  const doute = article({ description: "Marque inconnue", verification: "doute", remarque: "Le logo diffère" });
  const lue = lecture({ articles: [confirme, nonVu, doute] });

  it.each([
    ["en attente", recherche({ statut: "en_attente" })],
    ["en cours", recherche({ statut: "en_cours" })],
    ["avec résultats", recherche({ statut: "resultats", resultats: { familles: [], courriels: { fr: null, en: null } } })],
    ["en échec plus récent que la lecture", recherche({ statut: "echec", demande_le: "2026-11-04T11:00:00Z" })],
  ])("garde les articles d'une recherche %s", (_nom, r) => {
    expect(articlesDeDepart({ recherche: r, lecture: lue, description, mots })).toEqual({ articles: r.articles, doutes: [] });
  });

  it("préfère la lecture à un échec périmé", () => {
    const r = recherche({ statut: "echec" });
    const depart = articlesDeDepart({ recherche: r, lecture: lue, description, mots });
    expect(depart.doutes).toEqual([doute]);
    expect(depart.articles).toEqual([
      { quantite: 4, description: "Ubiquiti U6 · neuf", photo: true, remarque: "Vu sur la boîte" },
      { quantite: 4, description: "Cisco 2960", photo: false, remarque: null },
    ]);
  });

  it("prend la lecture quand la recherche n'a pas d'articles", () => {
    const depart = articlesDeDepart({ recherche: recherche({ articles: [] }), lecture: lue, description, mots });
    expect(depart.articles).toHaveLength(2);
  });

  it("revient à la description sans lecture utile, sans la signature", () => {
    const attendu = { articles: [{ quantite: 2, description: "Ruckus R650" }], doutes: [] };
    expect(articlesDeDepart({ recherche: null, lecture: null, description, mots })).toEqual(attendu);
    expect(articlesDeDepart({ recherche: null, lecture: lecture(), description, mots })).toEqual(attendu);
    expect(articlesDeDepart({ recherche: null, lecture: { ...lecture(), statut: "en_cours" }, description, mots })).toEqual(attendu);
  });

  it.each(["en_attente", "en_cours", "echec"] as const)("garde la dernière liste et ses doutes pendant une relecture (%s)", (statut) => {
    const depart = articlesDeDepart({ recherche: null, lecture: { ...lue, statut }, description, mots });
    expect(depart.articles).toHaveLength(2);
    expect(depart.doutes).toEqual([doute]);
  });

  it("ne ramène pas les articles d'un échec périmé pendant une relecture", () => {
    const depart = articlesDeDepart({
      recherche: recherche({ statut: "echec" }),
      lecture: { ...lue, statut: "en_attente" },
      description,
      mots,
    });
    expect(depart.doutes).toEqual([doute]);
  });
});
