import { describe, expect, it } from "vitest";
import { extraireJson, lireReponse, urlSure } from "@/lib/acheteurs/reponse";

/*
 * Lecture de la réponse de Claude (agent de l'ordinateur). Compagnies fictives
 * (domaines en .example) : le dépôt est public.
 */

function acheteur(extra: Record<string, unknown> = {}) {
  return {
    compagnie: "Surplus Alpha",
    site: "https://www.alpha.example",
    ville: "Laval",
    region: "Québec",
    pays: "CA",
    confiance: "achete_surplus",
    raison: "Page « Nous achetons »",
    preuve: "https://www.alpha.example/nous-achetons",
    courriel: "ventes@alpha.example",
    telephone: "450-555-0101",
    formulaire: "",
    notes: "",
    ...extra,
  };
}

function reponse(extra: Record<string, unknown> = {}) {
  return {
    familles: [
      {
        famille: "Mean Well RSP",
        rare: false,
        lignes: [
          {
            article: "Mean Well RSP-2400-24",
            quantite: 123,
            etat: "neuf",
            prix: { bas: 175, haut: 472, devise: "USD", base: "ventes eBay", sources: ["https://www.ebay.com/sch/x"] },
          },
        ],
        acheteurs: [acheteur()],
      },
    ],
    courriel_fr: { objet: "Lot à vendre", message: "Bonjour,\n\nNous avons un lot.\nVoir https://piege.example/x" },
    courriel_en: { subject: "Lot for sale", message: "Hello,\n\nWe have a lot." },
    ...extra,
  };
}

const enBloc = (o: unknown) => "Voici la réponse :\n```json\n" + JSON.stringify(o, null, 2) + "\n```\nBonne chance !";

describe("extraireJson", () => {
  it("lit un bloc ```json entouré de texte", () => {
    expect(extraireJson(enBloc({ a: 1 }))).toEqual({ a: 1 });
  });

  it("lit un objet collé sans bloc", () => {
    expect(extraireJson('  {"a": 2}  ')).toEqual({ a: 2 });
  });

  it("rend undefined pour un texte sans JSON", () => {
    expect(extraireJson("rien ici")).toBeUndefined();
  });
});

describe("urlSure", () => {
  it("passe http en https et refuse les autres protocoles", () => {
    expect(urlSure("http://alpha.example/a")).toBe("https://alpha.example/a");
    expect(urlSure("javascript:alert(1)")).toBeNull();
    expect(urlSure("https://...")).toBeNull();
    expect(urlSure("https://user:mdp@alpha.example")).toBeNull();
  });
});

describe("lireReponse", () => {
  it("lit familles, lignes, prix, compagnies et courriels", () => {
    const r = lireReponse(enBloc(reponse()));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.refus).toEqual([]);
    const [famille] = r.resultat.familles;
    expect(famille.lignes[0].prix).toEqual({
      bas: 175,
      haut: 472,
      devise: "USD",
      base: "ventes eBay",
      sources: ["https://www.ebay.com/sch/x"],
    });
    expect(famille.acheteurs).toEqual([
      {
        domaine: "alpha.example",
        raison: "Page « Nous achetons »",
        preuve: "https://www.alpha.example/nous-achetons",
        confiance: "achete_surplus",
      },
    ]);
    expect(r.acheteurs[0]).toMatchObject({
      nom: "Surplus Alpha",
      domaine: "alpha.example",
      pays: "CA",
      courriel: "ventes@alpha.example",
      categories: ["Mean Well RSP"],
      modeles: ["Mean Well RSP-2400-24"],
    });
  });

  it("retire les liens des brouillons de courriel", () => {
    const r = lireReponse(enBloc(reponse()));
    expect(r.ok && r.resultat.courriels.fr?.message).toBe("Bonjour,\n\nNous avons un lot.\nVoir");
    expect(r.ok && r.resultat.courriels.en?.objet).toBe("Lot for sale");
  });

  it("met null pour un prix inconnu, vide ou nul", () => {
    const base = reponse();
    base.familles[0].lignes[0].prix = { bas: "" as never, haut: 0, devise: "", base: "", sources: [] };
    const r = lireReponse(enBloc(base));
    expect(r.ok && r.resultat.familles[0].lignes[0].prix).toEqual({
      bas: null,
      haut: null,
      devise: null,
      base: null,
      sources: [],
    });
  });

  it("refuse une compagnie sans preuve ou sans moyen de la joindre, avec sa raison", () => {
    const base = reponse();
    base.familles[0].acheteurs = [
      acheteur({ compagnie: "Sans preuve", preuve: "" }),
      acheteur({ compagnie: "Injoignable", site: "https://beta.example", preuve: "https://beta.example/p", courriel: "", telephone: "" }),
      acheteur({ compagnie: "Courriel faux", site: "https://gamma.example", preuve: "https://gamma.example/p", courriel: "pas-un-courriel" }),
    ];
    const r = lireReponse(enBloc(base));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.acheteurs.map((a) => a.nom)).toEqual(["Courriel faux"]);
    expect(r.acheteurs[0].courriel).toBeNull();
    expect(r.refus.map((x) => x.raison)).toEqual([
      "Sans preuve : aucune page de preuve valide.",
      "Injoignable : aucun moyen de la joindre.",
      "Courriel faux : courriel invalide ignoré.",
    ]);
  });

  it("garde une seule fiche par domaine, même dans deux familles", () => {
    const base = reponse();
    base.familles.push({
      famille: "Tectrol TC91S",
      rare: true,
      lignes: [{ article: "Tectrol TC91S-1514", quantite: 403, etat: "neuf", prix: { bas: null as never, haut: null as never, devise: "", base: "", sources: [] } }],
      acheteurs: [acheteur({ confiance: "a_sonder", courriel: "", telephone: "514-555-0199" })],
    });
    const r = lireReponse(enBloc(base));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.acheteurs).toHaveLength(1);
    expect(r.acheteurs[0]).toMatchObject({
      confiance: "achete_surplus",
      courriel: "ventes@alpha.example",
      categories: ["Mean Well RSP", "Tectrol TC91S"],
    });
    expect(r.resultat.familles[1].rare).toBe(true);
  });

  it("accepte l'ancien format « articles »", () => {
    const r = lireReponse(
      JSON.stringify({
        articles: [
          {
            article: "Tectrol TC91S-1514",
            quantite: 105,
            rare: true,
            prix: { bas: 0, haut: 0, devise: "", base: "", source: "" },
            acheteurs: [acheteur()],
          },
        ],
      }),
    );
    expect(r.ok && r.resultat.familles[0]).toMatchObject({ nom: "Tectrol TC91S-1514", rare: true });
  });

  it("demande de relancer quand la réponse n'a pas de bloc", () => {
    const r = lireReponse("Claude n'a pas fini sa réponse.");
    expect(r).toEqual({ ok: false, erreur: expect.stringContaining("Relancez") });
  });

  it("refuse une réponse trop longue ou vide", () => {
    expect(lireReponse("   ").ok).toBe(false);
    expect(lireReponse("x".repeat(200_001)).ok).toBe(false);
  });
});
