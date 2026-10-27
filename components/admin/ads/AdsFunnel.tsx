import type { Funnel } from "@/lib/ads/types";
import { card, cardSub, cardTitle } from "./ui";
import { formatCount, formatPct } from "./format";

const STEPS: { key: keyof Funnel; label: string }[] = [
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clics" },
  { key: "visits", label: "Visites du site" },
  { key: "formStarts", label: "Formulaires commencés" },
  { key: "leads", label: "Leads (formulaires envoyés)" },
  { key: "clients", label: "Clients acquis" },
];

/** Largeur visuelle : échelle log pour que les petites étapes restent visibles. */
function widthPct(v: number, max: number): number {
  if (max <= 0 || v <= 0) return 0;
  return Math.max(3, (Math.log10(v + 1) / Math.log10(max + 1)) * 100);
}

/** Entonnoir : impressions → clics → visites → formulaires commencés → leads → clients. */
export default function AdsFunnel({ funnel, spendKnown = true }: { funnel: Funnel; spendKnown?: boolean }) {
  const max = Math.max(...STEPS.map((s) => funnel[s.key]));

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="ads-funnel-title">
      <h2 id="ads-funnel-title" className={cardTitle}>
        Entonnoir
      </h2>
      <p className={cardSub}>
        De la pub vue au client. Le pourcentage indique combien passent à l&apos;étape suivante.
        {!spendKnown && " Impressions et clics arrivent avec la connexion Meta."}
      </p>

      <ol className="mt-5 space-y-3.5">
        {STEPS.map((s, i) => {
          const v = funnel[s.key];
          const prev = i > 0 ? funnel[STEPS[i - 1].key] : null;
          const rate = prev != null && prev > 0 ? v / prev : null;
          const last = s.key === "clients";
          return (
            <li key={s.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-[#0a0a0a]">{s.label}</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  {rate != null && (
                    <span className="text-[12px] tabular-nums text-[#4f5a52]">{formatPct(Math.min(rate, 9.99), rate < 0.1 ? 1 : 0)}</span>
                  )}
                  <span className="font-display text-base font-semibold tabular-nums text-[#0a0a0a]">{formatCount(v)}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#f0f4ee]">
                <div
                  className={`h-full rounded-full ${last ? "bg-[#257a10]" : "bg-[#6bd63b]"}`}
                  style={{ width: `${widthPct(v, max)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
