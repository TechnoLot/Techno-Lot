import { describe, expect, it } from "vitest";
import {
  choisirRecherche,
  domainesDe,
  fusionResultats,
  lireArticlesStockes,
  lireResultats,
  type LigneFile,
} from "@/lib/acheteurs/recherche";
import type { FamilleResultat, ResultatRecherche } from "@/lib/acheteurs/types";

/*
 * File des recherches d'acheteurs (logique pure). Compagnies fictives
 * (domaines en .example) : le dépôt est public.
 */

const T0 = Date.parse("2026-11-03T15:00:00.000Z");
const iso = (minutes: number) => new Date(T0 + minutes * 60_000).toISOString();

function ligne(extra: Partial<LigneFile>): LigneFile {
  return { id: "a", statut: "en_attente", demande_le: iso(0), pris_le: null, jeton: null, ...extra };
}

function famille(nom: string, domaines: string[], extra: Partial<FamilleResultat> = {}): FamilleResultat {
  return {
    nom,
    rare: false,
    lignes: [{ article: nom, quantite: 4, etat: null, prix: { bas: null, haut: null, devise: null, base: null, sources: [] } }],
    acheteurs: domaines.map((domaine) => ({ domaine, raison: null, preuve: `https://${domaine}/`, confiance: "a_sonder" })),
    ...extra,
  };
}

function resultat(familles: FamilleResultat[], objet = "Lot"): ResultatRecherche {
  return { familles, courriels: { fr: { objet, message: "Bonjour" }, en: null } };
}

describe("choisirRecherche", () => {
  it("rien à prendre", () => {
    expect(choisirRecherche([], T0)).toBeNull();
    expect(choisirRecherche([ligne({ statut: "resultats" }), ligne({ statut: "echec" })], T0)).toBeNull();
  });

  it("prend la plus ancienne demande en attente", () => {
    const r = choisirRecherche(
      [ligne({ id: "recente", demande_le: iso(-1) }), ligne({ id: "ancienne", demande_le: iso(-20) })],
      T0,
    );
    expect(r?.id).toBe("ancienne");
  });

  it("laisse une recherche en cours depuis moins de 30 minutes", () => {
    const enCours = ligne({ id: "c", statut: "en_cours", pris_le: iso(-10), jeton: "j" });
    expect(choisirRecherche([enCours], T0)).toBeNull();
  });

  it("reprend une recherche abandonnée (prise il y a plus de 30 minutes)", () => {
    const abandonnee = ligne({ id: "c", statut: "en_cours", demande_le: iso(-60), pris_le: iso(-31), jeton: "j" });
    const attente = ligne({ id: "a", demande_le: iso(-5) });
    expect(choisirRecherche([attente, abandonnee], T0)?.id).toBe("c");
  });
});

describe("lireResultats et domainesDe", () => {
  it("refuse ce qui n'a pas la forme des résultats", () => {
    expect(lireResultats(null)).toBeNull();
    expect(lireResultats({ familles: "x", courriels: {} })).toBeNull();
    expect(lireResultats({ familles: [] })).toBeNull();
  });

  it("domaines une fois chacun, dans l'ordre des familles", () => {
    const r = resultat([famille("A", ["un.example", "deux.example"]), famille("B", ["deux.example", "trois.example"])]);
    expect(lireResultats(r)).toBe(r);
    expect(domainesDe(r)).toEqual(["un.example", "deux.example", "trois.example"]);
    expect(domainesDe(null)).toEqual([]);
  });
});

describe("lireArticlesStockes", () => {
  it("garde les articles lisibles seulement", () => {
    expect(
      lireArticlesStockes([
        { quantite: 12, description: "Cisco Meraki MR57" },
        { quantite: null, description: "Lot de câbles" },
        { quantite: -1, description: "Négatif" },
        { description: "" },
        "texte",
      ]),
    ).toEqual([
      { quantite: 12, description: "Cisco Meraki MR57" },
      { quantite: null, description: "Lot de câbles" },
    ]);
    expect(lireArticlesStockes(null)).toEqual([]);
  });
});

describe("fusionResultats", () => {
  it("ajoute les nouvelles compagnies à la même famille, une fois chacune", () => {
    const ancien = resultat([famille("Tectrol TC91S", ["un.example"])]);
    const nouveau = resultat([famille("tectrol  tc91s", ["un.example", "deux.example"], { rare: true })], "Nouveau lot");
    const f = fusionResultats(ancien, nouveau);
    expect(f.familles).toHaveLength(1);
    expect(f.familles[0].acheteurs.map((a) => a.domaine)).toEqual(["un.example", "deux.example"]);
    expect(f.familles[0].rare).toBe(true);
    expect(f.courriels.fr?.objet).toBe("Nouveau lot");
    // L'ancien résultat n'est pas modifié.
    expect(ancien.familles[0].acheteurs).toHaveLength(1);
  });

  it("garde les prix connus, reprend ceux de la nouvelle recherche sinon", () => {
    const avecPrix = famille("A", ["un.example"], {
      lignes: [{ article: "A", quantite: 1, etat: null, prix: { bas: 10, haut: 20, devise: "CAD", base: null, sources: [] } }],
    });
    const autrePrix = famille("A", ["deux.example"], {
      lignes: [{ article: "A", quantite: 1, etat: null, prix: { bas: 99, haut: 99, devise: "CAD", base: null, sources: [] } }],
    });
    expect(fusionResultats(resultat([avecPrix]), resultat([autrePrix])).familles[0].lignes[0].prix.bas).toBe(10);
    expect(fusionResultats(resultat([famille("A", ["un.example"])]), resultat([autrePrix])).familles[0].lignes[0].prix.bas).toBe(99);
  });

  it("ne compte pas deux fois une ligne quand Claude renomme la famille", () => {
    const prix = { bas: 10, haut: 20, devise: "CAD", base: null, sources: [] };
    const ancien = famille("Cisco Meraki", ["un.example"], {
      lignes: [{ article: "Meraki MR57", quantite: 12, etat: "usagé", prix }],
    });
    const renommee = famille("Meraki MR", ["deux.example"], {
      lignes: [
        { article: "meraki  MR57", quantite: 12, etat: "Usagé", prix },
        { article: "Meraki MR57", quantite: 3, etat: "neuf", prix },
      ],
    });
    const f = fusionResultats(resultat([ancien]), resultat([renommee]));
    expect(f.familles.map((x) => x.lignes.map((l) => l.quantite))).toEqual([[12], [3]]);
    // Ses compagnies restent : c'est pour elles que la recherche a été lancée.
    expect(domainesDe(f)).toEqual(["un.example", "deux.example"]);
  });

  it("ajoute une nouvelle famille à la fin et garde l'ancien courriel si le nouveau manque", () => {
    const ancien = resultat([famille("A", ["un.example"])], "Ancien");
    const nouveau: ResultatRecherche = { familles: [famille("B", ["deux.example"])], courriels: { fr: null, en: null } };
    const f = fusionResultats(ancien, nouveau);
    expect(f.familles.map((x) => x.nom)).toEqual(["A", "B"]);
    expect(f.courriels.fr?.objet).toBe("Ancien");
  });
});
