import { describe, expect, it } from "vitest";
import {
  analyserLigne,
  descriptionDuMessage,
  estCourant,
  extraireArticles,
  formaterArticle,
  lireArticlesSaisis,
  nombreNiches,
} from "@/lib/acheteurs/articles";
import { motsDuClient } from "@/lib/acheteurs/identite";

/*
 * Articles d'une soumission : découpage de la description du formulaire en
 * lignes « quantité × article » (formats vus dans de vraies demandes, données
 * personnelles retirées).
 */

describe("descriptionDuMessage", () => {
  it("prend le texte après « Description : » (formulaire actuel)", () => {
    const message = "Entreprise : Exemple inc.\nVille : Laval\n\nDescription :\nRÉSEAU\n1 × Ubiquiti UniFi USW-EnterpriseXG-24";
    expect(descriptionDuMessage(message)).toBe("RÉSEAU\n1 × Ubiquiti UniFi USW-EnterpriseXG-24");
  });

  it("retire les lignes d'en-tête d'un ancien message", () => {
    expect(descriptionDuMessage("Entreprise : Exemple\nVille : Laval\n2x MR76")).toBe("2x MR76");
  });

  it("donne une chaîne vide sans message", () => {
    expect(descriptionDuMessage(null)).toBe("");
  });
});

describe("analyserLigne", () => {
  it.each([
    ["28x 5500 I7 8th Gen 8gb Ram", 28, "5500 I7 8th Gen 8gb Ram"],
    ["1 × ASUS Z170-P", 1, "ASUS Z170-P"],
    ["2X Intel Xeon Gold 6136", 2, "Intel Xeon Gold 6136"],
    ["Dell Latitude 5500 x 28", 28, "Dell Latitude 5500"],
    ["1)HP E233 Bezel less monitor(No stands) Quantity: 87", 87, "HP E233 Bezel less monitor(No stands)"],
    ["- Écrans : 10", 10, "Écrans"],
    ["500 ipad 6th gen 128gb", 500, "ipad 6th gen 128gb"],
  ])("lit « %s »", (ligne, quantite, description) => {
    expect(analyserLigne(ligne)).toEqual({ quantite, description });
  });

  it("ne prend pas une capacité pour une quantité", () => {
    expect(analyserLigne("8 GB DDR3")).toEqual({ quantite: null, description: "8 GB DDR3" });
  });

  it("garde une ligne sans quantité", () => {
    expect(analyserLigne("GTX 1080")).toEqual({ quantite: null, description: "GTX 1080" });
  });

  it("ignore une ligne vide", () => {
    expect(analyserLigne("   ")).toBeNull();
  });
});

describe("extraireArticles", () => {
  it("écarte titres de section, étiquettes, salutations et phrases", () => {
    const description = [
      "Bonjour,",
      "Voici un aperçu du matériel concerné :",
      "RÉSEAU",
      "1 × Ubiquiti UniFi USW-EnterpriseXG-24",
      "CARTES GRAPHIQUES",
      "GTX 1080",
      "Tout en bonne condition",
      "Merci!",
    ].join("\n");
    expect(extraireArticles(description)).toEqual([
      { quantite: 1, description: "Ubiquiti UniFi USW-EnterpriseXG-24" },
      { quantite: null, description: "GTX 1080" },
    ]);
  });

  it("rattache « Quantity: 53 » seule à l'article précédent", () => {
    const description = "3)Yealink MP56-TEAMS Business IP Phones(Brand new in box)\r\nQuantity: 53";
    expect(extraireArticles(description)).toEqual([
      { quantite: 53, description: "Yealink MP56-TEAMS Business IP Phones(Brand new in box)" },
    ]);
  });

  it("s'arrête à 60 articles", () => {
    const description = Array.from({ length: 80 }, (_, i) => `${i + 1} × Article ${i}`).join("\n");
    expect(extraireArticles(description)).toHaveLength(60);
  });

  it("ne prend pas la signature du client pour un article", () => {
    const description =
      "Suite à notre appel, voir les fichiers joints svp.\nLe matériel serait expédié à nos frais.\nMarie, Usine Exemple";
    const mots = motsDuClient({ nom: "Marie Tremblay", courriel: null, telephone: null, entreprise: "Usine Exemple", ville: null });
    expect(extraireArticles(description, mots)).toEqual([]);
    // Sans les mots du client : le bogue d'origine.
    expect(extraireArticles(description)).toEqual([{ quantite: null, description: "Marie, Usine Exemple" }]);
  });

  it("ignore le reste d'une signature, sans chiffre", () => {
    const mots = motsDuClient({ nom: "Marie Tremblay", courriel: null, telephone: null, entreprise: null, ville: "Laval" });
    expect(extraireArticles("Marie Tremblay, Directrice TI\nTél : 514-555-0123", mots)).toEqual([]);
    expect(extraireArticles("Tél : 514-555-0123")).toEqual([]);
  });

  it("garde un article dont la ville est masquée", () => {
    const mots = motsDuClient({ nom: null, courriel: null, telephone: null, entreprise: null, ville: "Laval" });
    expect(extraireArticles("Laval : 12 portables", mots)).toEqual([{ quantite: 12, description: "portables" }]);
  });

  it("garde une ligne sans chiffre si rien n'en a été retiré", () => {
    expect(extraireArticles("Directrice TI", ["Marie"])).toEqual([{ quantite: null, description: "Directrice TI" }]);
  });

  it("retire le client d'une ligne d'article", () => {
    const mots = ["Usine Exemple", "Laval"];
    expect(extraireArticles("4 × Cisco 2960 Usine Exemple\nLaval : 3 × Ruckus R650", mots)).toEqual([
      { quantite: 4, description: "Cisco 2960" },
      { quantite: 3, description: "Ruckus R650" },
    ]);
  });

  it("rattache encore « Quantity: 53 » après une ligne ignorée", () => {
    expect(extraireArticles("Yealink MP56\nMarie, Usine Exemple\nQuantity: 53", ["Marie", "Usine Exemple"])).toEqual([
      { quantite: 53, description: "Yealink MP56" },
    ]);
  });
});

describe("lireArticlesSaisis et formaterArticle", () => {
  it("relit ce que formaterArticle écrit", () => {
    const articles = [
      { quantite: 403, description: "Tectrol TC91S-1514, neuf" },
      { quantite: null, description: "Mean Well, modèle 3 000 W" },
    ];
    expect(lireArticlesSaisis(articles.map(formaterArticle).join("\n"))).toEqual(articles);
  });
});

describe("nombreNiches", () => {
  it("compte les articles nichés du message d'une soumission", () => {
    const message =
      "Entreprise : Exemple\nVille : Laval\n\nDescription :\n28 × Dell Latitude 5500 portable\n4 × Cisco Meraki MR57";
    expect(nombreNiches(message)).toBe(1);
    expect(nombreNiches(null)).toBe(0);
  });

  it("ne compte pas la signature du client", () => {
    const message = "Entreprise : Usine Exemple\n\nDescription :\nMarie, Usine Exemple";
    expect(nombreNiches(message)).toBe(1);
    expect(nombreNiches(message, ["Marie", "Usine Exemple"])).toBe(0);
  });
});

describe("estCourant", () => {
  it("reconnaît les portables, ordinateurs et écrans", () => {
    expect(estCourant("Dell Latitude 5500 portable")).toBe(true);
    expect(estCourant("HP E233 monitor")).toBe(true);
    expect(estCourant("1000 ipads air 2")).toBe(true);
  });

  it("laisse les articles nichés", () => {
    expect(estCourant("Tectrol TC91S-1514")).toBe(false);
    expect(estCourant("Blackmagic DeckLink SDI 4K")).toBe(false);
  });
});
