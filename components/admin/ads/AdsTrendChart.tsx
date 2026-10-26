"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/ads/types";
import { formatCount, formatMoney, longDay, shortDay, tooltipStyle } from "./format";

type Series = "leads" | "visits";

/** Dépenses (aire, axe gauche) vs leads ou visites (barres, axe droit), par jour. */
export default function AdsTrendChart({ data, title = "Dépenses vs leads" }: { data: DailyPoint[]; title?: string }) {
  const [series, setSeries] = useState<Series>("leads");
  const totalSpend = data.reduce((s, d) => s + d.spend, 0);
  const totalRight = data.reduce((s, d) => s + d[series], 0);
  const label = series === "leads" ? "Leads" : "Visites";

  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="ads-trend-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ads-trend-title" className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
            {title}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-white/70" aria-hidden />
              Dépenses <strong className="font-semibold text-white">{formatMoney(totalSpend)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-accent" aria-hidden />
              {label} <strong className="font-semibold text-white">{formatCount(totalRight)}</strong>
            </span>
          </p>
        </div>
        <div role="group" aria-label="Série affichée" className="inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {(["leads", "visits"] as Series[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={series === s}
              onClick={() => setSeries(s)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                series === s ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {s === "leads" ? "Leads" : "Visites"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-56 sm:h-72" role="img" aria-label={`Graphique quotidien des dépenses et des ${label.toLowerCase()}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="adsSpendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
              <linearGradient id="adsBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8BE95F" />
                <stop offset="100%" stopColor="#5ECB33" stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "rgba(148,163,184,0.75)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              tickFormatter={shortDay}
              minTickGap={24}
            />
            <YAxis
              yAxisId="spend"
              tick={{ fill: "rgba(148,163,184,0.75)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)} k$` : `${v} $`)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              allowDecimals={false}
              tick={{ fill: "rgba(139,233,95,0.8)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              {...tooltipStyle}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              labelFormatter={(d: string) => longDay(d)}
              formatter={(value: number, name: string) =>
                name === "spend" ? [formatMoney(value, true), "Dépenses"] : [formatCount(value), label]
              }
            />
            <Area
              yAxisId="spend"
              type="monotone"
              dataKey="spend"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={1.5}
              fill="url(#adsSpendGrad)"
              animationDuration={900}
            />
            <Bar
              yAxisId="right"
              dataKey={series}
              fill="url(#adsBarGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
              animationDuration={900}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
