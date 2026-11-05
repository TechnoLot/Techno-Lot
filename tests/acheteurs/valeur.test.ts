import { describe, expect, it } from "vitest";
import type { FamilleResultat, LigneResultat, Prix } from "@/lib/acheteurs/types";
import { minimumLigne, reventeEnGros, valeurLot } from "@/lib/acheteurs/valeur";

/*
 * Valeur minimale d'un lot (logique pure). Articles et sources fictifs : le
 * dépôt est public.
 */

const SOURCE = "https://revendeur.example/article";

function ligne(quantite: number | null, prix: Partial<Prix>): LigneResultat {
  return {
    article: "Article",
    quantite,
    etat: "usagé",
    prix: { bas: 100, haut: 200, devise: "CAD", base: null, sources: [SOURCE], ...prix },
  };
}

function famille(lignes: LigneResultat[]): FamilleResultat {
  return { nom: "Famille", rare: false, lignes, acheteurs: [] };
}

describe("minimumLigne", () => {
  it("vente conclue en dollars canadiens : le prix le plus bas × la quantité, sans baisse", () => {
    expect(minimumLigne(ligne(12, { vendu: true }))).toBe(1200);
  });

  it("ne se sert jamais du prix le plus haut", () => {
    expect(minimumLigne(ligne(1, { bas: 50, haut: 5000, vendu: true }))).toBe(50);
  });

  it("baisse un prix demandé de 30 %, même arrondi rond", () => {
    expect(minimumLigne(ligne(10, { vendu: false }))).toBe(700);
  });

  it("traite comme un prix demandé une ligne d'avant le champ « vendu »", () => {
    expect(minimumLigne(ligne(10, {}))).toBe(700);
  });

  it("convertit les dollars américains et les euros à un taux prudent", () => {
    expect(minimumLigne(ligne(10, { devise: "USD", vendu: true }))).toBe(1300);
    expect(minimumLigne(ligne(10, { devise: "EUR", vendu: true }))).toBe(1450);
    expect(minimumLigne(ligne(10, { devise: "USD", vendu: false }))).toBe(910);
  });

  it("arrondit à la baisse", () => {
    expect(minimumLigne(ligne(3, { bas: 19.99, vendu: true }))).toBe(59);
    expect(minimumLigne(ligne(1, { bas: 0.5, vendu: true }))).toBe(0);
  });

  it("ne compte pas une ligne sans quantité, sans prix bas, sans devise connue ou sans source", () => {
    expect(minimumLigne(ligne(null, {}))).toBeNull();
    expect(minimumLigne(ligne(5, { bas: null }))).toBeNull();
    expect(minimumLigne(ligne(5, { devise: null }))).toBeNull();
    expect(minimumLigne(ligne(5, { devise: "GBP" }))).toBeNull();
    expect(minimumLigne(ligne(5, { sources: [] }))).toBeNull();
  });
});

describe("valeurLot", () => {
  it("additionne les lignes de toutes les familles, comme elles sont affichées", () => {
    const lignes = [ligne(3, { bas: 19.99, vendu: true }), ligne(3, { bas: 19.99, vendu: true }), ligne(10, { devise: "USD" })];
    const v = valeurLot([famille(lignes.slice(0, 2)), famille(lignes.slice(2))]);
    expect(v).toEqual({ total: 59 + 59 + 910, comptees: 3, nonComptees: 0 });
  });

  it("additionne plusieurs devises en un seul total en dollars canadiens", () => {
    const v = valeurLot([
      famille([ligne(1, { vendu: true }), ligne(1, { devise: "USD", vendu: true }), ligne(1, { devise: "EUR", vendu: true })]),
    ]);
    expect(v.total).toBe(100 + 130 + 145);
  });

  it("signale les lignes pas comptées", () => {
    const v = valeurLot([famille([ligne(2, { vendu: true }), ligne(null, {}), ligne(4, { bas: null })])]);
    expect(v).toEqual({ total: 200, comptees: 1, nonComptees: 2 });
  });

  it("donne zéro ligne comptée pour une famille sans ligne ou sans prix", () => {
    expect(valeurLot([])).toEqual({ total: 0, comptees: 0, nonComptees: 0 });
    expect(valeurLot([famille([]), famille([ligne(4, { bas: null })])])).toEqual({ total: 0, comptees: 0, nonComptees: 1 });
  });
});

describe("reventeEnGros", () => {
  it("donne 40 à 60 % de la valeur minimale, arrondis à la baisse", () => {
    expect(reventeEnGros(1000)).toEqual({ bas: 400, haut: 600 });
    expect(reventeEnGros(1999)).toEqual({ bas: 799, haut: 1199 });
  });
});
