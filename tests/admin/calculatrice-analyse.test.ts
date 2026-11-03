import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

/*
 * Analyseur de la calculatrice de lot (assets/outils/calculatrice-analyse.js) :
 * script classique de la page, exécuté ici dans un contexte isolé, comme dans
 * le navigateur.
 */

type Item = { desc: string; qte: number; cat: string; prix: number | null; explicite: boolean };
type Resultat = { items: Item[]; ignorees: string[]; titres: number };
type AnalyseLot = {
  analyserTexte(texte: string): Resultat;
  analyserSoumission(message: string): Resultat & { materiel: { nom: string; qte: number | null }[] };
  lireQuantite(texte: string): { qte: number; desc: string; explicite: boolean };
  lireMontant(v: unknown): number | null;
  requeteEbay(desc: string): string;
  lienEbay(desc: string): string;
};

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CODE = readFileSync(join(RACINE, "assets", "outils", "calculatrice-analyse.js"), "utf8");

function charger(): AnalyseLot {
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  return ctx.AnalyseLot as AnalyseLot;
}

const A = charger();

/** « 2 × Dell R740 [Serveurs] » : lecture rapide des résultats. */
function lignes(r: Resultat): string[] {
  return r.items.map((it) => `${it.qte} × ${it.desc}${it.cat ? ` [${it.cat}]` : ""}${it.prix != null ? ` = ${it.prix}` : ""}`);
}

describe("titres de section : une catégorie, pas un item", () => {
  it("« Carte graphique » au-dessus des modèles (le cas signalé)", () => {
    const r = A.analyserTexte("Carte graphique\nGTX 1080\nRTX 2070 x2\nServeur\nDell PowerEdge R740 x2");
    expect(lignes(r)).toEqual([
      "1 × GTX 1080 [Carte graphique]",
      "2 × RTX 2070 [Carte graphique]",
      "2 × Dell PowerEdge R740 [Serveur]",
    ]);
    expect(r.titres).toBe(2);
    expect(r.ignorees).toEqual([]);
  });

  it("titres au pluriel avec deux-points, puces et lignes vides", () => {
    const r = A.analyserTexte("Cartes graphiques :\n- GTX 1080 (3)\n- RTX 3070 x 2\n\nServeurs :\n- Dell R740 x2");
    expect(lignes(r)).toEqual([
      "3 × GTX 1080 [Cartes graphiques]",
      "2 × RTX 3070 [Cartes graphiques]",
      "2 × Dell R740 [Serveurs]",
    ]);
  });

  it("titre de marque : la marque préfixe les modèles", () => {
    const r = A.analyserTexte("Dell\nLatitude 5420 x5\nOptiPlex 7050 x3\nHP\nEliteBook 840 G5 x2");
    expect(lignes(r)).toEqual(["5 × Dell Latitude 5420", "3 × Dell OptiPlex 7050", "2 × HP EliteBook 840 G5"]);
  });

  it("catégorie et marque (« Serveurs Dell »), puis marque sous une catégorie", () => {
    expect(lignes(A.analyserTexte("Serveurs Dell\nR740 x2\nR640 x3"))).toEqual(["2 × Dell R740 [Serveurs]", "3 × Dell R640 [Serveurs]"]);
    expect(lignes(A.analyserTexte("Serveurs\nDell\nR740 x2"))).toEqual(["2 × Dell R740 [Serveurs]"]);
  });

  it("Markdown, crochets et majuscules", () => {
    expect(lignes(A.analyserTexte("**Écrans**\nDell P2419H x5\n## Portables\nThinkPad T480 x2"))).toEqual([
      "5 × Dell P2419H [Écrans]",
      "2 × ThinkPad T480 [Portables]",
    ]);
    expect(lignes(A.analyserTexte("SERVEURS\nDell R740 x2\nPORTABLES\nDell Latitude 5420 x10"))).toEqual([
      "2 × Dell R740 [Serveurs]",
      "10 × Dell Latitude 5420 [Portables]",
    ]);
  });

  it("liste à double interligne : le titre reste valable", () => {
    expect(lignes(A.analyserTexte("Carte graphique\n\nGTX 1080\n\nRTX 2070\n\nServeurs\n\nR740"))).toEqual([
      "1 × GTX 1080 [Carte graphique]",
      "1 × RTX 2070 [Carte graphique]",
      "1 × R740 [Serveurs]",
    ]);
  });

  it("une ligne vide après les items termine la section", () => {
    expect(lignes(A.analyserTexte("Carte graphique\nGTX 1080\n\nDell R740 x2"))).toEqual(["1 × GTX 1080 [Carte graphique]", "2 × Dell R740"]);
  });

  it("deux items voisins ne deviennent pas titre l'un de l'autre", () => {
    expect(lignes(A.analyserTexte("Clavier Logitech\nSouris Logitech x5"))).toEqual(["1 × Clavier Logitech", "5 × Souris Logitech"]);
  });

  it("un mot de catégorie seul en fin de liste reste un item", () => {
    expect(lignes(A.analyserTexte("Dell R740 x2\nCartes graphiques"))).toEqual(["2 × Dell R740", "1 × Cartes graphiques"]);
  });

  it("préfixe en ligne : « Serveurs : 2x R740, 1x DL380 », « Portables : 10 »", () => {
    expect(lignes(A.analyserTexte("Serveurs : 2x Dell R740, 1x HP DL380\nPortables : 10"))).toEqual([
      "2 × Dell R740 [Serveurs]",
      "1 × HP DL380 [Serveurs]",
      "10 × Portables",
    ]);
    expect(lignes(A.analyserTexte("Type : Portable\nDell Latitude 5420 x3"))).toEqual(["3 × Dell Latitude 5420 [Portable]"]);
  });

  it("« Switch Cisco : 48 ports » est un item, pas une catégorie", () => {
    expect(lignes(A.analyserTexte("Switch Cisco : 48 ports"))).toEqual(["1 × Switch Cisco : 48 ports"]);
  });

  it("un titre sans item est signalé dans les lignes ignorées", () => {
    const r = A.analyserTexte("Dell R740 x2\n\nServeurs :");
    expect(lignes(r)).toEqual(["2 × Dell R740"]);
    expect(r.ignorees).toEqual(["Serveurs :"]);
    expect(r.titres).toBe(0);
  });
});

describe("quantités", () => {
  const q = (t: string) => {
    const r = A.lireQuantite(t);
    return `${r.qte}${r.explicite ? "" : "?"} ${r.desc}`;
  };

  it("devant ou derrière, avec x, ×, parenthèses, tiret, deux-points, unités", () => {
    expect(q("15x Lenovo ThinkPad T480")).toBe("15 Lenovo ThinkPad T480");
    expect(q("15 x Lenovo ThinkPad T480")).toBe("15 Lenovo ThinkPad T480");
    expect(q("Dell x10")).toBe("10 Dell");
    expect(q("Dell × 3")).toBe("3 Dell");
    expect(q("Dell (12)")).toBe("12 Dell");
    expect(q("Dell (x4)")).toBe("4 Dell");
    expect(q("Dell (10 unités)")).toBe("10 Dell");
    expect(q("Écran Dell - 5")).toBe("5 Écran Dell");
    expect(q("Dell OptiPlex 7050 - 12 unités")).toBe("12 Dell OptiPlex 7050");
    expect(q("Dell OptiPlex : 8")).toBe("8 Dell OptiPlex");
    expect(q("Qté: 4 Dell OptiPlex")).toBe("4 Dell OptiPlex");
    expect(q("Dell OptiPlex qté 4")).toBe("4 Dell OptiPlex");
    expect(q("10 unités de Dell OptiPlex")).toBe("10 Dell OptiPlex");
    expect(q("Lot de 25 claviers")).toBe("25 claviers");
    expect(q("12 Dell Latitude 5420")).toBe("12 Dell Latitude 5420");
  });

  it("modèles, mesures et années ne sont pas des quantités", () => {
    expect(q("Lenovo ThinkPad X280")).toBe("1? Lenovo ThinkPad X280");
    expect(q("ThinkPad X1 Carbon")).toBe("1? ThinkPad X1 Carbon");
    expect(q("RAM PC3L-10600")).toBe("1? RAM PC3L-10600");
    expect(q("MacBook Pro (2019)")).toBe("1? MacBook Pro (2019)");
    expect(q("2019 MacBook Pro")).toBe("1? 2019 MacBook Pro");
    expect(q("24 po écran Dell")).toBe("1? 24 po écran Dell");
    expect(q("16 Go RAM DDR4")).toBe("1? 16 Go RAM DDR4");
    expect(q("48 ports switch Cisco")).toBe("1? 48 ports switch Cisco");
  });

  it("numéros de liste retirés, quantité gardée", () => {
    expect(lignes(A.analyserTexte("1. Dell Latitude 5420\n2) HP EliteBook x3\n- 4 Lenovo T480"))).toEqual([
      "1 × Dell Latitude 5420",
      "3 × HP EliteBook",
      "4 × Lenovo T480",
    ]);
  });

  it("« Quantité : 10 » sous un item lui donne sa quantité", () => {
    const r = A.analyserTexte("Modèle : Dell Latitude 5420\nQuantité : 10\nÉtat : bon\n\nModèle : HP EliteBook 840\nQuantité : 4");
    expect(lignes(r)).toEqual(["10 × Dell Latitude 5420", "4 × HP EliteBook 840"]);
    expect(r.ignorees).toEqual(["État : bon"]);
  });

  it("caractéristiques en puces sous « Modèle : » : mises de côté, la quantité compte", () => {
    const r = A.analyserTexte("Dell Latitude 5420 :\n- i5 11e gen\n- 16 Go RAM\n- Qté : 10\n\nHP EliteBook 840 G6 x4");
    expect(lignes(r)).toEqual(["10 × Dell Latitude 5420", "4 × HP EliteBook 840 G6"]);
    expect(r.ignorees).toEqual(["- i5 11e gen", "- 16 Go RAM"]);
  });
});

describe("plusieurs items sur une ligne", () => {
  it("virgules et « et » quand chaque morceau a sa quantité", () => {
    expect(lignes(A.analyserTexte("10 Dell Latitude 5420, 5 écrans Dell P2419H et 2 serveurs R740"))).toEqual([
      "10 × Dell Latitude 5420",
      "5 × écrans Dell P2419H",
      "2 × serveurs R740",
    ]);
    expect(lignes(A.analyserTexte("J'ai 10 portables Dell à vendre et 3 imprimantes HP."))).toEqual(["10 × portables Dell", "3 × imprimantes HP"]);
  });

  it("caractéristiques séparées par des virgules : un seul item", () => {
    expect(lignes(A.analyserTexte("Dell Latitude 5420, i5, 16 Go, 256 Go SSD"))).toEqual(["1 × Dell Latitude 5420, i5, 16 Go, 256 Go SSD"]);
    expect(lignes(A.analyserTexte("10 Dell Latitude 5420, i5, 16 Go, 5 écrans P2419H"))).toEqual([
      "10 × Dell Latitude 5420, i5, 16 Go",
      "5 × écrans P2419H",
    ]);
  });

  it("une phrase à la suite est mise de côté", () => {
    const r = A.analyserTexte("Nous avons 20 postes Dell OptiPlex 7050 avec écrans 24 pouces. Tout fonctionne.");
    expect(lignes(r)).toEqual(["20 × postes Dell OptiPlex 7050 avec écrans 24 pouces"]);
    expect(r.ignorees).toEqual(["Tout fonctionne."]);
  });

  it("nombres décimaux à virgule : pas de coupure", () => {
    expect(lignes(A.analyserTexte("Disque dur 1,5 To x3"))).toEqual(["3 × Disque dur 1,5 To"]);
  });
});

describe("lignes mises de côté", () => {
  it("salutations, signature, téléphone et courriel", () => {
    const r = A.analyserTexte("Bonjour,\nVoici la liste :\nDell R740 x2\nMerci\nJean Tremblay\n514-555-1234\njean@exemple.com");
    expect(lignes(r)).toEqual(["2 × Dell R740"]);
    expect(r.ignorees).toEqual(["Bonjour,", "Merci", "Jean Tremblay", "514-555-1234", "jean@exemple.com"]);
  });

  it("« Merci, Jean » ouvre aussi la signature", () => {
    const r = A.analyserTexte("Dell R740 x2\nMerci, Jean\nJean Tremblay\nDirecteur TI");
    expect(lignes(r)).toEqual(["2 × Dell R740"]);
    expect(r.ignorees).toEqual(["Merci, Jean", "Jean Tremblay", "Directeur TI"]);
  });

  it("courriel transféré : en-têtes ignorés, la liste qui suit est lue", () => {
    const r = A.analyserTexte(
      "Merci\nAnthony\n---------- Message transféré ----------\nDe : Jean <jean@x.com>\nObjet : Lot à vendre\n\n5 Dell OptiPlex 7050",
    );
    expect(lignes(r)).toEqual(["5 × Dell OptiPlex 7050"]);
  });

  it("totaux, phrases, sections « Notes »", () => {
    expect(A.analyserTexte("Dell R740 x2\nHP DL380 x1\nTotal : 3").ignorees).toEqual(["Total : 3"]);
    const r = A.analyserTexte("Tous les portables sont en bon état.\nIls fonctionnent tous.\n10 Dell OptiPlex 7050\n\nNotes :\nRamassage à Laval");
    expect(lignes(r)).toEqual(["10 × Dell OptiPlex 7050"]);
    expect(r.ignorees).toEqual(["Tous les portables sont en bon état.", "Ils fonctionnent tous.", "Notes :", "Ramassage à Laval"]);
  });

  it("ligne sans chiffre, marque, modèle ni matériel : mise de côté ; les vrais items restent", () => {
    const r = A.analyserTexte(
      "Dell R740 x2\nTout fonctionne, ramassage au quai de chargement.\niPad Air 2\nApple Watch Series\nCâbles et chargeurs\nLot de claviers et souris variés",
    );
    expect(lignes(r)).toEqual([
      "2 × Dell R740",
      "1 × iPad Air 2",
      "1 × Apple Watch Series",
      "1 × Câbles et chargeurs",
      "1 × Lot de claviers et souris variés",
    ]);
    expect(r.ignorees).toEqual(["Tout fonctionne, ramassage au quai de chargement."]);
  });

  it("en-tête de colonnes écrit à la main : retiré sans bruit", () => {
    const r = A.analyserTexte("Description   Qté\nDell R740 x2");
    expect(lignes(r)).toEqual(["2 × Dell R740"]);
    expect(r.ignorees).toEqual([]);
  });

  it("texte vide ou sans item", () => {
    expect(A.analyserTexte("")).toEqual({ items: [], ignorees: [], titres: 0 });
    expect(A.analyserTexte("Bonjour,\nMerci").items).toEqual([]);
  });
});

describe("tableaux", () => {
  it("Excel avec en-tête : marque + modèle, catégorie, quantité ; le no de série est ignoré", () => {
    const r = A.analyserTexte(
      "Catégorie\tMarque\tModèle\tQté\tNo de série\nPortable\tDell\tLatitude 5420\t10\tABC123\nÉcran\tDell\tP2419H\t5\tXYZ789",
    );
    expect(lignes(r)).toEqual(["10 × Dell Latitude 5420 [Portable]", "5 × Dell P2419H [Écran]"]);
    expect(r.ignorees).toEqual([]);
  });

  it("Excel sans en-tête : rangées de section (cellules vides) = catégories", () => {
    const r = A.analyserTexte("Serveurs\t\t\nDell R740\t2\t\nHP DL380\t1\t\nCartes graphiques\t\t\nGTX 1080\t5\t");
    expect(lignes(r)).toEqual(["2 × Dell R740 [Serveurs]", "1 × HP DL380 [Serveurs]", "5 × GTX 1080 [Cartes graphiques]"]);
    expect(r.titres).toBe(2);
  });

  it("l'exemple historique (catégorie, quantité, description)", () => {
    const r = A.analyserTexte(
      "IT networking\t2\tCisco 2901 Integrated Services Router\nIT moniteurs\t5\tDell U2412M 24 po\nIT\t25\tRAM Dell 8GB PC3L-10600 1333MHz",
    );
    expect(lignes(r)).toEqual([
      "2 × Cisco 2901 Integrated Services Router [IT networking]",
      "5 × Dell U2412M 24 po [IT moniteurs]",
      "25 × RAM Dell 8GB PC3L-10600 1333MHz [IT]",
    ]);
  });

  it("tableau Markdown : la colonne « Prix eBay » remplit le prix", () => {
    const r = A.analyserTexte("| Item | Qté | Prix eBay vendu |\n|---|---|---|\n| Dell R740 | 2 | 450 $ |\n| HP DL380 Gen9 | 1 | 1 234,50 $ |");
    expect(lignes(r)).toEqual(["2 × Dell R740 = 450", "1 × HP DL380 Gen9 = 1234.5"]);
  });

  it("une colonne « Prix » du client n'est ni un prix de vente ni une catégorie", () => {
    const r = A.analyserTexte("Description\tQté\tPrix\nDell R740\t2\t3000\nHP DL380\t1\t2500");
    expect(lignes(r)).toEqual(["2 × Dell R740", "1 × HP DL380"]);
  });

  it("rangées « Total » ignorées", () => {
    const r = A.analyserTexte("Description\tQté\nDell R740\t2\nTotal\t2");
    expect(lignes(r)).toEqual(["2 × Dell R740"]);
  });
});

describe("soumission du site", () => {
  it("description détaillée + lignes « Matériel » : rien en double, quantité reprise", () => {
    const r = A.analyserSoumission(
      "Matériel :\n- Portables : 10\n- Serveurs : 2\n- Cartes graphiques (autre) : 5\nEntreprise : Vidéotron\nVille : Montréal\n\nDescription :\nDell Latitude 5420 i5 bon état\n2 Dell PowerEdge R740",
    );
    expect(lignes(r)).toEqual(["10 × Dell Latitude 5420 i5 bon état", "2 × Dell PowerEdge R740", "5 × Cartes graphiques"]);
    expect(r.materiel).toEqual([
      { nom: "Portables", qte: 10 },
      { nom: "Serveurs", qte: 2 },
      { nom: "Cartes graphiques", qte: 5 },
    ]);
  });

  it("sans description : les catégories deviennent les items", () => {
    const r = A.analyserSoumission("Matériel :\n- Écrans : 5\n- Imprimantes : quantité à préciser\nEntreprise : X");
    expect(lignes(r)).toEqual(["5 × Écrans", "1 × Imprimantes"]);
  });

  it("« avec écrans » ne couvre pas la ligne Écrans", () => {
    const r = A.analyserSoumission(
      "Matériel :\n- Ordinateurs de bureau : 20\n- Écrans : 20\nVille : Laval\n\nDescription :\nNous avons 20 postes Dell OptiPlex 7050 avec écrans 24 pouces. Tout fonctionne.",
    );
    expect(lignes(r)).toEqual(["20 × postes Dell OptiPlex 7050 avec écrans 24 pouces", "20 × Écrans"]);
  });

  it("« Autre (non précisé) » : la description le précise", () => {
    expect(lignes(A.analyserSoumission("Matériel :\n- Autre (non précisé) : 3\n\nDescription :\nDes câbles et des souris"))).toEqual([
      "3 × Des câbles et des souris",
    ]);
  });

  it("ancienne demande en texte libre", () => {
    expect(lignes(A.analyserSoumission("J'ai 10 portables Dell à vendre et 3 imprimantes HP."))).toEqual([
      "10 × portables Dell",
      "3 × imprimantes HP",
    ]);
  });
});

describe("recherche eBay", () => {
  it.each([
    ["GTX 1080", "GTX 1080"],
    ["Carte graphique GTX 1080", "GTX 1080"],
    ["Cartes graphiques Nvidia", "graphics card Nvidia"],
    ["Écran Dell P2419H 24 pouces", "Dell P2419H 24"],
    ["Écrans Dell 24 pouces", "monitor Dell 24"],
    ["Portable Lenovo ThinkPad T480, bon état", "Lenovo ThinkPad T480"],
    ["Disque dur 1 To", "hard drive 1TB"],
    ["Mémoire RAM 8 Go DDR4", "RAM 8GB DDR4"],
    ["Dell Latitude 5420 avec chargeur", "Dell Latitude 5420"],
    ["Serveur Dell PowerEdge R740 (2x Xeon, 64 Go)", "Dell PowerEdge R740"],
    ["Téléphones IP Cisco 7841", "Cisco 7841"],
    ["Station d'accueil Dell WD19", "Dell WD19"],
    ["iPhone 12 128 Go", "iPhone 12 128GB"],
    ["Cisco 2901 Integrated Services Router", "Cisco 2901 Integrated Services Router"],
    ["RAM Dell 8GB PC3L-10600 1333MHz", "RAM Dell 8GB PC3L-10600 1333MHz"],
    ["Portable Dell défectueux", "laptop Dell for parts"],
    ["Dell OptiPlex neuf dans la boîte", "Dell OptiPlex new"],
    ["Lot de câbles", "cable"],
  ])("%s → %s", (desc, attendu) => {
    expect(A.requeteEbay(desc)).toBe(attendu);
  });

  it("lien des ventes réussies sur eBay.ca, requête encodée", () => {
    expect(A.lienEbay("Carte graphique GTX 1080 & co")).toBe(
      "https://www.ebay.ca/sch/i.html?_nkw=GTX%201080%20co&LH_Sold=1&LH_Complete=1",
    );
    expect(A.requeteEbay("")).toBe("");
  });
});

describe("montants", () => {
  it.each([
    ["180", 180],
    ["180,5", 180.5],
    ["180.50", 180.5],
    ["1 500", 1500],
    ["1 500", 1500],
    ["1,500", 1500],
    ["1,50", 1.5],
    ["1.234,56", 1234.56],
    ["$1,234.56", 1234.56],
    ["1 500,50 $", 1500.5],
    ["C$ 99", 99],
    ["0,125", 0.13],
    ["12.", 12],
  ])("%s → %s", (v, attendu) => {
    expect(A.lireMontant(v)).toBe(attendu);
  });

  it("refusés : vide, négatif, texte, notation scientifique, trop grand", () => {
    for (const v of ["", "abc", "-5", "1e5", "10000000", null, undefined]) expect(A.lireMontant(v)).toBeNull();
    expect(A.lireMontant(42)).toBe(42);
    expect(A.lireMontant(Number.NaN)).toBeNull();
  });
});

describe("robustesse", () => {
  it("5 000 lignes en moins de 2 secondes, une ligne de 20 000 caractères sans blocage", () => {
    const grosse = Array.from({ length: 5000 }, (_, i) => (i % 50 === 0 ? "Serveurs Dell" : `R${700 + (i % 90)} x${(i % 7) + 1}`)).join("\n");
    const t0 = Date.now();
    const r = A.analyserTexte(grosse);
    expect(r.items.length).toBe(4900);
    const longue = A.analyserTexte("Dell ".repeat(4000) + "x2");
    expect(longue.items).toHaveLength(1);
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it("le script n'ouvre pas de balise </script> (il est inséré dans la page)", () => {
    expect(CODE).not.toMatch(/<\/script/i);
    expect(CODE).not.toMatch(/<!--/);
  });

  it("aucun regard en arrière (lookbehind) : les anciens Safari refuseraient le script entier", () => {
    expect(CODE).not.toMatch(/\(\?<[=!]/);
  });
});
