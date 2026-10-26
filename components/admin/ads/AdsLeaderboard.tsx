"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Trophy } from "lucide-react";
import type { AdSummary } from "@/lib/ads/types";
import PlatformBadge from "./PlatformBadge";
import { MiniFunnel } from "./AdsFunnel";
import { formatCost, formatCount, formatMoney, formatPct } from "./format";

type SortKey =
  | "name"
  | "spend"
  | "impressions"
  | "clicks"
  | "ctr"
  | "visits"
  | "leads"
  | "cpl"
  | "convRate"
  | "clients";

const COLS: { key: SortKey; label: string; title?: string }[] = [
  { key: "spend", label: "Dépense" },
  { key: "impressions", label: "Impr.", title: "Impressions" },
  { key: "clicks", label: "Clics" },
  { key: "ctr", label: "CTR", title: "Taux de clics" },
  { key: "visits", label: "Visites" },
  { key: "leads", label: "Leads" },
  { key: "cpl", label: "CPL", title: "Coût par lead" },
  { key: "convRate", label: "Conv.", title: "Taux de conversion visite → lead" },
  { key: "clients", label: "Clients" },
];

function cell(a: AdSummary, k: SortKey): string {
  switch (k) {
    case "spend":
      return a.spend > 0 ? formatMoney(a.spend) : "—";
    case "ctr":
      return formatPct(a.ctr);
    case "cpl":
      return formatCost(a.cpl);
    case "convRate":
      return formatPct(a.convRate);
    case "name":
      return a.name;
    default:
      return formatCount(a[k]);
  }
}

export default function AdsLeaderboard({ ads, bestAdKey }: { ads: AdSummary[]; bestAdKey: string | null }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "leads", dir: "desc" });

  const rows = useMemo(() => {
    const out = [...ads];
    out.sort((a, b) => {
      let r: number;
      if (sort.key === "name") r = a.name.localeCompare(b.name, "fr-CA");
      else {
        const av = a[sort.key];
        const bv = b[sort.key];
        // Les valeurs nulles (CPL sans lead…) vont toujours en bas
        if (av == null && bv == null) r = 0;
        else if (av == null) return 1;
        else if (bv == null) return -1;
        else r = (av as number) - (bv as number);
      }
      return sort.dir === "asc" ? r : -r;
    });
    return out;
  }, [ads, sort]);

  function toggle(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "desc" ? "asc" : "desc" }
        : { key, dir: key === "cpl" || key === "name" ? "asc" : "desc" },
    );
  }

  const ariaSort = (k: SortKey) =>
    sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key !== k ? (
      <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
    ) : sort.dir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-accent" aria-hidden />
    ) : (
      <ArrowDown className="h-3 w-3 text-accent" aria-hidden />
    );

  const best = bestAdKey ? ads.find((a) => a.key === bestAdKey) : null;

  return (
    <section className="glass overflow-hidden" aria-labelledby="ads-board-title">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div>
          <h2 id="ads-board-title" className="font-display text-lg font-bold text-white">
            Quelle pub performe le mieux ?
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Clique sur un en-tête pour trier, sur une ligne pour voir le détail et les leads.
          </p>
        </div>
        {best && (
          <Link
            href={best.href}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent-bright transition-colors hover:bg-accent/15"
          >
            <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              Meilleure pub : <strong className="font-semibold">{best.name}</strong> · {formatCost(best.cpl)} / lead
            </span>
          </Link>
        )}
      </div>

      {ads.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-slate-400">Aucune pub sur cette période.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <caption className="sr-only">Classement des publicités, triable</caption>
            <thead>
              <tr className="border-y border-white/5 bg-white/[0.02] text-left">
                <th scope="col" aria-sort={ariaSort("name")} className="px-5 py-2.5 sm:px-6">
                  <button type="button" onClick={() => toggle("name")} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-white">
                    Publicité <SortIcon k="name" />
                  </button>
                </th>
                {COLS.map((c) => (
                  <th key={c.key} scope="col" aria-sort={ariaSort(c.key)} className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggle(c.key)}
                      title={c.title}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider hover:text-white ${
                        sort.key === c.key ? "text-white" : "text-slate-400"
                      }`}
                    >
                      {c.label} <SortIcon k={c.key} />
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Funnel
                </th>
                <th scope="col" className="w-8 pr-4">
                  <span className="sr-only">Ouvrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const isBest = a.key === bestAdKey;
                return (
                  <motion.tr
                    key={a.key}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.03 }}
                    onClick={() => router.push(a.href)}
                    className={`group cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04] ${
                      isBest ? "bg-accent/[0.05]" : ""
                    }`}
                  >
                    <td className="max-w-[300px] px-5 py-3 sm:px-6">
                      <div className="flex items-center gap-3">
                        <PlatformBadge platform={a.platform} publishers={a.publishers} compact />
                        <div className="min-w-0">
                          <Link
                            href={a.href}
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate font-medium text-white hover:text-accent-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                            title={a.name}
                          >
                            {a.name}
                          </Link>
                          <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                            {isBest && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-night-950">
                                <Trophy className="h-2.5 w-2.5" aria-hidden /> Meilleure pub
                              </span>
                            )}
                            <span className="truncate">{a.campaign ?? "Campagne inconnue"}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    {COLS.map((c) => (
                      <td
                        key={c.key}
                        className={`whitespace-nowrap px-3 py-3 text-right tabular-nums ${
                          c.key === "leads"
                            ? "font-semibold text-white"
                            : c.key === "cpl" && isBest
                              ? "font-semibold text-accent-bright"
                              : c.key === "clients" && a.clients > 0
                                ? "font-semibold text-accent-bright"
                                : "text-slate-300"
                        }`}
                      >
                        {cell(a, c.key)}
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <MiniFunnel funnel={a} />
                    </td>
                    <td className="pr-4">
                      <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
