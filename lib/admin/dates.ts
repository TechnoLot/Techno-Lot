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
    case "month": {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
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
 * Nombre de jours dans une période — sert à calibrer les graphiques
 * (nombre de "buckets" quotidiens). Renvoie `null` pour "tout".
 */
export function daysInPeriod(period: PeriodKey, now = new Date()): number | null {
  const start = startOfPeriod(period, now);
  if (start === null) return null;
  const d = new Date(start + "T00:00:00Z");
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / 86400000) + 1;
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
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const spanMs = today.getTime() - startDate.getTime() + 86400000;
  const prevEnd = new Date(startDate.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - spanMs + 86400000);
  return {
    start: prevStart.toISOString().slice(0, 10),
    end: prevEnd.toISOString().slice(0, 10),
  };
}
