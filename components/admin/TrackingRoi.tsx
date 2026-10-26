"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/admin/format";
import { TrackingEmpty } from "@/components/admin/TrackingSources";
import { AD_PLATFORMS, type AdPlatform } from "@/lib/ads/platforms";

export type AdSpendRow = { platform: AdPlatform; spend: number; leads: number };

/**
 * Dépenses publicitaires (ad_metrics_daily) et leads (ad_leads) par
 * plateforme sur la période, avec coût par lead.
 */
export default function TrackingRoi({ rows }: { rows: AdSpendRow[] }) {
  const data = rows
    .filter((r) => r.spend > 0 || r.leads > 0)
    .map((r) => ({
      ...r,
      label: AD_PLATFORMS[r.platform].label,
      short: r.platform === "meta" ? "Meta" : AD_PLATFORMS[r.platform].label,
      color: AD_PLATFORMS[r.platform].color,
      cpl: r.leads > 0 && r.spend > 0 ? r.spend / r.leads : null,
    }))
    .sort((a, b) => b.spend - a.spend || b.leads - a.leads);

  const totalSpend = data.reduce((s, d) => s + d.spend, 0);
  const paidLeads = data.filter((d) => d.spend > 0).reduce((s, d) => s + d.leads, 0);
  const globalCpl = paidLeads > 0 && totalSpend > 0 ? totalSpend / paidLeads : null;
  const chartData = data.filter((d) => d.spend > 0);

  return (
    <section className="admin-card flex flex-col p-5 sm:p-6" aria-labelledby="roi-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="roi-title" className="admin-card-title">
            Dépenses publicitaires
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Dépense et coût par lead, par plateforme</p>
        </div>
        {totalSpend > 0 && (
          <dl className="flex gap-6">
            <div>
              <dt className="text-[11px] text-slate-500">Dépensé</dt>
              <dd className="font-display text-lg font-semibold tabular-nums text-white">
                {formatMoney(totalSpend)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500">Coût par lead</dt>
              <dd className="font-display text-lg font-semibold tabular-nums text-accent-bright">
                {globalCpl !== null ? formatMoney(globalCpl, true) : "—"}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {data.length === 0 ? (
        <TrackingEmpty
          title="Aucune dépense enregistrée"
          text="Les dépenses Meta et Google Ads synchronisées apparaîtront ici avec le coût par lead."
        />
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {chartData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="short"
                    tick={{ fill: "rgba(148,163,184,0.65)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
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
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={{
                      background: "rgba(10,15,28,0.96)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      padding: "10px 12px",
                    }}
                    labelStyle={{ color: "rgba(148,163,184,0.9)", marginBottom: "4px" }}
                    itemStyle={{ color: "white" }}
                    formatter={(value: number) => [formatMoney(value), "Dépensé"]}
                  />
                  <Bar dataKey="spend" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={700}>
                    {chartData.map((d) => (
                      <Cell key={d.platform} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-white/[0.07] px-4 text-center text-xs text-slate-500">
              Aucune dépense payante sur la période — leads seulement.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-[11px] text-slate-500">
                  <th scope="col" className="pb-2 pr-4 font-medium">Plateforme</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-medium">Dépensé</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-medium">Leads</th>
                  <th scope="col" className="pb-2 text-right font-medium">Coût / lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.map((d) => (
                  <tr key={d.platform} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                          style={{ backgroundColor: d.color }}
                          aria-hidden
                        />
                        <span className="truncate">{d.label}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-slate-300">
                      {d.spend > 0 ? formatMoney(d.spend) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-white">
                      {d.leads}
                    </td>
                    <td className="py-2.5 text-right font-display font-semibold tabular-nums text-accent-bright">
                      {d.cpl !== null ? formatMoney(d.cpl, true) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
