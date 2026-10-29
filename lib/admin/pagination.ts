/** Pagination côté serveur ou client (module pur). */

export function pageDepuisParam(v: string | string[] | undefined): number {
  const brut = Array.isArray(v) ? v[0] : v;
  if (!brut || !/^\d+$/.test(brut)) return 1;
  const n = Number(brut);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

export function paginer<T>(
  items: T[],
  page: number,
  parPage: number,
): { items: T[]; page: number; pageCount: number; total: number } {
  const total = items.length;
  const taille = Math.max(1, Math.floor(parPage));
  const pageCount = Math.max(1, Math.ceil(total / taille));
  const courante = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const debut = (courante - 1) * taille;
  return { items: items.slice(debut, debut + taille), page: courante, pageCount, total };
}

const nf = new Intl.NumberFormat("fr-CA");

/** Ex. « 11–20 sur 34 » ; « 0 sur 0 » si la liste est vide. */
export function resumePage(page: number, parPage: number, total: number): string {
  if (total <= 0) return "0 sur 0";
  const debut = Math.min((page - 1) * parPage + 1, total);
  const fin = Math.min(page * parPage, total);
  return `${nf.format(debut)}–${nf.format(fin)} sur ${nf.format(total)}`;
}
