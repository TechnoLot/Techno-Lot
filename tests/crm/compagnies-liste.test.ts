import { describe, expect, it } from "vitest";
import { paginer, resumePage } from "@/lib/admin/pagination";
import {
  COLONNES_LISTE,
  compagniesAvecAppel,
  dansOrdreDesIds,
  filtrerCompagnies,
  PAR_PAGE,
  seededShuffle,
  type CompagnieListe,
  type ContactListe,
} from "@/lib/crm/compagnies-liste";

function compagnie(id: string, champs: Partial<CompagnieListe> = {}): CompagnieListe {
  return {
    id,
    name: `Compagnie ${id}`,
    domain: null,
    industry: null,
    fit_score: 5,
    region: null,
    research_status: "pending",
    lead_status: "not_contacted",
    lead_status_changed_at: "2026-01-01T00:00:00Z",
    next_followup_on: null,
    is_partner_not_client: false,
    ...champs,
  };
}

const AUCUN_APPEL = new Set<string>();
const ids = (l: { id: string }[]) => l.map((c) => c.id);

describe("COLONNES_LISTE", () => {
  it("contient tout ce que filtres, tri et indicateurs lisent", () => {
    expect(new Set(COLONNES_LISTE.split(", "))).toEqual(new Set(Object.keys(compagnie("a"))));
  });
});

describe("filtrerCompagnies", () => {
  it("masque les partenaires par défaut et les montre sur demande", () => {
    const liste = [compagnie("a"), compagnie("b", { is_partner_not_client: true })];
    expect(ids(filtrerCompagnies(liste, {}, AUCUN_APPEL))).toEqual(["a"]);
    expect(ids(filtrerCompagnies(liste, { partenaires: "1" }, AUCUN_APPEL))).toEqual(["a", "b"]);
    expect(ids(filtrerCompagnies(liste, { partenaires: "0" }, AUCUN_APPEL))).toEqual(["a"]);
  });

  it("cherche sans égard à la casse dans le nom, le domaine et le secteur", () => {
    const liste = [
      compagnie("a", { name: "Acier BOUCHARD" }),
      compagnie("b", { domain: "bouchard.ca" }),
      compagnie("c", { industry: "Bouchardage" }),
      compagnie("d", { name: "Autre" }),
    ];
    expect(ids(filtrerCompagnies(liste, { q: "  bOuChArD " }, AUCUN_APPEL))).toEqual(["a", "b", "c"]);
  });

  it("score minimum : borne incluse, score nul exclu", () => {
    const liste = [
      compagnie("a", { fit_score: 9 }),
      compagnie("b", { fit_score: 7 }),
      compagnie("c", { fit_score: 6 }),
      compagnie("d", { fit_score: null }),
    ];
    expect(ids(filtrerCompagnies(liste, { score: "7" }, AUCUN_APPEL))).toEqual(["a", "b"]);
    expect(ids(filtrerCompagnies(liste, {}, AUCUN_APPEL))).toEqual(["a", "b", "c", "d"]);
    expect(ids(filtrerCompagnies(liste, { score: "abc" }, AUCUN_APPEL))).toEqual(["a", "b", "c", "d"]);
  });

  it("filtre par région, statut de recherche et suivi", () => {
    const liste = [
      compagnie("a", { region: "Laval", research_status: "found", lead_status: "interested" }),
      compagnie("b", { region: "Montréal", research_status: "found", lead_status: "contacted" }),
      compagnie("c", { region: "Laval", research_status: "pending", lead_status: "contacted" }),
    ];
    expect(ids(filtrerCompagnies(liste, { region: "Laval" }, AUCUN_APPEL))).toEqual(["a", "c"]);
    expect(ids(filtrerCompagnies(liste, { status: "found" }, AUCUN_APPEL))).toEqual(["a", "b"]);
    expect(ids(filtrerCompagnies(liste, { suivi: "contacted" }, AUCUN_APPEL))).toEqual(["b", "c"]);
    expect(
      ids(filtrerCompagnies(liste, { region: "Laval", status: "found", suivi: "interested" }, AUCUN_APPEL)),
    ).toEqual(["a"]);
  });

  it("appel oui / non selon les contacts à l'étape call_done", () => {
    const contacts: ContactListe[] = [
      { id: "1", company_id: "a", stage: "call_done" },
      { id: "2", company_id: "b", stage: "contacted" },
      { id: "3", company_id: null, stage: "call_done" },
    ];
    const avecAppel = compagniesAvecAppel(contacts);
    expect(avecAppel).toEqual(new Set(["a"]));

    const liste = [compagnie("a"), compagnie("b"), compagnie("c")];
    expect(ids(filtrerCompagnies(liste, { appel: "oui" }, avecAppel))).toEqual(["a"]);
    expect(ids(filtrerCompagnies(liste, { appel: "non" }, avecAppel))).toEqual(["b", "c"]);
    expect(ids(filtrerCompagnies(liste, {}, avecAppel))).toEqual(["a", "b", "c"]);
  });
});

describe("seededShuffle", () => {
  const liste = Array.from({ length: 100 }, (_, i) => i);

  it("donne le même ordre pour le même seed et ne change pas la liste reçue", () => {
    const copie = [...liste];
    expect(seededShuffle(liste, "abc")).toEqual(seededShuffle(liste, "abc"));
    expect(liste).toEqual(copie);
  });

  it("garde toutes les lignes et change d'ordre avec un autre seed", () => {
    const a = seededShuffle(liste, "abc");
    expect([...a].sort((x, y) => x - y)).toEqual(liste);
    expect(a).not.toEqual(liste);
    expect(a).not.toEqual(seededShuffle(liste, "xyz"));
  });

  it("une page du mélange reste la même d'une lecture à l'autre", () => {
    const page = () => paginer(seededShuffle(liste, "abc"), 3, PAR_PAGE).items;
    expect(page()).toEqual(page());
  });
});

describe("pagination de la liste", () => {
  const lignes = Array.from({ length: 2_514 }, (_, i) => compagnie(String(i)));

  it("10 par page : 2 514 lignes font 252 pages, la dernière en a 4", () => {
    const premiere = paginer(lignes, 1, PAR_PAGE);
    expect(premiere.items).toHaveLength(10);
    expect(premiere.pageCount).toBe(252);
    expect(premiere.total).toBe(2_514);
    expect(paginer(lignes, 252, PAR_PAGE).items).toHaveLength(4);
  });

  it("aucune ligne perdue ni répétée sur l'ensemble des pages", () => {
    const vus: string[] = [];
    for (let page = 1; page <= 252; page++) vus.push(...ids(paginer(lignes, page, PAR_PAGE).items));
    expect(vus).toEqual(ids(lignes));
  });

  it("une page trop grande revient à la dernière", () => {
    const p = paginer(lignes, 9_999, PAR_PAGE);
    expect(p.page).toBe(252);
    expect(p.items).toHaveLength(4);
  });

  it("résumé de la page", () => {
    expect(resumePage(1, PAR_PAGE, 2_482).replace(/\s/g, " ")).toBe("1–10 sur 2 482");
  });
});

describe("dansOrdreDesIds", () => {
  it("remet les lignes dans l'ordre demandé et saute celles qui ont disparu", () => {
    const lignes = [{ id: "b" }, { id: "c" }, { id: "a" }];
    expect(ids(dansOrdreDesIds(["a", "x", "b", "c"], lignes))).toEqual(["a", "b", "c"]);
  });
});
