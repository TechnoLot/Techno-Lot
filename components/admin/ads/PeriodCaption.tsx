import type { DateRange } from "@/lib/ads/types";

function fmt(day: string, withYear = false): string {
  return new Date(day + "T12:00:00Z").toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

/** « Du 27 sept. au 26 oct. 2026 · comparé au 28 août – 26 sept. » */
export default function PeriodCaption({ range, prev }: { range: DateRange; prev: DateRange }) {
  return (
    <p className="text-xs text-slate-500">
      Du <span className="text-slate-300">{fmt(range.from)}</span> au{" "}
      <span className="text-slate-300">{fmt(range.to, true)}</span>
      <span className="hidden sm:inline">
        {" "}
        · comparé au {fmt(prev.from)} – {fmt(prev.to)}
      </span>
    </p>
  );
}
