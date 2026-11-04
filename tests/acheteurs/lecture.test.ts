import { describe, expect, it } from "vitest";
import { lireLectures, resumeAcheteurs } from "@/lib/acheteurs/lecture";

/*
 * Lectures des pages admin, avec une base simulée : jamais le jeton ni
 * l'emplacement du courriel, et une table de lectures illisible ne fait pas
 * échouer le résumé de l'accueil. Données fictives.
 */

type Reponse = { data: unknown; error: unknown; count?: number };

function fauxSupabase(reponses: Record<string, Reponse>) {
  const colonnes: string[] = [];
  const client = {
    from(table: string) {
      const requete = {
        select: (c: string) => (colonnes.push(c), requete),
        in: () => requete,
        eq: () => requete,
        limit: () => requete,
        then: (ok: (v: unknown) => unknown) => Promise.resolve(reponses[table] ?? { data: [], error: null, count: 0 }).then(ok),
      };
      return requete;
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
  return { client, colonnes };
}

const ligne = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  soumission_id: "11111111-2222-4333-8444-555555555555",
  statut: "lue",
  articles: [{ quantite: 2, description: "Cisco Meraki MR57", etat: null, verification: "non_vu", remarque: null, photos: [] }],
  articles_ignores: 1,
  pieces: [{ nom: "lot.csv", pieceId: "p1", type: "text/csv", role: "tableur", numero: null, lu: true, raison: null }],
  erreur: null,
  demande_le: "2026-11-05T12:00:00.000Z",
  pris_le: "2026-11-05T12:05:00.000Z",
  lue_le: "2026-11-05T12:06:00.000Z",
};

describe("lireLectures", () => {
  it("rend les lectures par soumission, sans jeton ni courriel", async () => {
    const { client, colonnes } = fauxSupabase({ lectures_soumissions: { data: [ligne, { ...ligne, statut: "inconnu", soumission_id: "x" }], error: null } });
    const { lectures, erreur } = await lireLectures(client, [ligne.soumission_id]);
    expect(erreur).toBeNull();
    expect([...lectures.keys()]).toEqual([ligne.soumission_id]);
    expect(lectures.get(ligne.soumission_id)).toMatchObject({ statut: "lue", articles_ignores: 1 });
    expect(colonnes.join()).not.toMatch(/jeton|courriel/);
  });

  it("aucun identifiant : aucun appel", async () => {
    const { client, colonnes } = fauxSupabase({});
    expect((await lireLectures(client, [])).lectures.size).toBe(0);
    expect(colonnes).toEqual([]);
  });
});

describe("resumeAcheteurs", () => {
  it("lecturesNichees : au moins un article qui n'est pas courant", async () => {
    const courant = { ...ligne.articles[0], description: "Portables Dell Latitude" };
    const { client } = fauxSupabase({
      lectures_soumissions: {
        data: [
          { soumission_id: "nichee", articles: [courant, ligne.articles[0]] },
          { soumission_id: "courante", articles: [courant] },
          { soumission_id: "vide", articles: [] },
        ],
        error: null,
      },
    });
    const { resume } = await resumeAcheteurs(client);
    expect([...resume.lecturesNichees]).toEqual(["nichee"]);
  });

  it("une erreur sur la table des lectures ne fait pas échouer le résumé", async () => {
    const { client } = fauxSupabase({ lectures_soumissions: { data: null, error: { message: "table absente" } } });
    const { resume, erreur } = await resumeAcheteurs(client);
    expect(erreur).toBeNull();
    expect(resume.lecturesNichees.size).toBe(0);
  });
});
