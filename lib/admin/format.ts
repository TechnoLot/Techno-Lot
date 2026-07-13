/**
 * Formate un montant en dollars canadiens sans espace insécable insidieux.
 * `full` inclut les cents, sinon on arrondit à l'entier.
 */
export function formatMoney(value: number | null | undefined, full = false): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: full ? 2 : 0,
    maximumFractionDigits: full ? 2 : 0,
  }).format(value);
}

/** Formate un nombre entier avec séparateurs de milliers. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-CA").format(value);
}

/** Formate une date ISO en jour lisible ("13 juil. 2026"). */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso + (iso.length <= 10 ? "T00:00:00" : "")));
}

/**
 * Variation en % entre deux valeurs (utile pour les indicateurs
 * "↑ 12% vs période précédente"). Renvoie `null` si la référence est 0.
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
