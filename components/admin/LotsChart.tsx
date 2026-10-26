"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import type { Lot, PeriodKey } from "@/lib/admin/types";

type Bucket = { day: string; spent: number; earned: number };

function buildBuckets(lots: Lot[], period: PeriodKey): Bucket[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Départ et fin de la fenêtre à afficher
  let start: Date;
  let end = new Date(today);
  if (period === "all") {
    if (lots.length === 0) return [];
    const earliest = lots.reduce(
      (min, l) => (l.purchased_at < min ? l.purchased_at : min),
      today.toISOString().slice(0, 10),
    );
    start = new Date(earliest + "T00:00:00Z");
  } else if (period === "month") {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  } else if (period === "lastmonth") {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  } else if (period === "ytd") {
    start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  } else if (period === "6m") {
    start = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 6, today.getUTCDate()),
    );
  } else {
    const back: Record<string, number> = { "7d": 6, "30d": 29, "3m": 89 };
    start = new Date(today);
    start.setUTCDate(start.getUTCDate() - back[period]);
  }

  const days = new Map<string, Bucket>();
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    days.set(key, { day: key, spent: 0, earned: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const lot of lots) {
    const s = days.get(lot.purchased_at);
    if (s) s.spent += Number(lot.purchase_price);
    if (lot.sold_at && lot.sale_price != null) {
      const e = days.get(lot.sold_at);
      if (e) e.earned += Number(lot.sale_price);
    }
  }

  return Array.from(days.values());
}

/** Regroupe par semaine (lundi) quand la fenêtre est longue, pour lisser. */
function groupWeekly(buckets: Bucket[]): Bucket[] {
  const out: Bucket[] = [];
  let cur: Bucket | null = null;
  for (const b of buckets) {
    const d = new Date(b.day + "T00:00:00Z");
    if (!cur || d.getUTCDay() === 1) {
      cur = { day: b.day, spent: 0, earned: 0 };
      out.push(cur);
    }
    cur.spent += b.spent;
    cur.earned += b.earned;
  }
  return out;
}

function cumulate(buckets: Bucket[]): Bucket[] {
  let s = 0;
  let e = 0;
  return buckets.map((b) => {
    s += b.spent;
    e += b.earned;
    return { day: b.day, spent: s, earned: e };
  });
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${d
    .toLocaleString("fr-CA", { month: "short", timeZone: "UTC" })
    .replace(".", "")}`;
}

function longDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const SERIES = {
  spent: { label: "Acheté", stroke: "rgba(203,213,225,0.75)", dot: "bg-slate-300" },
  earned: { label: "Vendu", stroke: "rgb(94,203,51)", dot: "bg-accent" },
} as const;

type Mode = "daily" | "cumulative";

export default function LotsChart({
  lots,
  period,
}: {
  lots: Lot[];
  period: PeriodKey;
}) {
  const [mode, setMode] = useState<Mode>("cumulative");
  const [hidden, setHidden] = useState<{ spent: boolean; earned: boolean }>({
    spent: false,
    earned: false,
  });

  const { data, weekly, totals } = useMemo(() => {
    const raw = buildBuckets(lots, period);
    const weekly = raw.length > 100;
    const grouped = weekly ? groupWeekly(raw) : raw;
    const totals = raw.reduce(
      (acc, b) => ({ spent: acc.spent + b.spent, earned: acc.earned + b.earned }),
      { spent: 0, earned: 0 },
    );
    return {
      data: mode === "cumulative" ? cumulate(grouped) : grouped,
      weekly,
      totals,
    };
  }, [lots, period, mode]);

  const isEmpty = data.length === 0 || (totals.spent === 0 && totals.earned === 0);

  return (
    <section className="admin-card p-5 sm:p-6" aria-labelledby="lots-chart-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="lots-chart-title" className="admin-card-title">
            Achats et ventes
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "cumulative" ? "Montants cumulés" : weekly ? "Montants par semaine" : "Montants par jour"}{" "}
            sur la période
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map((key) => {
            const s = SERIES[key];
            const off = hidden[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={!off}
                onClick={() => setHidden((h) => ({ ...h, [key]: !h[key] }))}
                className={`admin-focus inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                  off
                    ? "border-white/[0.05] text-slate-600"
                    : "border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-white/15"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${off ? "bg-slate-700" : s.dot}`}
                  aria-hidden
                />
                <span className="text-xs">{s.label}</span>
                <span
                  className={`font-display text-xs font-semibold tabular-nums ${
                    off ? "text-slate-600" : "text-white"
                  }`}
                >
                  {formatMoney(key === "spent" ? totals.spent : totals.earned)}
                </span>
              </button>
            );
          })}

          <div className="admin-segment" role="group" aria-label="Mode d'affichage">
            {(
              [
                ["cumulative", "Cumulé"],
                ["daily", weekly ? "Semaine" : "Jour"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`admin-focus rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 h-60 sm:h-72">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.07] text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-slate-500">
              <LineChartIcon className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm text-slate-400">Aucun achat ni vente sur cette période.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(203,213,225,0.22)" />
                  <stop offset="100%" stopColor="rgba(203,213,225,0)" />
                </linearGradient>
                <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(94,203,51,0.4)" />
                  <stop offset="100%" stopColor="rgba(94,203,51,0)" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 6"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "rgba(148,163,184,0.65)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={shortDate}
                minTickGap={28}
                dy={6}
              />
              <YAxis
                tick={{ fill: "rgba(148,163,184,0.65)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${Math.round(v / 1000)} k$` : `${v} $`
                }
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
                contentStyle={{
                  background: "rgba(10,15,28,0.96)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  padding: "10px 12px",
                  boxShadow: "0 16px 40px -12px rgba(2,6,16,0.9)",
                }}
                labelStyle={{ color: "rgba(148,163,184,0.9)", marginBottom: "6px" }}
                itemStyle={{ color: "white", padding: "2px 0" }}
                formatter={(value: number, name: string) => [
                  formatMoney(value),
                  name === "spent" ? SERIES.spent.label : SERIES.earned.label,
                ]}
                labelFormatter={(l: string) =>
                  weekly ? `Semaine du ${longDate(l)}` : longDate(l)
                }
              />
              {!hidden.spent && (
                <Area
                  type="monotone"
                  dataKey="spent"
                  stroke={SERIES.spent.stroke}
                  strokeWidth={1.5}
                  fill="url(#spentGrad)"
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#e2e8f0" }}
                  animationDuration={700}
                />
              )}
              {!hidden.earned && (
                <Area
                  type="monotone"
                  dataKey="earned"
                  stroke={SERIES.earned.stroke}
                  strokeWidth={2}
                  fill="url(#earnedGrad)"
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#8BE95F" }}
                  animationDuration={700}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
