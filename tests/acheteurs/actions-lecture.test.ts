import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Actions admin liées à la lecture des pièces jointes, avec une base simulée :
 * rien de ce qui désigne le client ne part vers la recherche Web, même saisi à
 * la main ; relecture ; suppression d'une soumission. Données fictives.
 */

type Ligne = Record<string, unknown>;

const etat = vi.hoisted(() => ({
  soumission: null as Record<string, unknown> | null,
  /** Écritures reçues, par table. */
  ecrit: {} as Record<string, Record<string, unknown>[]>,
  retraits: [] as { table: string; colonne: string; valeur: unknown }[],
  erreurRetrait: false,
  permis: true,
}));

function fauxSupabase() {
  return {
    rpc: async (nom: string) => {
      if (nom === "admin_supprimer_soumission") return { data: true, error: null };
      return { data: etat.soumission ? [etat.soumission] : [], error: null };
    },
    from(table: string) {
      const requete = {
        select: () => requete,
        eq: () => requete,
        limit: () => requete,
        maybeSingle: async () => ({ data: null, error: null }),
        upsert: async (ligne: Ligne) => {
          (etat.ecrit[table] ??= []).push(ligne);
          return { error: null };
        },
        delete: () => ({
          eq: async (colonne: string, valeur: unknown) => {
            etat.retraits.push({ table, colonne, valeur });
            return { error: etat.erreurRetrait ? { message: "panne simulée" } : null };
          },
        }),
      };
      return requete;
    },
  };
}

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/securite/garde", () => ({
  adminPourAction: async () => ({ user: { id: "admin-fictif" }, requestId: null, supabase: fauxSupabase() }),
}));
vi.mock("@/lib/securite/limite", () => ({ limiter: async () => ({ permis: etat.permis, attente: 0 }) }));
vi.mock("@/lib/securite/journal", async (original) => ({
  ...(await original<typeof import("@/lib/securite/journal")>()),
  journaliser: async () => {},
}));

import { demanderRecherche, etatLecture, relireSoumission } from "@/lib/acheteurs/actions";
import type { Article } from "@/lib/acheteurs/types";
import { supprimerSoumission } from "@/lib/admin/soumissions-actions";

const SOUMISSION = "11111111-2222-4333-8444-555555555555";

const CLIENT = {
  id: SOUMISSION,
  DATE: "2026-11-05T12:00:00.000Z",
  nom: "Marie-Ève Fictive",
  courriel: "mfictive@usine-exemple.example",
  telephone: "450-555-0142",
  message: "Entreprise : Usine Exemple inc.\nVille : Saint-Fictif\n\nDescription : Lot.",
  locale: "fr",
  fichiers: [],
};

beforeEach(() => {
  etat.soumission = CLIENT;
  etat.ecrit = {};
  etat.retraits = [];
  etat.erreurRetrait = false;
  etat.permis = true;
});

afterEach(() => vi.restoreAllMocks());

const articlesEcrits = () => etat.ecrit.recherches_acheteurs[0].articles as Article[];

describe("demanderRecherche", () => {
  it("retire le client des articles saisis à la main : il ne part jamais vers le Web", async () => {
    const r = await demanderRecherche({
      soumissionId: SOUMISSION,
      articles: "12 x Cisco Meraki MR57 Usine Exemple\nMarie-Ève Fictive\nmfictive@usine-exemple.example\n3 x Dell Latitude 5410 Saint-Fictif",
      autres: false,
    });
    expect(r).toEqual({ ok: true });
    expect(articlesEcrits()).toEqual([
      { quantite: 12, description: "Cisco Meraki MR57" },
      { quantite: 3, description: "Dell Latitude 5410" },
    ]);
  });

  it("une liste qui ne désignait que le client : refusée", async () => {
    const r = await demanderRecherche({ soumissionId: SOUMISSION, articles: "Marie-Ève Fictive, Usine Exemple inc.", autres: false });
    expect(r).toEqual({ ok: false, error: "Ajoutez au moins un article." });
    expect(etat.ecrit.recherches_acheteurs).toBeUndefined();
  });

  it("soumission illisible : les articles passent quand même", async () => {
    etat.soumission = null;
    expect(await demanderRecherche({ soumissionId: SOUMISSION, articles: "2 x Dell Latitude 5410", autres: false })).toEqual({ ok: true });
    expect(articlesEcrits()).toEqual([{ quantite: 2, description: "Dell Latitude 5410" }]);
  });
});

describe("relireSoumission", () => {
  it("remet en file, efface le jeton et le courriel, sans toucher aux articles", async () => {
    expect(await relireSoumission(SOUMISSION)).toEqual({ ok: true });
    const ligne = etat.ecrit.lectures_soumissions[0];
    expect(ligne).toMatchObject({ soumission_id: SOUMISSION, statut: "en_attente", erreur: null, jeton: null, pris_le: null, courriel: null });
    expect(ligne).not.toHaveProperty("articles");
  });

  it("identifiant invalide ou limite atteinte : rien d'écrit", async () => {
    expect((await relireSoumission("pas-un-uuid")).ok).toBe(false);
    etat.permis = false;
    expect((await relireSoumission(SOUMISSION)).ok).toBe(false);
    expect(etat.ecrit.lectures_soumissions).toBeUndefined();
  });
});

describe("etatLecture", () => {
  it("aucune ligne : statut null", async () => {
    expect(await etatLecture(SOUMISSION)).toEqual({ ok: true, statut: null, prisLe: null, lueLe: null, erreur: null });
  });
});

describe("supprimerSoumission", () => {
  it("supprime aussi la lecture de la soumission", async () => {
    expect(await supprimerSoumission(SOUMISSION)).toEqual({ ok: true });
    expect(etat.retraits).toEqual([{ table: "lectures_soumissions", colonne: "soumission_id", valeur: SOUMISSION }]);
  });

  it("une erreur sur la lecture ne fait pas échouer la suppression", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    etat.erreurRetrait = true;
    expect(await supprimerSoumission(SOUMISSION)).toEqual({ ok: true });
  });
});
