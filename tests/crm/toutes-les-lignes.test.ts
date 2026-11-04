import { describe, expect, it } from "vitest";
import { toutesLesLignes } from "@/lib/supabase/toutes-les-lignes";

/** Fausse table : renvoie la tranche demandée et note les appels. */
function fausseTable(total: number) {
  const appels: [number, number][] = [];
  const page = async (de: number, a: number) => {
    appels.push([de, a]);
    const fin = Math.min(a + 1, total);
    return {
      data: Array.from({ length: Math.max(0, fin - de) }, (_, i) => de + i),
      error: null,
    };
  };
  return { appels, page };
}

describe("toutesLesLignes", () => {
  it("dépasse 1 000 lignes et s'arrête sur une tranche incomplète", async () => {
    const { appels, page } = fausseTable(2_514);
    const r = await toutesLesLignes<number>(page);
    expect(r).toEqual({ ok: true, lignes: Array.from({ length: 2_514 }, (_, i) => i) });
    expect(appels).toEqual([
      [0, 999],
      [1_000, 1_999],
      [2_000, 2_999],
    ]);
  });

  it("fait une tranche de plus quand le total tombe juste", async () => {
    const { appels, page } = fausseTable(2_000);
    const r = await toutesLesLignes<number>(page);
    expect(r.ok && r.lignes).toHaveLength(2_000);
    expect(appels).toHaveLength(3);
  });

  it("rend l'erreur d'une tranche", async () => {
    const erreur = new Error("lecture");
    let n = 0;
    const r = await toutesLesLignes<number>(async () =>
      n++ === 0 ? { data: Array(1_000).fill(0), error: null } : { data: null, error: erreur },
    );
    expect(r).toEqual({ ok: false, erreur });
  });
});
