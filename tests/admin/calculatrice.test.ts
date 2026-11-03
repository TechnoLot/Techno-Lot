import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { prixItemCalculatrice, resumeLotCalculatrice } from "@/lib/admin/calculatrice";
import { CSP_OUTILS, pageOutil } from "@/lib/admin/outils";

/*
 * Calculatrice de lot : résumé des lots enregistrés (lib/admin/calculatrice.ts)
 * et page servie à l'iframe (lib/admin/outils.ts + assets/outils/calculatrice.html).
 */

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("résumé d'un lot enregistré", () => {
  it("nouvelle version : prix unique, prix à payer, soumission", () => {
    const r = resumeLotCalculatrice({
      nom: "Vidéotron",
      offre: 1500,
      soumissionId: "11111111-2222-4333-8444-555555555555",
      items: [
        { desc: "Dell R740", qte: 2, cat: "Serveurs", prix: 450, bas: 450 },
        { desc: "GTX 1080", qte: 3, cat: "", prix: 199.99, bas: 199.99 },
        { desc: "Câbles", qte: 10, cat: "", prix: null, bas: null },
      ],
    });
    expect(r).toEqual({
      valeur: 1499.97,
      offre: 1500,
      items: 3,
      unites: 15,
      soumissionId: "11111111-2222-4333-8444-555555555555",
      description: "2x Dell R740, 3x GTX 1080, 10x Câbles",
    });
  });

  it("anciens lots : le prix le plus bas, sinon le moyen ; aucune offre (fini le 2,5×)", () => {
    const r = resumeLotCalculatrice({
      usd: true,
      taux: 1.4,
      items: [
        { desc: "A", qte: 2, bas: 100, moyen: 150 },
        { desc: "B", qte: 1, bas: null, moyen: 50 },
      ],
    });
    expect(r.valeur).toBe(350);
    expect(r.offre).toBeNull();
    expect(r.soumissionId).toBeNull();
    expect(prixItemCalculatrice({ bas: 0, moyen: 80 })).toBe(0);
    expect(prixItemCalculatrice({ prix: null, bas: null, moyen: null })).toBeNull();
  });

  it("données abîmées ou absentes : rien ne plante", () => {
    for (const d of [null, undefined, "x", 3, [], { items: "x" }, { items: [null, 1, { qte: "a", prix: "b" }] }]) {
      const r = resumeLotCalculatrice(d);
      expect(r.valeur).toBe(0);
      expect(r.offre).toBeNull();
    }
    expect(resumeLotCalculatrice({ soumissionId: "pas un uuid" }).soumissionId).toBeNull();
    expect(resumeLotCalculatrice({ offre: -5 }).offre).toBeNull();
  });
});

describe("page de la calculatrice servie à l'iframe", () => {
  it("l'analyseur est inséré à la place du marqueur", async () => {
    const html = await pageOutil("calculatrice");
    expect(html).not.toContain("<script data-inclure=");
    expect(html).toContain("globalThis.AnalyseLot");
    // Le script inséré vient avant le script de la page, qui l'utilise.
    expect(html.indexOf("racine.AnalyseLot")).toBeLessThan(html.indexOf("const A = window.AnalyseLot"));
  });

  it("l'outil eBay reste servi tel quel", async () => {
    const brut = readFileSync(join(RACINE, "assets", "outils", "ebay-description.html"), "utf8");
    expect(await pageOutil("ebay")).toBe(brut);
  });

  it("chaque élément utilisé par le script existe dans la page, une seule fois", () => {
    const html = readFileSync(join(RACINE, "assets", "outils", "calculatrice.html"), "utf8");
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(doublons).toEqual([]);
    const utilises = new Set([...html.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]));
    expect(utilises.size).toBeGreaterThan(40);
    const manquants = [...utilises].filter((id) => !ids.includes(id));
    expect(manquants).toEqual([]);
    // Icônes demandées par le script (icone("…")) et par la page (#i-…) : toutes définies.
    const symboles = new Set([...html.matchAll(/<symbol id="i-([^"]+)"/g)].map((m) => m[1]));
    const icones = [...html.matchAll(/icone\("([^"]+)"\)/g), ...html.matchAll(/href="#i-([^"]+)"/g), ...html.matchAll(/"#i-([a-z]+)"/g)].map((m) => m[1]);
    expect(icones.filter((i) => !symboles.has(i))).toEqual([]);
  });

  it("aucun gestionnaire en attribut (onclick=…), aucune image intégrée de 100 Ko", () => {
    const html = readFileSync(join(RACINE, "assets", "outils", "calculatrice.html"), "utf8");
    expect(html).not.toMatch(/\son[a-z]+="/i);
    expect(html).not.toMatch(/data:image\//);
    expect(html.length).toBeLessThan(120_000);
  });

  it("la page n'appelle que ses propres routes (CSP connect-src 'self')", () => {
    const html = readFileSync(join(RACINE, "assets", "outils", "calculatrice.html"), "utf8");
    const appels = [...html.matchAll(/fetch\("([^"]+)"/g)].map((m) => m[1]);
    expect(appels.length).toBeGreaterThanOrEqual(4);
    for (const url of appels) expect(url.startsWith("/admin/calculatrice/api/")).toBe(true);
    expect(CSP_OUTILS).toContain("connect-src 'self'");
  });
});
