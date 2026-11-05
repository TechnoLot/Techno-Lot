import { describe, expect, it } from "vitest";
import { construireDemande } from "@/lib/acheteurs/demande";

describe("construireDemande", () => {
  const articles = [
    { quantite: 403, description: "Tectrol TC91S-1514, neuf" },
    { quantite: null, description: "Mean Well, modèle 3 000 W" },
  ];

  it("liste les articles à la fin, une ligne chacun", () => {
    const demande = construireDemande({ articles });
    expect(demande).toContain("LE LOT :\n- 403 × Tectrol TC91S-1514, neuf\n- Mean Well, modèle 3 000 W\n");
  });

  it("demande le format corrigé après l'essai (null, sources, confiance, notes)", () => {
    const demande = construireDemande({ articles });
    expect(demande).toContain('"sources": ["https://..."]');
    expect(demande).toContain('"confiance": "achete_surplus"');
    expect(demande).toContain('"notes": ""');
    expect(demande).toContain("null quand un prix manque");
  });

  it("demande un courriel trouvé sur la page Contact, jamais deviné (essai du 2026-11-03 : formulaires seulement)", () => {
    const demande = construireDemande({ articles });
    expect(demande).toContain("ouvre aussi la page Contact de chaque compagnie");
    expect(demande).toContain("Ne devine jamais un courriel.");
  });

  it("exige un prix bas prudent et dit s'il vient de ventes conclues (lot du 2026-11-05 : que des prix demandés)", () => {
    const demande = construireDemande({ articles });
    expect(demande).toContain("mieux vaut sous-estimer que surestimer");
    expect(demande).toContain("hors taxes et hors livraison");
    expect(demande).toContain("jamais le prix d'un modèle voisin");
    expect(demande).toContain("baisse « bas » au prix qu'il faudrait pour tout écouler");
    expect(demande).toContain("CAD, USD ou EUR seulement");
    // L'exemple du format ne doit pas pousser Claude à répondre « vendu » sans preuve.
    expect(demande).toContain('"vendu": false');
    expect(demande).not.toContain('"vendu": true');
  });

  it("n'ajoute la phrase d'exclusion que s'il y a des compagnies déjà trouvées", () => {
    expect(construireDemande({ articles })).not.toContain("déjà trouvées");
    expect(construireDemande({ articles, domainesExclus: ["exemple.com", "autre.ca"] })).toContain(
      "N'inclus pas ces compagnies, déjà trouvées : exemple.com, autre.ca.",
    );
  });

  it("masque un numéro de carte glissé dans une ligne", () => {
    const demande = construireDemande({
      articles: [{ quantite: 1, description: "Serveur, carte 4111 1111 1111 1111 au dossier" }],
    });
    expect(demande).not.toContain("4111 1111 1111 1111");
    expect(demande).toContain("[carte masquée]");
  });
});
