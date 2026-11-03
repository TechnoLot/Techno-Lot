import { describe, expect, it } from "vitest";
import { fusionCarnet, type FicheExistante } from "@/lib/acheteurs/carnet";
import type { AcheteurLu } from "@/lib/acheteurs/types";

const lue: AcheteurLu = {
  nom: "Surplus Alpha",
  domaine: "alpha.example",
  site: "https://alpha.example/",
  ville: "Laval",
  region: "Québec",
  pays: "CA",
  courriel: "nouveau@alpha.example",
  telephone: "450-555-0101",
  formulaire: null,
  sources: ["https://alpha.example/b"],
  confiance: "a_sonder",
  categories: ["Tectrol TC91S"],
  modeles: ["Tectrol TC91S-1514"],
  notes: null,
};

const existante: FicheExistante = {
  ville: null,
  region: "Québec",
  pays: "CA",
  courriel: "ancien@alpha.example",
  telephone: null,
  formulaire: null,
  notes: "Rappeler Paul",
  sources: ["https://alpha.example/a"],
  categories: ["Mean Well RSP"],
  modeles: ["Mean Well RSP-2400-24"],
  confiance: "achete_surplus",
  verifie: false,
};

describe("fusionCarnet", () => {
  it("prend la compagnie lue telle quelle sans fiche existante", () => {
    expect(fusionCarnet(undefined, lue)).toEqual(lue);
  });

  it("garde les coordonnées connues, remplit les vides et additionne les listes", () => {
    expect(fusionCarnet(existante, lue)).toMatchObject({
      courriel: "ancien@alpha.example",
      ville: "Laval",
      telephone: "450-555-0101",
      notes: "Rappeler Paul",
      confiance: "achete_surplus",
      sources: ["https://alpha.example/a", "https://alpha.example/b"],
      categories: ["Mean Well RSP", "Tectrol TC91S"],
      modeles: ["Mean Well RSP-2400-24", "Tectrol TC91S-1514"],
    });
  });

  it("ne change jamais les coordonnées d'une fiche vérifiée", () => {
    const fusion = fusionCarnet({ ...existante, verifie: true }, lue);
    expect(fusion.ville).toBeNull();
    expect(fusion.telephone).toBeNull();
    expect(fusion.courriel).toBe("ancien@alpha.example");
  });
});
