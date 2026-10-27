"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "@/lib/ads/types";
import { card, cardSub, cardTitle } from "./ui";
import { formatCount, formatMoney, longDay, shortDay, tooltipStyle } from "./format";

// Couleurs liées au thème admin (variables --a-* de globals.css).
// Dépenses : vert à 25 % sur la carte (≈ #c8dec3 en clair, #2e4b36 en sombre).
const SPEND = "color-mix(in srgb, rgb(var(--a-green)) 25%, rgb(var(--a-card)))";
const LEADS = "rgb(var(--a-green))";
const AXIS = "rgb(var(--a-muted))";

/** Jour par jour : dépenses (barres, axe gauche) et leads (ligne, axe droit). */
export default function AdsDailyChart({ data }: { data: DailyPoint[] }) {
  const totalSpend = data.reduce((s, d) => s + d.spend, 0);
  const totalLeads = data.reduce((s, d) => s + d.leads, 0);

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="ads-daily-title">
      <h2 id="ads-daily-title" className={cardTitle}>
        Jour par jour
      </h2>
      <p className={`${cardSub} flex flex-wrap items-center gap-x-4 gap-y-1`}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SPEND }} aria-hidden />
          Dépenses <strong className="font-semibold text-admin-ink">{formatMoney(totalSpend)}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: LEADS }} aria-hidden />
          Leads <strong className="font-semibold text-admin-ink">{formatCount(totalLeads)}</strong>
        </span>
      </p>

      <div className="mt-4 h-60 sm:h-72" role="img" aria-label="Graphique quotidien des dépenses et des leads">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 0, left: -6, bottom: 0 }}>
            <CartesianGrid stroke="rgb(var(--a-line-soft))" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: AXIS, fontSize: 11 }}
              axisLine={{ stroke: "rgb(var(--a-line))" }}
              tickLine={false}
              tickFormatter={shortDay}
              minTickGap={24}
            />
            <YAxis
              yAxisId="spend"
              tick={{ fill: AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)} k$` : `${v} $`)}
            />
            <YAxis
              yAxisId="leads"
              orientation="right"
              allowDecimals={false}
              tick={{ fill: LEADS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              {...tooltipStyle}
              cursor={{ fill: "rgb(var(--a-hover))" }}
              labelFormatter={(d: string) => longDay(d)}
              formatter={(value: number, name: string) =>
                name === "spend" ? [formatMoney(value, true), "Dépenses"] : [formatCount(value), "Leads"]
              }
            />
            <Bar yAxisId="spend" dataKey="spend" fill={SPEND} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Line
              yAxisId="leads"
              type="linear"
              dataKey="leads"
              stroke={LEADS}
              strokeWidth={2}
              dot={{ r: 2.5, fill: LEADS, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
