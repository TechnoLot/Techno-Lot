"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  Eye,
  Handshake,
  Minus,
  MousePointerClick,
  Percent,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import AnimatedNumber from "@/components/admin/AnimatedNumber";
import { pctChange } from "@/lib/admin/format";
import type { Totals } from "@/lib/ads/types";
import { formatCost, formatCount, formatMoney, formatPct } from "./format";

type Fmt = "money" | "count" | "pct" | "cost";

type Kpi = {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  value: number | null;
  prev: number | null;
  format: Fmt;
  /** true si une baisse est une bonne nouvelle (ex. coût par lead). */
  lowerIsBetter?: boolean;
  highlight?: boolean;
};

const formatters: Record<Fmt, (n: number) => string> = {
  money: (n) => formatMoney(n),
  count: (n) => formatCount(Math.round(n)),
  pct: (n) => formatPct(n),
  cost: (n) => formatCost(n),
};

export function buildKpis(t: Totals, p: Totals | null): Kpi[] {
  return [
    { key: "spend", label: "Dépenses", hint: "Budget dépensé sur Meta et Google", icon: DollarSign, value: t.spend, prev: p?.spend ?? null, format: "money" },
    { key: "impr", label: "Impressions", hint: "Nombre d'affichages des pubs", icon: Eye, value: t.impressions, prev: p?.impressions ?? null, format: "count" },
    { key: "clicks", label: "Clics", hint: "Clics sur le lien des pubs", icon: MousePointerClick, value: t.clicks, prev: p?.clicks ?? null, format: "count" },
    { key: "ctr", label: "CTR", hint: "Clics ÷ impressions", icon: Percent, value: t.ctr, prev: p?.ctr ?? null, format: "pct" },
    { key: "visits", label: "Visites du site", hint: "Visites arrivées depuis une pub", icon: Users, value: t.visits, prev: p?.visits ?? null, format: "count" },
    { key: "leads", label: "Leads", hint: "Formulaires remplis depuis une pub", icon: Target, value: t.leads, prev: p?.leads ?? null, format: "count", highlight: true },
    { key: "cpl", label: "Coût par lead", hint: "Dépenses ÷ leads", icon: DollarSign, value: t.cpl, prev: p?.cpl ?? null, format: "cost", lowerIsBetter: true },
    { key: "conv", label: "Conversion visite → lead", hint: "Leads ÷ visites", icon: TrendingUp, value: t.convRate, prev: p?.convRate ?? null, format: "pct" },
    { key: "clients", label: "Clients convertis", hint: "Leads devenus des lots", icon: Handshake, value: t.clients, prev: p?.clients ?? null, format: "count", highlight: true },
  ];
}

export default function AdsKpiGrid({ totals, prev }: { totals: Totals; prev: Totals | null }) {
  const reduce = useReducedMotion();
  const kpis = buildKpis(totals, prev);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Indicateurs clés">
      {kpis.map((k, i) => (
        <motion.li
          key={k.key}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.04, ease: [0.21, 0.47, 0.32, 0.98] }}
          className={`glass relative overflow-hidden p-4 ${k.highlight ? "border-accent/25" : ""} ${
            i === kpis.length - 1 ? "col-span-2 sm:col-span-1" : ""
          }`}
          title={k.hint}
        >
          {k.highlight && (
            <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-accent/15 blur-2xl" />
          )}
          <div className="flex items-center gap-2">
            <k.icon className={`h-3.5 w-3.5 ${k.highlight ? "text-accent" : "text-slate-500"}`} aria-hidden />
            <p className="truncate font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {k.label}
            </p>
          </div>
          <p className={`mt-2 font-display text-2xl font-bold tabular-nums lg:text-3xl ${k.highlight ? "text-accent-bright" : "text-white"}`}>
            {k.value == null ? (
              <span className="text-slate-500">—</span>
            ) : (
              <AnimatedNumber value={k.value} format={formatters[k.format]} />
            )}
          </p>
          <Delta k={k} />
        </motion.li>
      ))}
    </ul>
  );
}

function Delta({ k }: { k: Kpi }) {
  if (k.value == null || k.prev == null) {
    return <p className="mt-1.5 text-[11px] text-slate-600">— vs période préc.</p>;
  }
  const d = pctChange(k.value, k.prev);
  if (d === null) {
    return <p className="mt-1.5 text-[11px] text-accent-bright">Nouveau</p>;
  }
  const up = d > 1;
  const down = d < -1;
  const good = k.lowerIsBetter ? down : up;
  const bad = k.lowerIsBetter ? up : down;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-[11px]">
      {up ? (
        <ArrowUp className={`h-3 w-3 ${good ? "text-accent" : "text-red-400"}`} aria-hidden />
      ) : down ? (
        <ArrowDown className={`h-3 w-3 ${good ? "text-accent" : "text-red-400"}`} aria-hidden />
      ) : (
        <Minus className="h-3 w-3 text-slate-500" aria-hidden />
      )}
      <span className={good ? "font-semibold text-accent-bright" : bad ? "font-semibold text-red-300" : "text-slate-400"}>
        {Math.abs(d).toFixed(0)} %
      </span>
      <span className="sr-only">{up ? "en hausse" : down ? "en baisse" : "stable"}</span>
      <span className="truncate text-slate-500">vs préc.</span>
    </p>
  );
}
