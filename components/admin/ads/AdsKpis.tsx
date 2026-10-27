import type { Totals } from "@/lib/ads/types";
import { formatCost, formatCount, formatMoney, formatPct } from "./format";

type Tile = {
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
  tone?: "pos" | "neg";
};

/**
 * Les 5 grands chiffres : Dépensé, Leads, Coût par lead, Clients acquis
 * (tuile mise en avant) et Profit des clients.
 */
export default function AdsKpis({
  totals,
  spendKnown = true,
  spendHint = "sur la période",
}: {
  totals: Pick<Totals, "spend" | "leads" | "cpl" | "clients" | "profit">;
  /** false : aucune dépense synchronisée (plateforme non connectée) */
  spendKnown?: boolean;
  /** Sous-titre de la tuile Dépensé (ex. « Meta non connecté ») */
  spendHint?: string;
}) {
  const closeRate = totals.leads > 0 ? totals.clients / totals.leads : null;
  const tiles: Tile[] = [
    {
      label: "Dépensé",
      value: spendKnown ? formatMoney(totals.spend) : "—",
      hint: spendHint,
    },
    {
      label: "Leads",
      value: formatCount(totals.leads),
      hint: "formulaires envoyés",
    },
    {
      label: "Coût par lead",
      value: formatCost(totals.cpl),
      hint: totals.cpl != null ? "dépensé ÷ leads" : spendKnown ? "aucun lead" : "dépenses inconnues",
    },
    {
      label: "Clients acquis",
      value: formatCount(totals.clients),
      hint: closeRate != null ? `${formatPct(closeRate, 0)} des leads` : "aucun lead",
      highlight: true,
    },
    {
      label: "Profit des clients",
      value: formatMoney(totals.profit),
      hint: "sur les lots vendus",
      tone: totals.profit > 0 ? "pos" : totals.profit < 0 ? "neg" : undefined,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={`min-w-0 rounded-2xl border p-4 last:col-span-2 sm:p-5 md:last:col-span-1 ${
            t.highlight ? "border-[#6bd63b] bg-[#6bd63b]" : "border-[#e3eadf] bg-white"
          }`}
        >
          <dt className={`text-[13px] font-medium ${t.highlight ? "text-[#0a0a0a]" : "text-[#4f5a52]"}`}>{t.label}</dt>
          <dd
            className={`mt-1.5 truncate font-display text-[26px] font-semibold leading-none tracking-tight sm:text-[30px] ${
              t.tone === "pos" ? "text-[#257a10]" : t.tone === "neg" ? "text-[#b42318]" : "text-[#0a0a0a]"
            }`}
          >
            {t.value}
          </dd>
          <dd className={`mt-2 truncate text-[12px] ${t.highlight ? "text-[#0a0a0a]/75" : "text-[#4f5a52]"}`}>{t.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
