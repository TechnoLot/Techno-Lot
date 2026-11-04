/** Plafond de lignes par requête de PostgREST. */
const PAGE = 1_000;

/**
 * Toutes les lignes d'une requête, tranche par tranche. La requête doit avoir
 * un tri stable (jusqu'à un champ unique), sinon une tranche peut sauter ou
 * répéter des lignes.
 */
export async function toutesLesLignes<T>(
  page: (de: number, a: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<{ ok: true; lignes: T[] } | { ok: false; erreur: unknown }> {
  const lignes: T[] = [];
  for (let de = 0; de < 1_000_000; de += PAGE) {
    const { data, error } = await page(de, de + PAGE - 1);
    if (error) return { ok: false, erreur: error };
    const lot = (Array.isArray(data) ? data : []) as T[];
    lignes.push(...lot);
    if (lot.length < PAGE) break;
  }
  return { ok: true, lignes };
}
