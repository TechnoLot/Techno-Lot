import type { DateRange } from "@/lib/ads/types";

function fmt(day: string, withYear = false): string {
  return new Date(day + "T12:00:00Z").toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

/** « du 28 sept. au 27 oct. 2026 » */
export function periodText(range: DateRange): string {
  return `du ${fmt(range.from)} au ${fmt(range.to, true)}`;
}

export default function PeriodCaption({ range }: { range: DateRange }) {
  return <span>{periodText(range)}</span>;
}
