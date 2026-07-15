import type { PeriodKey } from "./types";

/**
 * Convertit une clé de période (`7d`, `month`, `ytd`, …) en date de début
 * (ISO YYYY-MM-DD) à utiliser dans un filtre `purchased_at >= …`.
 * Renvoie `null` pour "tout" (aucun filtre).
 */
export function startOfPeriod(period: PeriodKey, now = new Date()): string | null {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  switch (period) {
    case "7d":
      today.setUTCDate(today.getUTCDate() - 6);
      return today.toISOString().slice(0, 10);
    case "30d":
      today.setUTCDate(today.getUTCDate() - 29);
      return today.toISOString().slice(0, 10);
    case "3m":
      today.setUTCDate(today.getUTCDate() - 89);
      return today.toISOString().slice(0, 10);
    case "6m": {
      const d = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 6, today.getUTCDate()),
      );
      return d.toISOString().slice(0, 10);
    }
    case "month": {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return d.toISOString().slice(0, 10);
    }
    case "lastmonth": {
      const d = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
      );
      return d.toISOString().slice(0, 10);
    }
    case "ytd": {
      const d = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      return d.toISOString().slice(0, 10);
    }
    case "all":
    default:
      return null;
  }
}

/**
 * Borne de fin (ISO YYYY-MM-DD) d'une période, à utiliser dans un filtre
 * `purchased_at <= …`. Renvoie `null` pour les périodes ouvertes jusqu'à
 * aujourd'hui ; seule "mois dernier" a une vraie fin (dernier jour du mois
 * précédent).
 */
export function endOfPeriod(period: PeriodKey, now = new Date()): string | null {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  if (period === "lastmonth") {
    // Jour 0 du mois courant = dernier jour du mois précédent.
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Nombre de jours dans une période — sert à calibrer les graphiques
 * (nombre de "buckets" quotidiens). Renvoie `null` pour "tout".
 */
export function daysInPeriod(period: PeriodKey, now = new Date()): number | null {
  const start = startOfPeriod(period, now);
  if (start === null) return null;
  const d = new Date(start + "T00:00:00Z");
  const endStr = endOfPeriod(period, now);
  const end = endStr
    ? new Date(endStr + "T00:00:00Z")
    : (() => {
        const t = new Date(now);
        t.setUTCHours(0, 0, 0, 0);
        return t;
      })();
  return Math.round((end.getTime() - d.getTime()) / 86400000) + 1;
}

/**
 * Retourne la période précédente équivalente (utile pour calculer les
 * pourcentages de variation dans les KPI).
 */
export function previousPeriodBounds(
  period: PeriodKey,
  now = new Date(),
): { start: string; end: string } | null {
  const start = startOfPeriod(period, now);
  if (start === null) return null;
  const startDate = new Date(start + "T00:00:00Z");
  const endStr = endOfPeriod(period, now);
  const endDate = endStr
    ? new Date(endStr + "T00:00:00Z")
    : (() => {
        const t = new Date(now);
        t.setUTCHours(0, 0, 0, 0);
        return t;
      })();
  const spanMs = endDate.getTime() - startDate.getTime() + 86400000;
  const prevEnd = new Date(startDate.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - spanMs + 86400000);
  return {
    start: prevStart.toISOString().slice(0, 10),
    end: prevEnd.toISOString().slice(0, 10),
  };
}
