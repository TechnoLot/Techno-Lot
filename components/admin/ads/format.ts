import { formatCount, formatMoney } from "@/lib/admin/format";

export { formatCount, formatMoney };

/** Ratio 0..1 → « 12,4 % » (fr-CA). */
export function formatPct(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return new Intl.NumberFormat("fr-CA", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(ratio);
}

/** Montant avec cents si < 100 $ (utile pour CPL / CPC). */
export function formatCost(value: number | null | undefined): string {
  if (value == null) return "—";
  return formatMoney(value, Math.abs(value) < 100);
}

/** Version compacte (12,3 k) pour les grands nombres. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("fr-CA", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

const rtf = new Intl.RelativeTimeFormat("fr-CA", { numeric: "auto" });

/** « il y a 3 heures », « hier »… */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.round(diff / 86_400), "day");
  if (abs < 86_400 * 365) return rtf.format(Math.round(diff / (86_400 * 30)), "month");
  return rtf.format(Math.round(diff / (86_400 * 365)), "year");
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "America/Toronto",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function shortDay(day: string): string {
  const d = new Date(day + "T12:00:00Z");
  return `${d.getUTCDate()} ${d.toLocaleString("fr-CA", { month: "short", timeZone: "UTC" }).replace(".", "")}`;
}

export function longDay(day: string): string {
  return new Date(day + "T12:00:00Z").toLocaleDateString("fr-CA", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export const tooltipStyle = {
  contentStyle: {
    background: "rgba(6,10,20,0.96)",
    border: "1px solid rgba(94,203,51,0.3)",
    borderRadius: "12px",
    fontSize: "12px",
    padding: "8px 12px",
    boxShadow: "0 8px 32px rgba(2,6,16,0.6)",
  },
  labelStyle: { color: "rgba(148,163,184,0.95)", marginBottom: "4px" },
  itemStyle: { color: "white", padding: "2px 0" },
} as const;
