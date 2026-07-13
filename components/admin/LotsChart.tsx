"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/admin/format";
import type { Lot, PeriodKey } from "@/lib/admin/types";

type Bucket = { day: string; spent: number; earned: number };

function buildBuckets(lots: Lot[], period: PeriodKey): Bucket[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Départ de la fenêtre à afficher
  let start: Date;
  if (period === "all") {
    if (lots.length === 0) return [];
    const earliest = lots.reduce(
      (min, l) => (l.purchased_at < min ? l.purchased_at : min),
      today.toISOString().slice(0, 10),
    );
    start = new Date(earliest + "T00:00:00Z");
  } else if (period === "month") {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  } else if (period === "ytd") {
    start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  } else {
    const back: Record<string, number> = { "7d": 6, "30d": 29, "3m": 89 };
    start = new Date(today);
    start.setUTCDate(start.getUTCDate() - back[period]);
  }

  const days = new Map<string, Bucket>();
  const cursor = new Date(start);
  while (cursor <= today) {
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

export default function LotsChart({
  lots,
  period,
}: {
  lots: Lot[];
  period: PeriodKey;
}) {
  const data = buildBuckets(lots, period);

  return (
    <div className="glass p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
          Évolution
        </h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-2 text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-white/70" />
            Investi
          </span>
          <span className="flex items-center gap-2 text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            Revenus
          </span>
        </div>
      </div>

      <div className="mt-6 h-56 sm:h-72">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Pas encore de données à afficher.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(94,203,51,0.55)" />
                  <stop offset="100%" stopColor="rgba(94,203,51,0)" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "rgba(148,163,184,0.7)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
                tickFormatter={shortDate}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: "rgba(148,163,184,0.7)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
                width={48}
                tickFormatter={(v) =>
                  v >= 1000 ? `${Math.round(v / 1000)}k$` : `${v}$`
                }
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(6,10,20,0.95)",
                  border: "1px solid rgba(94,203,51,0.3)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  padding: "8px 12px",
                }}
                labelStyle={{
                  color: "rgba(148,163,184,0.9)",
                  marginBottom: "4px",
                }}
                itemStyle={{ color: "white", padding: "2px 0" }}
                formatter={(value: number, name: string) => [
                  formatMoney(value),
                  name === "spent" ? "Investi" : "Revenus",
                ]}
                labelFormatter={longDate}
              />
              <Area
                type="monotone"
                dataKey="spent"
                stroke="rgba(255,255,255,0.65)"
                strokeWidth={1.5}
                fill="url(#spentGrad)"
              />
              <Area
                type="monotone"
                dataKey="earned"
                stroke="rgb(94,203,51)"
                strokeWidth={2}
                fill="url(#earnedGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
