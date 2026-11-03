import { describe, expect, it } from "vitest";
import {
  EBAY_A_EXPEDIER_URL,
  classerSuivis,
  commandesAExpedier,
  debutLectureEbay,
  ilYa,
  joursEntre,
  listeNoms,
  prochainsAccueil,
  resumeAccueil,
  tachesAccueil,
  titreCommande,
  ventesEbayAccueil,
  type EntreesTaches,
  type RamassageAccueil,
  type SuiviAVenir,
  type SuiviCandidat,
  type SuiviDu,
} from "@/lib/admin/accueil";
import { bornesPeriode } from "@/lib/admin/periodes";
import type { EbayCountable, EbayOrderItem, EbayOrderRow } from "@/lib/ebay/totaux";
import type { LeadStatus } from "@/lib/crm/types";

/*
 * Accueil de l'admin (lib/admin/accueil.ts), module pur. Instant fixe :
 * lundi 2 novembre 2026, 10 h à Toronto (UTC−5 : l'heure d'été a fini le
 * dimanche 1er novembre 2026 à 2 h).
 */
const NOW = new Date("2026-11-02T15:00:00Z");

/* ------------------------------------------------------------------ */
/* Commandes eBay à expédier                                           */
/* ------------------------------------------------------------------ */

type Expedition = Pick<
  EbayOrderRow,
  "order_id" | "created_at" | "items" | "cancelled" | "payment_status" | "fulfillment_status"
>;

function commande(p: Partial<Expedition> & { order_id: string }): Expedition {
  return {
    created_at: "2026-11-01T15:00:00Z",
    items: [],
    cancelled: false,
    payment_status: "PAID",
    fulfillment_status: "NOT_STARTED",
    ...p,
  };
}

describe("commandesAExpedier", () => {
  const rows: Expedition[] = [
    commande({ order_id: "recente", created_at: "2026-11-02T12:00:00Z" }),
    commande({ order_id: "annulee", cancelled: true }),
    commande({ order_id: "remboursee", payment_status: "FULLY_REFUNDED" }),
    commande({ order_id: "attente", payment_status: "PENDING" }),
    commande({ order_id: "echec", payment_status: "FAILED" }),
    commande({ order_id: "attente-minuscules", payment_status: "pending" }),
    commande({ order_id: "expediee", fulfillment_status: "FULFILLED" }),
    commande({ order_id: "sans-statut", fulfillment_status: null }),
    commande({ order_id: "ancienne", created_at: "2026-10-28T15:00:00Z", fulfillment_status: "IN_PROGRESS" }),
    commande({ order_id: "partiel", created_at: "2026-10-30T15:00:00Z", payment_status: "PARTIALLY_REFUNDED" }),
    commande({ order_id: "paiement-null", created_at: "2026-10-31T15:00:00Z", payment_status: null }),
    commande({ order_id: "minuscules", created_at: "2026-11-01T18:00:00Z", fulfillment_status: "not_started" }),
  ];

  it("garde seulement les commandes payées, non annulées et pas encore expédiées", () => {
    expect(commandesAExpedier(rows).map((r) => r.order_id)).toEqual([
      "ancienne",
      "partiel",
      "paiement-null",
      "minuscules",
      "recente",
    ]);
  });

  it("renvoie une nouvelle liste sans muter l'entrée", () => {
    const copie = rows.map((r) => ({ ...r }));
    const ordre = rows.map((r) => r.order_id);
    const res = commandesAExpedier(rows);
    expect(res).not.toBe(rows);
    expect(rows.map((r) => r.order_id)).toEqual(ordre);
    expect(rows).toEqual(copie);
  });

  it("liste vide → liste vide", () => {
    expect(commandesAExpedier([])).toEqual([]);
  });

  it("URL du Gestionnaire des ventes", () => {
    expect(EBAY_A_EXPEDIER_URL).toBe("https://www.ebay.ca/sh/ord/?filter=status:AWAITING_SHIPMENT");
  });
});

describe("titreCommande", () => {
  const item = (title: string, quantity = 1): EbayOrderItem => ({ title, quantity, price: 10, itemId: null });

  it("premier article, quantité et autres articles", () => {
    expect(titreCommande({ order_id: "1", items: [item("Dell Latitude 5490")] })).toBe("Dell Latitude 5490");
    expect(titreCommande({ order_id: "1", items: [item("Dell", 2)] })).toBe("Dell × 2");
    expect(titreCommande({ order_id: "1", items: [item("Dell"), item("HP")] })).toBe("Dell + 1 autre");
    expect(titreCommande({ order_id: "1", items: [item("Dell", 3), item("HP"), item("Lenovo")] })).toBe(
      "Dell × 3 + 2 autres",
    );
  });

  it("sans titre ni article → numéro de commande", () => {
    expect(titreCommande({ order_id: "12-345", items: [] })).toBe("Commande 12-345");
    expect(titreCommande({ order_id: "12-345", items: [item("   ")] })).toBe("Commande 12-345");
    expect(titreCommande({ order_id: "9", items: null as unknown as EbayOrderItem[] })).toBe("Commande 9");
  });
});

/* ------------------------------------------------------------------ */
/* Dates relatives et listes de noms                                   */
/* ------------------------------------------------------------------ */

describe("joursEntre", () => {
  it("jours de calendrier", () => {
    expect(joursEntre("2026-11-02", "2026-11-02")).toBe(0);
    expect(joursEntre("2026-10-30", "2026-11-02")).toBe(3);
    expect(joursEntre("2026-11-02", "2026-10-30")).toBe(-3);
    expect(joursEntre("2026-02-28", "2026-03-01")).toBe(1);
    expect(joursEntre("2028-02-28", "2028-03-01")).toBe(2);
    expect(joursEntre("2025-12-31", "2026-01-01")).toBe(1);
    // Changement d'heure sans effet (calcul UTC)
    expect(joursEntre("2026-10-31", "2026-11-02")).toBe(2);
    expect(joursEntre("2026-03-07", "2026-03-09")).toBe(2);
  });

  it("NaN si un jour est mal formé", () => {
    expect(joursEntre("2026-11-2", "2026-11-02")).toBeNaN();
    expect(joursEntre("2026-11-02", "")).toBeNaN();
    expect(joursEntre("2026-11-02T00:00:00Z", "2026-11-02")).toBeNaN();
  });
});

describe("ilYa", () => {
  it("à l’instant (moins d'une minute, ou futur)", () => {
    expect(ilYa("2026-11-02T15:00:00Z", NOW)).toBe("à l’instant");
    expect(ilYa("2026-11-02T14:59:01Z", NOW)).toBe("à l’instant");
    expect(ilYa("2026-11-02T16:00:00Z", NOW)).toBe("à l’instant");
  });

  it("minutes", () => {
    expect(ilYa("2026-11-02T14:59:00Z", NOW)).toBe("il y a 1 min");
    expect(ilYa("2026-11-02T14:55:00Z", NOW)).toBe("il y a 5 min");
    expect(ilYa("2026-11-02T14:00:01Z", NOW)).toBe("il y a 59 min");
  });

  it("heures, le même jour de Toronto", () => {
    expect(ilYa("2026-11-02T14:00:00Z", NOW)).toBe("il y a 1 h");
    expect(ilYa("2026-11-02T12:00:00Z", NOW)).toBe("il y a 3 h");
    // 0 h 30 à Toronto, même jour
    expect(ilYa("2026-11-02T05:30:00Z", NOW)).toBe("il y a 9 h");
  });

  it("hier, selon le calendrier de Toronto", () => {
    // 1er nov. 22 h 30 à Toronto (3 h 30 UTC le 2) : la veille
    expect(ilYa("2026-11-02T03:30:00Z", NOW)).toBe("hier");
    expect(ilYa("2026-11-01T05:00:00Z", NOW)).toBe("hier");
    // Une minute après minuit à Toronto : déjà aujourd'hui
    expect(ilYa("2026-11-02T05:01:00Z", NOW)).toBe("il y a 9 h");
  });

  it("jours", () => {
    expect(ilYa("2026-10-31T15:00:00Z", NOW)).toBe("il y a 2 j");
    expect(ilYa("2026-10-28T12:00:00Z", NOW)).toBe("il y a 5 j");
    expect(ilYa("2026-10-02T15:00:00Z", NOW)).toBe("il y a 31 j");
  });

  it("instant invalide → chaîne vide", () => {
    expect(ilYa("pas une date", NOW)).toBe("");
    expect(ilYa("", NOW)).toBe("");
  });
});

describe("listeNoms", () => {
  it("exemples", () => {
    expect(listeNoms(["A"], 1)).toBe("A");
    expect(listeNoms(["A", "B"], 2)).toBe("A et B");
    expect(listeNoms(["A", "B", "C"], 3)).toBe("A, B et 1 autre");
    expect(listeNoms(["A", "B"], 6)).toBe("A, B et 4 autres");
    expect(listeNoms(["A"], 5)).toBe("A et 4 autres");
  });

  it("total par défaut = nombre de noms", () => {
    expect(listeNoms(["A", "B", "C", "D"])).toBe("A, B et 2 autres");
    expect(listeNoms(["A"])).toBe("A");
  });

  it("noms nettoyés, vides retirés", () => {
    expect(listeNoms(["  Jean Tremblay  ", "", "   ", "Marie Roy"], 2)).toBe("Jean Tremblay et Marie Roy");
    expect(listeNoms(["", "A"], 1)).toBe("A");
    expect(listeNoms(["", " "], 2)).toBe("");
    expect(listeNoms([], 0)).toBe("");
    expect(listeNoms([], 3)).toBe("");
  });

  it("total nul ou négatif → chaîne vide ; reste jamais négatif", () => {
    expect(listeNoms(["A"], 0)).toBe("");
    expect(listeNoms(["A"], -2)).toBe("");
    expect(listeNoms(["A", "B", "C"], 1)).toBe("A et B");
  });
});

/* ------------------------------------------------------------------ */
/* Suivis du CRM                                                       */
/* ------------------------------------------------------------------ */

function compagnie(
  id: string,
  lead_status: LeadStatus,
  lead_status_changed_at: string,
  next_followup_on: string | null = null,
  name = id,
): SuiviCandidat {
  return { id, name, lead_status, lead_status_changed_at, next_followup_on };
}

const LONGTEMPS = "2026-01-01T12:00:00Z";

describe("classerSuivis", () => {
  it("note du jour et note passée → dus", () => {
    const { dus, aVenir } = classerSuivis(
      [
        compagnie("jour", "not_contacted", LONGTEMPS, "2026-11-02"),
        compagnie("passee", "not_contacted", LONGTEMPS, "2026-10-30"),
        compagnie("pas-interesse", "not_interested", LONGTEMPS, "2026-11-01"),
      ],
      NOW,
    );
    expect(dus).toEqual([
      { id: "passee", name: "passee", lead_status: "not_contacted", retard: 3 },
      { id: "pas-interesse", name: "pas-interesse", lead_status: "not_interested", retard: 1 },
      { id: "jour", name: "jour", lead_status: "not_contacted", retard: 0 },
    ]);
    expect(aVenir).toEqual([]);
  });

  it("note future ≤ 7 j → à venir (note) ; au-delà → rien", () => {
    const { dus, aVenir } = classerSuivis(
      [
        compagnie("j3", "contacted", "2026-11-02T13:00:00Z", "2026-11-05"),
        compagnie("j7", "not_contacted", LONGTEMPS, "2026-11-09"),
        compagnie("j8", "not_contacted", LONGTEMPS, "2026-11-10"),
      ],
      NOW,
    );
    expect(dus).toEqual([]);
    expect(aVenir).toEqual([
      { id: "j3", name: "j3", lead_status: "contacted", jour: "2026-11-05", note: true },
      { id: "j7", name: "j7", lead_status: "not_contacted", jour: "2026-11-09", note: true },
    ]);
  });

  it("délai de statut dépassé → dû (intéressé changé il y a 4 j : retard 1)", () => {
    const { dus, aVenir } = classerSuivis([compagnie("int", "interested", "2026-10-29T15:00:00Z")], NOW);
    expect(dus).toEqual([{ id: "int", name: "int", lead_status: "interested", retard: 1 }]);
    expect(aVenir).toEqual([]);
  });

  it("délai atteint pile aujourd'hui → dû, retard 0", () => {
    const { dus } = classerSuivis([compagnie("c7", "contacted", "2026-10-26T15:00:00Z")], NOW);
    expect(dus).toEqual([{ id: "c7", name: "c7", lead_status: "contacted", retard: 0 }]);
  });

  it("contacté il y a 6 j → à venir demain (statut)", () => {
    const { dus, aVenir } = classerSuivis([compagnie("c6", "contacted", "2026-10-27T15:00:00Z")], NOW);
    expect(dus).toEqual([]);
    expect(aVenir).toEqual([{ id: "c6", name: "c6", lead_status: "contacted", jour: "2026-11-03", note: false }]);
  });

  it("intéressé changé ce matin → à venir dans 3 j", () => {
    const { aVenir } = classerSuivis([compagnie("int", "interested", "2026-11-02T13:00:00Z")], NOW);
    expect(aVenir).toEqual([{ id: "int", name: "int", lead_status: "interested", jour: "2026-11-05", note: false }]);
  });

  it("délai qui tombe plus tard aujourd'hui → à venir aujourd'hui", () => {
    // Contacté le 26 oct. 16 h (Toronto) : 7 j pile le 2 nov. 15 h, après 10 h
    const { dus, aVenir } = classerSuivis([compagnie("tard", "contacted", "2026-10-26T20:00:00Z")], NOW);
    expect(dus).toEqual([]);
    expect(aVenir).toEqual([{ id: "tard", name: "tard", lead_status: "contacted", jour: "2026-11-02", note: false }]);
  });

  it("contacté hier → délai dans 6 j (dans l'horizon) ; jamais au-delà de 7 j", () => {
    const { aVenir } = classerSuivis([compagnie("c1", "contacted", "2026-11-01T15:00:00Z")], NOW);
    expect(aVenir).toEqual([{ id: "c1", name: "c1", lead_status: "contacted", jour: "2026-11-08", note: false }]);
  });

  it("non contacté ou pas intéressé sans note → rien", () => {
    const res = classerSuivis(
      [compagnie("nc", "not_contacted", LONGTEMPS), compagnie("ni", "not_interested", LONGTEMPS)],
      NOW,
    );
    expect(res).toEqual({ dus: [], aVenir: [] });
  });

  it("note future + statut dû → à venir seulement (comme la page Suivis)", () => {
    const { dus, aVenir } = classerSuivis([compagnie("int", "interested", "2026-10-20T15:00:00Z", "2026-11-04")], NOW);
    expect(dus).toEqual([]);
    expect(aVenir).toEqual([{ id: "int", name: "int", lead_status: "interested", jour: "2026-11-04", note: true }]);
  });

  it("note future au-delà de 7 j + statut dû → rien du tout", () => {
    const res = classerSuivis([compagnie("int", "interested", "2026-10-20T15:00:00Z", "2026-11-20")], NOW);
    expect(res).toEqual({ dus: [], aVenir: [] });
  });

  it("note passée + statut : le plus grand retard ; pas de rappel à venir de statut", () => {
    const res = classerSuivis(
      [
        // Note il y a 1 j, intéressé il y a 8 j (retard 5)
        compagnie("a", "interested", "2026-10-25T15:00:00Z", "2026-11-01"),
        // Note il y a 4 j, contacté hier (délai dans 6 j) : seulement la note
        compagnie("b", "contacted", "2026-11-01T15:00:00Z", "2026-10-29"),
      ],
      NOW,
    );
    expect(res.dus).toEqual([
      { id: "a", name: "a", lead_status: "interested", retard: 5 },
      { id: "b", name: "b", lead_status: "contacted", retard: 4 },
    ]);
    expect(res.aVenir).toEqual([]);
  });

  it("date de note mal formée → ignorée (seul le statut compte)", () => {
    const res = classerSuivis(
      [
        compagnie("mal", "not_contacted", LONGTEMPS, "2026-11-2"),
        compagnie("texte", "not_contacted", LONGTEMPS, "demain"),
        compagnie("vide", "not_contacted", LONGTEMPS, ""),
        compagnie("mal-int", "interested", "2026-10-28T15:00:00Z", "2026-11-0X"),
      ],
      NOW,
    );
    expect(res.dus).toEqual([{ id: "mal-int", name: "mal-int", lead_status: "interested", retard: 2 }]);
    expect(res.aVenir).toEqual([]);
  });

  it("date de changement de statut illisible → délai ignoré", () => {
    const res = classerSuivis([compagnie("x", "interested", "pas une date")], NOW);
    expect(res).toEqual({ dus: [], aVenir: [] });
  });

  it("tris : retard décroissant, intéressé d'abord, puis nom (fr)", () => {
    const { dus } = classerSuivis(
      [
        compagnie("1", "contacted", LONGTEMPS, "2026-11-01", "Alpha"),
        compagnie("2", "interested", LONGTEMPS, "2026-11-01", "Zeta"),
        compagnie("3", "not_contacted", LONGTEMPS, "2026-11-02", "Fox"),
        compagnie("4", "not_contacted", LONGTEMPS, "2026-11-02", "Éclair"),
        compagnie("5", "not_contacted", LONGTEMPS, "2026-11-02", "Delta"),
        compagnie("6", "not_contacted", LONGTEMPS, "2026-10-20", "Omega"),
      ],
      NOW,
    );
    // Zeta (intéressé, statut 300 j) a le plus grand retard ; le reste suit.
    expect(dus.map((d) => [d.name, d.retard])).toEqual([
      ["Zeta", 302],
      ["Alpha", 298],
      ["Omega", 13],
      ["Delta", 0],
      ["Éclair", 0],
      ["Fox", 0],
    ]);
  });

  it("tris : à égalité de retard, intéressé avant les autres", () => {
    const { dus } = classerSuivis(
      [
        compagnie("1", "not_contacted", LONGTEMPS, "2026-11-01", "Alpha"),
        compagnie("2", "interested", "2026-10-29T15:00:00Z", null, "Zeta"),
      ],
      NOW,
    );
    expect(dus.map((d) => d.name)).toEqual(["Zeta", "Alpha"]);
  });

  it("tris : à venir par jour, puis nom", () => {
    const { aVenir } = classerSuivis(
      [
        compagnie("1", "not_contacted", LONGTEMPS, "2026-11-06", "Bravo"),
        compagnie("2", "not_contacted", LONGTEMPS, "2026-11-04", "Zulu"),
        compagnie("3", "not_contacted", LONGTEMPS, "2026-11-06", "Écho"),
        compagnie("4", "contacted", "2026-10-27T15:00:00Z", null, "Alpha"),
      ],
      NOW,
    );
    expect(aVenir.map((s) => [s.jour, s.name])).toEqual([
      ["2026-11-03", "Alpha"],
      ["2026-11-04", "Zulu"],
      ["2026-11-06", "Bravo"],
      ["2026-11-06", "Écho"],
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* « À faire aujourd’hui »                                             */
/* ------------------------------------------------------------------ */

const VIDE: EntreesTaches = {
  expeditions: [],
  soumissions: { erreur: false, liste: [] },
  suivis: [],
  negociation: { total: 0, lots: [] },
  prix: { total: 0, lots: [] },
};

const article = (title: string, quantity = 1): EbayOrderItem => ({ title, quantity, price: 10, itemId: null });

const exp = (order_id: string, created_at: string, items: EbayOrderItem[] = [article("Dell Latitude")]) => ({
  order_id,
  created_at,
  items,
});

describe("tachesAccueil", () => {
  it("tout vide → aucune tâche", () => {
    expect(tachesAccueil(VIDE, NOW)).toEqual([]);
  });

  it("eBay : une commande vendue aujourd'hui", () => {
    expect(tachesAccueil({ ...VIDE, expeditions: [exp("1", "2026-11-02T13:00:00Z")] }, NOW)).toEqual([
      {
        cle: "ebay",
        titre: "Expédier 1 commande eBay",
        detail: "Dell Latitude",
        meta: "Vendue aujourd’hui",
        urgent: false,
        href: EBAY_A_EXPEDIER_URL,
        externe: true,
      },
    ]);
  });

  it("eBay : vendue hier (y compris 22 h 30 la veille à Toronto)", () => {
    const [t] = tachesAccueil({ ...VIDE, expeditions: [exp("1", "2026-11-02T03:30:00Z")] }, NOW);
    expect(t.meta).toBe("Vendue hier");
    expect(t.urgent).toBe(false);
  });

  it("eBay : il y a 2 j → urgent", () => {
    const [t] = tachesAccueil({ ...VIDE, expeditions: [exp("1", "2026-10-31T15:00:00Z")] }, NOW);
    expect(t.meta).toBe("Vendue il y a 2 j");
    expect(t.urgent).toBe(true);
  });

  it("eBay : plusieurs commandes, la plus ancienne décrit la tâche", () => {
    const [t] = tachesAccueil(
      {
        ...VIDE,
        expeditions: [
          exp("1", "2026-10-30T15:00:00Z", [article("Dell Latitude", 2), article("HP")]),
          exp("2", "2026-11-01T15:00:00Z"),
          exp("3", "2026-11-02T14:00:00Z"),
        ],
      },
      NOW,
    );
    expect(t).toEqual({
      cle: "ebay",
      titre: "Expédier 3 commandes eBay",
      detail: "Dell Latitude × 2 + 1 autre · et 2 autres",
      meta: "Vendue il y a 3 j",
      urgent: true,
      href: EBAY_A_EXPEDIER_URL,
      externe: true,
    });
    const [deux] = tachesAccueil(
      { ...VIDE, expeditions: [exp("9", "2026-11-02T14:00:00Z", []), exp("2", "2026-11-02T14:30:00Z")] },
      NOW,
    );
    expect(deux.titre).toBe("Expédier 2 commandes eBay");
    expect(deux.detail).toBe("Commande 9 · et 1 autre");
  });

  it("soumissions : une seule", () => {
    expect(
      tachesAccueil(
        { ...VIDE, soumissions: { erreur: false, liste: [{ nom: " Jean Tremblay ", date: "2026-11-02T13:00:00Z" }] } },
        NOW,
      ),
    ).toEqual([
      {
        cle: "soumissions",
        titre: "Traiter 1 soumission",
        detail: "Jean Tremblay",
        meta: "Reçue il y a 2 h",
        urgent: false,
        href: "#soumissions",
        externe: false,
      },
    ]);
  });

  it("soumissions : plusieurs, noms absents → « Sans nom »", () => {
    const [t] = tachesAccueil(
      {
        ...VIDE,
        soumissions: {
          erreur: false,
          liste: [
            { nom: null, date: "2026-11-02T14:55:00Z" },
            { nom: "  ", date: "2026-11-01T15:00:00Z" },
            { nom: "Marie Roy", date: "2026-10-30T15:00:00Z" },
            { nom: "Luc", date: "2026-10-29T15:00:00Z" },
          ],
        },
      },
      NOW,
    );
    expect(t.titre).toBe("Traiter 4 soumissions");
    expect(t.detail).toBe("Sans nom, Sans nom et 2 autres");
    expect(t.meta).toBe("Dernière : il y a 5 min");
    expect(t.urgent).toBe(false);
    expect(t.href).toBe("#soumissions");
  });

  it("soumissions : la dernière reçue hier", () => {
    const [t] = tachesAccueil(
      { ...VIDE, soumissions: { erreur: false, liste: [{ nom: "A", date: "2026-11-01T20:00:00Z" }] } },
      NOW,
    );
    expect(t.meta).toBe("Reçue hier");
  });

  it("soumissions illisibles → tâche d'erreur, même sans liste", () => {
    expect(tachesAccueil({ ...VIDE, soumissions: { erreur: true, liste: [] } }, NOW)).toEqual([
      {
        cle: "soumissions",
        titre: "Soumissions illisibles pour l’instant",
        detail: "Ouvre l’onglet Soumissions pour réessayer",
        meta: null,
        urgent: false,
        href: "/admin/soumissions",
        externe: false,
      },
    ]);
  });

  it("suivis : du jour → « Aujourd’hui », non urgent", () => {
    const suivis: SuiviDu[] = [
      { id: "1", name: "Bureautique Laval", lead_status: "contacted", retard: 0 },
      { id: "2", name: "Info Plus", lead_status: "interested", retard: 0 },
    ];
    expect(tachesAccueil({ ...VIDE, suivis }, NOW)).toEqual([
      {
        cle: "suivis",
        titre: "Faire 2 suivis",
        detail: "Bureautique Laval et Info Plus",
        meta: "Aujourd’hui",
        urgent: false,
        href: "/admin/crm/suivis",
        externe: false,
      },
    ]);
  });

  it("suivis : en retard → plus grand retard, urgent", () => {
    const suivis: SuiviDu[] = [
      { id: "1", name: "A", lead_status: "interested", retard: 4 },
      { id: "2", name: "B", lead_status: "contacted", retard: 1 },
      { id: "3", name: "C", lead_status: "contacted", retard: 0 },
    ];
    const [t] = tachesAccueil({ ...VIDE, suivis }, NOW);
    expect(t.titre).toBe("Faire 3 suivis");
    expect(t.detail).toBe("A, B et 1 autre");
    expect(t.meta).toBe("En retard de 4 j");
    expect(t.urgent).toBe(true);
    const [un] = tachesAccueil({ ...VIDE, suivis: [suivis[1]] }, NOW);
    expect(un.titre).toBe("Faire 1 suivi");
    expect(un.meta).toBe("En retard de 1 j");
  });

  it("négociation : un lot → sa fiche", () => {
    expect(
      tachesAccueil({ ...VIDE, negociation: { total: 1, lots: [{ id: "l1", client_name: "Garage Roy" }] } }, NOW),
    ).toEqual([
      {
        cle: "negociation",
        titre: "Conclure 1 lot en négociation",
        detail: "Garage Roy",
        meta: null,
        urgent: false,
        href: "/admin/lots/l1",
        externe: false,
      },
    ]);
  });

  it("négociation : plusieurs lots (total > lots lus) → liste filtrée", () => {
    const [t] = tachesAccueil(
      {
        ...VIDE,
        negociation: {
          total: 5,
          lots: [
            { id: "l1", client_name: "A" },
            { id: "l2", client_name: "B" },
          ],
        },
      },
      NOW,
    );
    expect(t.titre).toBe("Conclure 5 lots en négociation");
    expect(t.detail).toBe("A, B et 3 autres");
    expect(t.href).toBe("/admin/lots?status=negotiating");
  });

  it("négociation : total 1 sans lot lu → liste, sans détail", () => {
    const [t] = tachesAccueil({ ...VIDE, negociation: { total: 1, lots: [] } }, NOW);
    expect(t.href).toBe("/admin/lots?status=negotiating");
    expect(t.detail).toBeNull();
  });

  it("prix de vente : un lot puis plusieurs", () => {
    expect(tachesAccueil({ ...VIDE, prix: { total: 1, lots: [{ id: "p1", client_name: "École X" }] } }, NOW)).toEqual([
      {
        cle: "prix",
        titre: "Saisir 1 prix de vente",
        detail: "École X",
        meta: null,
        urgent: false,
        href: "/admin/lots/p1",
        externe: false,
      },
    ]);
    const [t] = tachesAccueil(
      {
        ...VIDE,
        prix: {
          total: 3,
          lots: [
            { id: "p1", client_name: "A" },
            { id: "p2", client_name: "B" },
            { id: "p3", client_name: "C" },
          ],
        },
      },
      NOW,
    );
    expect(t.titre).toBe("Saisir 3 prix de vente");
    expect(t.detail).toBe("A, B et 1 autre");
    expect(t.href).toBe("/admin/lots?status=purchased");
  });

  it("ordre fixe ebay, soumissions, suivis, negociation, prix ; tâches vides omises", () => {
    const toutes = tachesAccueil(
      {
        expeditions: [exp("1", "2026-11-02T13:00:00Z")],
        soumissions: { erreur: false, liste: [{ nom: "A", date: "2026-11-02T13:00:00Z" }] },
        suivis: [{ id: "1", name: "A", lead_status: "contacted", retard: 0 }],
        negociation: { total: 2, lots: [{ id: "l1", client_name: "A" }] },
        prix: { total: 1, lots: [{ id: "p1", client_name: "B" }] },
      },
      NOW,
    );
    expect(toutes.map((t) => t.cle)).toEqual(["ebay", "soumissions", "suivis", "negociation", "prix"]);

    const partielles = tachesAccueil(
      { ...VIDE, prix: { total: 1, lots: [] }, suivis: [{ id: "1", name: "A", lead_status: "contacted", retard: 0 }] },
      NOW,
    );
    expect(partielles.map((t) => t.cle)).toEqual(["suivis", "prix"]);
  });
});

describe("prochainsAccueil", () => {
  it("quand, titre, détail, lien et clé ; ordre reçu gardé", () => {
    const aVenir: SuiviAVenir[] = [
      { id: "a", name: "Bureautique Laval", lead_status: "contacted", jour: "2026-11-02", note: false },
      { id: "b", name: "Info Plus", lead_status: "interested", jour: "2026-11-03", note: false },
      { id: "c", name: "Garage Roy", lead_status: "not_contacted", jour: "2026-11-05", note: true },
      { id: "d", name: "École X", lead_status: "contacted", jour: "2026-12-01", note: true },
    ];
    expect(prochainsAccueil(aVenir, NOW)).toEqual([
      {
        type: "suivi",
        cle: "a-2026-11-02",
        jour: "2026-11-02",
        quand: "Plus tard aujourd’hui",
        titre: "Rappeler Bureautique Laval",
        detail: "Contacté",
        href: "/admin/crm/a",
      },
      {
        type: "suivi",
        cle: "b-2026-11-03",
        jour: "2026-11-03",
        quand: "Demain",
        titre: "Rappeler Info Plus",
        detail: "Intéressé",
        href: "/admin/crm/b",
      },
      {
        type: "suivi",
        cle: "c-2026-11-05",
        jour: "2026-11-05",
        quand: "Jeudi 5 nov.",
        titre: "Rappeler Garage Roy",
        detail: "Rappel noté",
        href: "/admin/crm/c",
      },
      {
        type: "suivi",
        cle: "d-2026-12-01",
        jour: "2026-12-01",
        quand: "Mardi 1er déc.",
        titre: "Rappeler École X",
        detail: "Rappel noté",
        href: "/admin/crm/d",
      },
    ]);
  });

  it("liste vide → []", () => {
    expect(prochainsAccueil([], NOW)).toEqual([]);
  });

  it("enchaîne avec classerSuivis", () => {
    const { aVenir } = classerSuivis([compagnie("c6", "contacted", "2026-10-27T15:00:00Z", null, "Bureau")], NOW);
    expect(prochainsAccueil(aVenir, NOW).map((p) => [p.quand, p.detail])).toEqual([["Demain", "Contacté"]]);
  });
});

describe("resumeAccueil", () => {
  it("0, 1, plusieurs", () => {
    expect(resumeAccueil(0)).toBe("Rien d’urgent aujourd’hui");
    expect(resumeAccueil(1)).toBe("1 chose à faire aujourd’hui");
    expect(resumeAccueil(3)).toBe("3 choses à faire aujourd’hui");
  });
});

/* ------------------------------------------------------------------ */
/* Carte « Ventes eBay »                                               */
/* ------------------------------------------------------------------ */

describe("debutLectureEbay", () => {
  it("jour normal : le 1er avril de l'année fiscale", () => {
    expect(debutLectureEbay("2026-11-02")).toBe("2026-04-01");
    expect(debutLectureEbay("2027-01-15")).toBe("2026-04-01");
  });

  it("début d'avril : les 7 derniers jours (barres d'« Aujourd’hui ») remontent avant l'année fiscale", () => {
    // Mercredi 2 avril 2025 : 27 mars, avant même le lundi 31 mars
    expect(debutLectureEbay("2025-04-02")).toBe("2025-03-27");
    // Mercredi 1er avril 2026 et lundi 1er avril 2024
    expect(debutLectureEbay("2026-04-01")).toBe("2026-03-26");
    expect(debutLectureEbay("2024-04-01")).toBe("2024-03-26");
  });

  it("couvre toujours hier, les 7 derniers jours, la semaine, le mois et l'année fiscale", () => {
    for (const jour of ["2026-04-06", "2026-11-01", "2026-11-02", "2027-03-31", "2028-02-29"]) {
      const debut = debutLectureEbay(jour);
      for (const k of ["hier", "7j", "semaine", "mois", "annee"] as const) {
        expect(debut <= bornesPeriode(k, jour).from!).toBe(true);
      }
    }
  });
});

type Vente = EbayCountable & { created_at: string };

function vente(created_at: string, total: number, p: Partial<Vente> = {}): Vente {
  return { created_at, total, refunded: 0, fees: null, cancelled: false, payment_status: "PAID", ...p };
}

describe("ventesEbayAccueil", () => {
  // Mercredi 4 novembre 2026
  const AUJ = "2026-11-04";
  const rows: Vente[] = [
    vente("2026-11-04T15:00:00Z", 100, { fees: 10 }), // aujourd'hui
    vente("2026-11-04T03:30:00Z", 50, { fees: 5 }), // 3 nov. 22 h 30 à Toronto : hier
    vente("2026-11-02T18:00:00Z", 30, { refunded: 10, payment_status: "PARTIALLY_REFUNDED", fees: 3 }), // lundi : 20 $
    vente("2026-11-01T18:00:00Z", 40), // dimanche 1er : mois, pas la semaine
    vente("2026-10-15T15:00:00Z", 200, { fees: 20 }), // année fiscale
    vente("2026-04-01T04:30:00Z", 15, { fees: 1.5 }), // 1er avril 0 h 30 (Toronto) : année fiscale
    vente("2026-04-01T03:30:00Z", 70), // 31 mars 23 h 30 (Toronto) : année d'avant
    vente("2026-11-04T16:00:00Z", 999, { cancelled: true }), // annulée
    vente("2026-11-03T16:00:00Z", 500, { refunded: 500, payment_status: "FULLY_REFUNDED" }), // remboursée
  ];
  const res = ventesEbayAccueil(rows, AUJ);
  const p = Object.fromEntries(res.periodes.map((x) => [x.cle, x]));
  const sommeBarres = (cle: string) =>
    (p[cle].barres ?? [])
      .filter((b) => !b.futur)
      .reduce((s, b) => ({ total: s.total + b.total, commandes: s.commandes + b.commandes }), { total: 0, commandes: 0 });

  it("périodes dans l'ordre, avec onglet, libellé, dates et lien", () => {
    expect(res.periodes.map((x) => [x.cle, x.onglet, x.libelle, x.href])).toEqual([
      ["aujourdhui", "Aujourd’hui", "aujourd’hui", "/admin/ventes-ebay?periode=aujourdhui"],
      ["semaine", "Semaine", "cette semaine", "/admin/ventes-ebay?periode=semaine"],
      ["mois", "Mois", "ce mois-ci", "/admin/ventes-ebay?periode=mois"],
      ["annee", "Année", "cette année fiscale", "/admin/ventes-ebay?periode=annee"],
    ]);
    expect(p.aujourdhui.dates).toBe("Mercredi 4 novembre");
    expect(p.semaine.dates).toBe("Du 2 nov. au 4 nov. 2026");
    expect(p.mois.dates).toBe("Du 1er nov. au 4 nov. 2026");
    expect(p.annee.dates).toBe("Du 1er avr. au 4 nov. 2026");
  });

  it("sommes de chaque période (annulées et remboursées ignorées, remboursement partiel retiré)", () => {
    expect([p.aujourdhui.revenu, p.aujourdhui.commandes, p.aujourdhui.frais]).toEqual([100, 1, 10]);
    expect([p.semaine.revenu, p.semaine.commandes, p.semaine.frais]).toEqual([170, 3, 18]);
    expect([p.mois.revenu, p.mois.commandes, p.mois.frais]).toEqual([210, 4, 18]);
    expect([p.annee.revenu, p.annee.commandes, p.annee.frais]).toEqual([425, 6, 39.5]);
  });

  it("hier : commande de 22 h 30 la veille (Toronto) comptée hier", () => {
    expect(res.hier).toEqual({ revenu: 50, commandes: 1 });
  });

  it("frais inconnus → null", () => {
    const r = ventesEbayAccueil([vente("2026-11-04T15:00:00Z", 40)], AUJ);
    expect(r.periodes[0].frais).toBeNull();
    expect(ventesEbayAccueil([], AUJ).periodes.map((x) => [x.revenu, x.commandes, x.frais])).toEqual([
      [0, 0, null],
      [0, 0, null],
      [0, 0, null],
      [0, 0, null],
    ]);
    expect(ventesEbayAccueil([], AUJ).hier).toEqual({ revenu: 0, commandes: 0 });
  });

  it("aujourd'hui : les 7 derniers jours, aujourd'hui en dernier et courant", () => {
    const b = p.aujourdhui.barres;
    expect(b.map((x) => x.cle)).toEqual([
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
    expect(b.map((x) => x.etiquette)).toEqual(["jeu.", "ven.", "sam.", "dim.", "lun.", "mar.", "mer."]);
    expect(b.filter((x) => x.courant).map((x) => x.cle)).toEqual(["2026-11-04"]);
    expect(b.some((x) => x.futur)).toBe(false);
    // La barre courante = le chiffre du jour ; la veille = « hier »
    expect(b[6].total).toBe(p.aujourdhui.revenu);
    expect([b[5].total, b[5].commandes]).toEqual([res.hier.revenu, res.hier.commandes]);
    expect([b[3].total, b[4].total]).toEqual([40, 20]);
  });

  it("le total de chaque période = la somme de ses barres non futures", () => {
    for (const cle of ["semaine", "mois", "annee"]) {
      const s = sommeBarres(cle);
      expect(Math.round(s.total * 100) / 100).toBe(p[cle].revenu);
      expect(s.commandes).toBe(p[cle].commandes);
    }
  });

  it("semaine : 7 barres du lundi au dimanche, aujourd'hui courant, la suite future", () => {
    const b = p.semaine.barres!;
    expect(b.map((x) => x.cle)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(b.map((x) => x.etiquette)).toEqual(["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]);
    expect(b.map((x) => x.titre)).toEqual([
      "Lundi 2 nov.",
      "Mardi 3 nov.",
      "Mercredi 4 nov.",
      "Jeudi 5 nov.",
      "Vendredi 6 nov.",
      "Samedi 7 nov.",
      "Dimanche 8 nov.",
    ]);
    expect(b.map((x) => x.courant)).toEqual([false, false, true, false, false, false, false]);
    expect(b.map((x) => x.futur)).toEqual([false, false, false, true, true, true, true]);
    expect(b.map((x) => [x.total, x.commandes])).toEqual([
      [20, 1],
      [50, 1],
      [100, 1],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
  });

  it("semaine qui chevauche deux mois (dimanche 1er nov.)", () => {
    const b = ventesEbayAccueil(rows, "2026-11-01").periodes[1].barres!;
    expect(b[0].cle).toBe("2026-10-26");
    expect(b[6]).toMatchObject({ cle: "2026-11-01", courant: true, futur: false, total: 40, titre: "Dimanche 1er nov." });
    expect(b.every((x) => !x.futur)).toBe(true);
  });

  it("mois : une barre par jour du mois, étiquettes 1, 15 et dernier jour", () => {
    const b = p.mois.barres!;
    expect(b).toHaveLength(30);
    expect(b[0].cle).toBe("2026-11-01");
    expect(b[29].cle).toBe("2026-11-30");
    expect(b.filter((x) => x.etiquette !== "").map((x) => [x.cle, x.etiquette])).toEqual([
      ["2026-11-01", "1"],
      ["2026-11-15", "15"],
      ["2026-11-30", "30"],
    ]);
    expect(b[0].titre).toBe("Dimanche 1er nov.");
    expect(b.filter((x) => x.courant).map((x) => x.cle)).toEqual(["2026-11-04"]);
    expect(b.filter((x) => !x.futur)).toHaveLength(4);
    expect(b[0].total).toBe(40);
  });

  it("mois : février bissextile (29), février ordinaire (28), mois de 31 jours", () => {
    const fev28 = ventesEbayAccueil([], "2028-02-10").periodes[2].barres!;
    expect(fev28).toHaveLength(29);
    expect(fev28[28]).toMatchObject({ cle: "2028-02-29", etiquette: "29", futur: true });
    const fev27 = ventesEbayAccueil([], "2027-02-28").periodes[2].barres!;
    expect(fev27).toHaveLength(28);
    expect(fev27[27]).toMatchObject({ cle: "2027-02-28", etiquette: "28", courant: true, futur: false });
    const dec = ventesEbayAccueil([], "2026-12-31").periodes[2].barres!;
    expect(dec).toHaveLength(31);
    expect(dec.filter((x) => x.etiquette !== "").map((x) => x.etiquette)).toEqual(["1", "15", "31"]);
    expect(dec.every((x) => !x.futur)).toBe(true);
  });

  it("année fiscale : 12 barres d'avril à mars, étiquettes A…M", () => {
    const b = p.annee.barres!;
    expect(b).toHaveLength(12);
    expect(b.map((x) => x.cle)).toEqual([
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
      "2027-03-01",
    ]);
    expect(b.map((x) => x.etiquette).join("")).toBe("AMJJASONDJFM");
    expect(b[0].titre).toBe("Avril 2026");
    expect(b[7].titre).toBe("Novembre 2026");
    expect(b[11].titre).toBe("Mars 2027");
    expect(b.map((x) => x.courant).indexOf(true)).toBe(7);
    expect(b.filter((x) => x.courant)).toHaveLength(1);
    expect(b.map((x) => x.futur)).toEqual([false, false, false, false, false, false, false, false, true, true, true, true]);
    expect(b.map((x) => x.total)).toEqual([15, 0, 0, 0, 0, 0, 200, 210, 0, 0, 0, 0]);
  });

  it("année fiscale vue en janvier et en mars : même année (avril → mars)", () => {
    const jan = ventesEbayAccueil([], "2027-01-15").periodes[3].barres!;
    expect(jan[0].cle).toBe("2026-04-01");
    expect(jan[11].cle).toBe("2027-03-01");
    expect(jan.findIndex((x) => x.courant)).toBe(9);
    const mars = ventesEbayAccueil([], "2027-03-31").periodes[3].barres!;
    expect(mars[0].cle).toBe("2026-04-01");
    expect(mars.findIndex((x) => x.courant)).toBe(11);
    expect(mars.every((x) => !x.futur)).toBe(true);
    const avril = ventesEbayAccueil([], "2027-04-01").periodes[3].barres!;
    expect(avril[0]).toMatchObject({ cle: "2027-04-01", courant: true, titre: "Avril 2027" });
    expect(avril.slice(1).every((x) => x.futur)).toBe(true);
  });

  it("vue un lundi : la semaine n'a que lundi d'écoulé", () => {
    const b = ventesEbayAccueil(rows, "2026-11-02").periodes[1].barres!;
    expect(b[0]).toMatchObject({ cle: "2026-11-02", courant: true, futur: false });
    expect(b.slice(1).every((x) => x.futur)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Ramassages (Google Agenda)                                          */
/* ------------------------------------------------------------------ */

/** Ramassage de novembre (UTC−5) ; `debut` null = toute la journée. */
function ramassage(
  id: string,
  jour: string,
  debut: string | null,
  fin: string | null,
  client = "Info Plus",
  jourFin = jour,
): RamassageAccueil {
  return {
    id,
    titre: `Ramassage · ${client}`,
    client,
    journee: debut === null,
    jour,
    jourFin,
    heureDebut: debut,
    heureFin: fin,
    debut: debut ? `${jour}T${debut}:00-05:00` : jour,
    fin: fin ? `${jourFin}T${fin}:00-05:00` : jourFin,
  };
}

describe("tachesAccueil — ramassages du jour", () => {
  const avec = (liste: RamassageAccueil[], erreur = false) => tachesAccueil({ ...VIDE, ramassages: { erreur, liste } }, NOW);

  it("agenda non relié ou aucun ramassage aujourd'hui → aucune tâche", () => {
    expect(tachesAccueil(VIDE, NOW)).toEqual([]);
    expect(avec([ramassage("demain", "2026-11-03", "09:00", "10:00")])).toEqual([]);
  });

  it("lecture impossible → ligne d'erreur vers l'onglet Ramassages", () => {
    expect(avec([], true)).toEqual([
      {
        cle: "ramassages",
        titre: "Ramassages illisibles pour l’instant",
        detail: "Ouvre l’onglet Ramassages pour réessayer",
        meta: null,
        urgent: false,
        href: "/admin/ramassages",
        externe: false,
      },
    ]);
  });

  it("heures et clients ; le prochain dans l'heure est urgent (10 h à Toronto)", () => {
    const [t] = avec([
      ramassage("b", "2026-11-02", "10:30", "11:30", "Garage Roy"),
      ramassage("a", "2026-11-02", "08:00", "09:00", "Info Plus"),
      ramassage("demain", "2026-11-03", "09:00", "10:00", "École X"),
    ]);
    expect(t).toEqual({
      cle: "ramassages",
      titre: "Faire 2 ramassages",
      detail: "8 h Info Plus et 10 h 30 Garage Roy",
      meta: "Prochain à 10 h 30",
      urgent: true,
      href: "/admin/ramassages",
      externe: false,
    });
  });

  it("un seul plus tard : « À 15 h », pas urgent ; en cours ; toute la journée ; tous passés", () => {
    expect(avec([ramassage("a", "2026-11-02", "15:00", "16:00")])[0]).toMatchObject({
      titre: "Faire 1 ramassage",
      detail: "15 h Info Plus",
      meta: "À 15 h",
      urgent: false,
    });
    expect(avec([ramassage("a", "2026-11-02", "09:30", "11:00")])[0].meta).toBe("En cours");
    expect(avec([ramassage("a", "2026-11-02", null, null)])[0]).toMatchObject({ detail: "Info Plus", meta: "Toute la journée" });
    expect(avec([ramassage("a", "2026-11-02", "07:00", "08:00")])[0].meta).toBeNull();
  });

  it("un ramassage de plusieurs jours compte aujourd'hui, sans son heure de départ", () => {
    const [t] = avec([ramassage("long", "2026-11-01", "09:00", "17:00", "Dépôt Z", "2026-11-03")]);
    expect(t).toMatchObject({ titre: "Faire 1 ramassage", detail: "Dépôt Z" });
  });

  it("en tête, avant les commandes eBay", () => {
    const taches = tachesAccueil(
      {
        ...VIDE,
        expeditions: [exp("1", "2026-11-02T13:00:00Z")],
        ramassages: { erreur: false, liste: [ramassage("a", "2026-11-02", "15:00", "16:00")] },
      },
      NOW,
    );
    expect(taches.map((t) => t.cle)).toEqual(["ramassages", "ebay"]);
  });
});

describe("prochainsAccueil — ramassages et suivis", () => {
  it("ramassages de demain à dans 7 jours, avant les suivis du même jour", () => {
    const aVenir: SuiviAVenir[] = [
      { id: "s1", name: "Bureautique Laval", lead_status: "contacted", jour: "2026-11-02", note: false },
      { id: "s2", name: "Info Plus", lead_status: "interested", jour: "2026-11-03", note: false },
    ];
    const ramassages = [
      ramassage("aujourdhui", "2026-11-02", "15:00", "16:00", "Déjà dans À faire"),
      ramassage("r2", "2026-11-03", "14:00", "15:00", "Garage Roy"),
      ramassage("r1", "2026-11-03", "09:00", "10:30", "École X"),
      ramassage("r3", "2026-11-09", null, null, "Clinique Y"),
      ramassage("trop-loin", "2026-11-10", "09:00", "10:00"),
    ];
    const prochains = prochainsAccueil(aVenir, NOW, ramassages);
    expect(prochains.map((p) => [p.type, p.quand, p.titre, p.detail])).toEqual([
      ["suivi", "Plus tard aujourd’hui", "Rappeler Bureautique Laval", "Contacté"],
      ["ramassage", "Demain", "Ramassage · École X", "9 h – 10 h 30"],
      ["ramassage", "Demain", "Ramassage · Garage Roy", "14 h – 15 h"],
      ["suivi", "Demain", "Rappeler Info Plus", "Intéressé"],
      ["ramassage", "Lundi 9 nov.", "Ramassage · Clinique Y", "Toute la journée"],
    ]);
    expect(prochains[1]).toMatchObject({ cle: "ramassage-r1", jour: "2026-11-03", href: "/admin/ramassages?date=2026-11-03" });
  });

  it("titre de Google gardé tel quel (événement créé dans Google)", () => {
    const r = { ...ramassage("g", "2026-11-04", "09:00", "10:00"), titre: "Livraison Dell", client: "Livraison Dell" };
    expect(prochainsAccueil([], NOW, [r]).map((p) => p.titre)).toEqual(["Livraison Dell"]);
  });
});
