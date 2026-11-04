import { describe, expect, it } from "vitest";
import { articlesSansClient, masquerClient, motsDuClient, sansClient, type SoumissionIdentite } from "@/lib/acheteurs/identite";

/*
 * Identité du client : rien de ce qui le désigne ne doit partir vers Claude ni
 * devenir un « article ». Toutes les données sont fictives.
 */

const VIDE: SoumissionIdentite = { nom: null, courriel: null, telephone: null, entreprise: null, ville: null };

describe("motsDuClient", () => {
  it("prend le nom complet et chaque mot du nom", () => {
    const mots = motsDuClient({ ...VIDE, nom: "Marie-Ève Tremblay" });
    expect(mots).toEqual(["Marie-Ève Tremblay", "Marie", "Ève", "Tremblay"]);
  });

  it("écarte les mots trop courts et les particules", () => {
    const mots = motsDuClient({ ...VIDE, nom: "Jo de la Fontaine des Bois" });
    expect(mots).toEqual(["Jo de la Fontaine des Bois", "Fontaine", "Bois"]);
  });

  it("garde la compagnie entière et sans suffixe légal, jamais mot par mot", () => {
    expect(motsDuClient({ ...VIDE, entreprise: "Usine Exemple inc." })).toEqual(["Usine Exemple inc", "Usine Exemple"]);
    expect(motsDuClient({ ...VIDE, entreprise: "Dell Canada" })).toEqual(["Dell Canada"]);
    expect(motsDuClient({ ...VIDE, entreprise: "Exemple & Cie, Ltée" })).toEqual(["Exemple & Cie, Ltée", "Exemple"]);
  });

  it("prend la ville entière", () => {
    expect(motsDuClient({ ...VIDE, ville: "Saint-Fictif-du-Lac" })).toEqual(["Saint-Fictif-du-Lac"]);
  });

  it("prend le courriel, sa partie locale et le domaine d'une compagnie", () => {
    expect(motsDuClient({ ...VIDE, courriel: "mtremblay@usine-exemple.example" })).toEqual([
      "mtremblay@usine-exemple.example",
      "mtremblay",
      "usine-exemple.example",
    ]);
  });

  it("laisse le domaine d'un courriel grand public", () => {
    expect(motsDuClient({ ...VIDE, courriel: "client.fictif.test@gmail.com" })).toEqual(["client.fictif.test@gmail.com", "client.fictif.test"]);
    expect(motsDuClient({ ...VIDE, courriel: "zq@videotron.ca" })).toEqual(["zq@videotron.ca"]);
  });

  it("laisse la partie locale d'une boîte de service", () => {
    expect(motsDuClient({ ...VIDE, courriel: "support@usine-exemple.example" })).toEqual([
      "support@usine-exemple.example",
      "usine-exemple.example",
    ]);
  });

  it("n'a aucun doublon ni mot vide", () => {
    expect(motsDuClient({ ...VIDE, nom: "Tremblay", entreprise: "TREMBLAY", ville: " " })).toEqual(["Tremblay"]);
    expect(motsDuClient(VIDE)).toEqual([]);
  });
});

describe("masquerClient", () => {
  it("ignore la casse et les accents, et respecte les mots entiers", () => {
    const mots = ["Hélène", "Laval"];
    expect(masquerClient("HELENE et hélène de Laval", mots)).toBe("[client] et [client] de [client]");
    expect(masquerClient("Lavalloise Helenette", mots)).toBe("Lavalloise Helenette");
  });

  it("reconnaît un mot en bordure de lettre accentuée", () => {
    expect(masquerClient("éLaval Lavalé (Laval)", ["Laval"])).toBe("éLaval Lavalé ([client])");
  });

  it("masque le plus long d'abord", () => {
    expect(masquerClient("Usine Exemple Sud", ["Usine", "Usine Exemple Sud"])).toBe("[client]");
  });

  it("échappe les caractères spéciaux", () => {
    expect(masquerClient("A+B (Québec) ok", ["A+B (Québec)"])).toBe("[client] ok");
    expect(masquerClient("AxxB", ["A.+B"])).toBe("AxxB");
  });

  it("trouve une ville écrite avec ou sans trait d'union", () => {
    expect(masquerClient("à Saint Fictif", ["Saint-Fictif"])).toBe("à [client]");
  });

  it("masque tout courriel, même inconnu, en entier", () => {
    expect(masquerClient("écrire à autre.personne@ailleurs.example svp", [])).toBe("écrire à [client] svp");
    expect(masquerClient("marie@ailleurs.example", ["Marie"])).toBe("[client]");
  });

  it.each(["514-555-0123", "(514) 555-0123", "+1 514 555 0123", "514.555.0123", "1-514-555-0123", "5145550123"])(
    "masque le téléphone %s",
    (telephone) => {
      expect(masquerClient(`Tél. ${telephone} merci`, [])).toBe("Tél. [client] merci");
    },
  );

  it("laisse les références qui ressemblent à un téléphone", () => {
    expect(masquerClient("PN 514-555-0123-07, 1 083,00 $, PC3L-10600, X280", [])).toBe(
      "PN 514-555-0123-07, 1 083,00 $, PC3L-10600, X280",
    );
  });

  it("passe aussi le masquage des cartes et des NAS", () => {
    expect(masquerClient("carte 4539 1488 0343 6467 fin", [])).toBe("carte [carte masquée] fin");
    expect(masquerClient("NAS : 046 454 286", [])).toContain("[NAS masqué]");
  });

  it("retire le suffixe légal resté derrière la compagnie", () => {
    expect(masquerClient("Usine Exemple ltée, Laval", ["Usine Exemple"])).toBe("[client], Laval");
  });

  it("reste rapide sur un texte long", () => {
    const mots = motsDuClient({ ...VIDE, nom: "Marie Tremblay", entreprise: "Usine Exemple" });
    const debut = performance.now();
    masquerClient(`${"a".repeat(40_000)} ${"1-".repeat(20_000)} ${"Marie ".repeat(6_000)}`, mots);
    expect(performance.now() - debut).toBeLessThan(1_000);
  });
});

describe("sansClient", () => {
  const mots = motsDuClient({ ...VIDE, nom: "Marie Tremblay", entreprise: "Usine Exemple" });

  it("rend null pour une signature", () => {
    expect(sansClient("Marie, Usine Exemple", mots)).toBeNull();
    expect(sansClient("Marie Tremblay - 514-555-0123", mots)).toBeNull();
    expect(sansClient("- Marie -", mots)).toBeNull();
  });

  it("laisse un article intact", () => {
    const dell = motsDuClient({ ...VIDE, entreprise: "Dell Canada" });
    expect(sansClient("Dell Latitude 5400", dell)).toBe("Dell Latitude 5400");
    expect(sansClient("Serveur (neuf)", mots)).toBe("Serveur (neuf)");
  });

  it("nettoie ce qui reste autour du client", () => {
    expect(sansClient("Dell 5400, Marie, usagé", mots)).toBe("Dell 5400, usagé");
    expect(sansClient("Marie: Dell 5400 (Usine Exemple)", mots)).toBe("Dell 5400");
  });

  it("rend null pour un texte sans lettre ni chiffre", () => {
    expect(sansClient(" -- ", [])).toBeNull();
  });
});

describe("articlesSansClient", () => {
  const mots = motsDuClient({ ...VIDE, nom: "Marie Fictive", entreprise: "Usine Exemple inc.", ville: "Saint-Fictif" });

  it("retire le client d'une description et garde le reste de l'article", () => {
    expect(articlesSansClient([{ quantite: 12, description: "Cisco Meraki MR57, Usine Exemple" }], mots)).toEqual([
      { quantite: 12, description: "Cisco Meraki MR57" },
    ]);
  });

  it("retire un article qui ne désignait que le client", () => {
    const articles = [
      { quantite: null, description: "Marie Fictive, Usine Exemple inc." },
      { quantite: 3, description: "Dell Latitude 5410" },
    ];
    expect(articlesSansClient(articles, mots)).toEqual([{ quantite: 3, description: "Dell Latitude 5410" }]);
  });

  it("retire aussi courriels et téléphones, même sans mots du client", () => {
    expect(articlesSansClient([{ quantite: 1, description: "514-555-0199" }, { quantite: 1, description: "qui@exemple.example" }], [])).toEqual([]);
  });

  it("ne change pas la liste reçue", () => {
    const articles = [{ quantite: 1, description: "Dell Latitude Saint-Fictif" }];
    articlesSansClient(articles, mots);
    expect(articles[0].description).toBe("Dell Latitude Saint-Fictif");
  });
});
