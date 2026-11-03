import { describe, expect, it } from "vitest";
import { departEnvoi, destinatairesDe } from "@/lib/acheteurs/envoi";
import { analyserListe } from "@/lib/crm/envoi-en-gros";
import { langueAcheteur, type AcheteurCarnet } from "@/lib/acheteurs/types";

function fiche(extra: Partial<AcheteurCarnet>): AcheteurCarnet {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    nom: "Surplus Alpha",
    domaine: "alpha.example",
    site: "https://alpha.example/",
    ville: null,
    region: "Québec",
    pays: "CA",
    courriel: "ventes@alpha.example",
    telephone: null,
    formulaire: null,
    sources: [],
    confiance: "achete_surplus",
    categories: [],
    modeles: [],
    notes: null,
    verifie: false,
    created_at: "2026-11-03T12:00:00Z",
    ...extra,
  };
}

describe("langueAcheteur", () => {
  it("français au Québec, anglais ailleurs", () => {
    expect(langueAcheteur({ pays: "CA", region: "Québec" })).toBe("fr");
    expect(langueAcheteur({ pays: "CA", region: "QC" })).toBe("fr");
    expect(langueAcheteur({ pays: "CA", region: "Ontario" })).toBe("en");
    expect(langueAcheteur({ pays: "US", region: null })).toBe("en");
  });
});

describe("destinatairesDe et departEnvoi", () => {
  const acheteurs = [
    fiche({}),
    fiche({ id: "2", nom: "Beta; Inc.", domaine: "beta.example", courriel: "INFO@beta.example", pays: "US", region: "Ohio" }),
    fiche({ id: "3", nom: "Sans courriel", domaine: "gamma.example", courriel: null }),
    fiche({ id: "4", nom: "Doublon", domaine: "delta.example", courriel: "ventes@alpha.example" }),
  ];

  it("garde les compagnies joignables par courriel dans la langue, sans doublon", () => {
    expect(destinatairesDe(acheteurs, "fr").map((a) => a.nom)).toEqual(["Surplus Alpha"]);
    expect(destinatairesDe(acheteurs, "en").map((a) => a.nom)).toEqual(["Beta; Inc."]);
  });

  it("écrit une liste que l'Envoi en gros relit telle quelle", () => {
    const depart = departEnvoi(acheteurs, { objet: "Lot for sale", message: "Hello" }, "en");
    expect(depart).toMatchObject({ objet: "Lot for sale", corps: "Hello", nombre: 1, langue: "en" });
    const analyse = analyserListe(depart?.texte ?? "");
    expect(analyse.destinataires).toEqual([
      expect.objectContaining({ email: "info@beta.example", compagnie: "Beta Inc." }),
    ]);
  });

  it("rend null sans brouillon ou sans destinataire", () => {
    expect(departEnvoi(acheteurs, null, "fr")).toBeNull();
    expect(departEnvoi([fiche({ courriel: null })], { objet: "x", message: "y" }, "fr")).toBeNull();
  });
});
