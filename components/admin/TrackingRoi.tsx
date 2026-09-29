"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatMoney } from "@/lib/admin/format";

const DEMO_DATA = [
  { channel: "Google Ads", spent: 3_200, revenue: 18_500 },
  { channel: "Facebook", spent: 1_800, revenue: 9_200 },
  { channel: "Organique", spent: 0, revenue: 7_600 },
  { channel: "Référence", spent: 0, revenue: 4_100 },
];

export default function TrackingRoi() {
  const data = DEMO_DATA.map((d) => ({
    ...d,
    profit: d.revenue - d.spent,
    roas: d.spent > 0 ? (d.revenue / d.spent).toFixed(1) : "∞",
  }));

  const totalSpent = DEMO_DATA.reduce((s, d) => s + d.spent, 0);
  const totalRevenue = DEMO_DATA.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="glass p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
          ROI par canal
        </h2>
        <div className="flex items-baseline gap-4 text-xs text-slate-400">
          <span>
            ROAS global :{" "}
            <span className="font-display font-bold text-accent-bright">
              {(totalRevenue / totalSpent).toFixed(1)}x
            </span>
          </span>
        </div>
      </div>

      <div className="mt-4 h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="channel"
              tick={{ fill: "rgba(148,163,184,0.7)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
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
              formatter={(value: number, name: string) => [
                formatMoney(value),
                name === "spent" ? "Dépensé" : "Revenus",
              ]}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
              formatter={(value: string) =>
                value === "spent" ? "Dépensé" : "Revenus"
              }
            />
            <Bar dataKey="spent" fill="rgba(255,255,255,0.25)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="revenue" fill="#5ECB33" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 text-left text-slate-500">
              <th className="pb-2 pr-4 font-medium">Canal</th>
              <th className="pb-2 pr-4 text-right font-medium">Dépensé</th>
              <th className="pb-2 pr-4 text-right font-medium">Revenus</th>
              <th className="pb-2 pr-4 text-right font-medium">Profit</th>
              <th className="pb-2 text-right font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((d) => (
              <tr key={d.channel}>
                <td className="py-2 pr-4 font-medium text-slate-300">
                  {d.channel}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-400">
                  {formatMoney(d.spent)}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-white">
                  {formatMoney(d.revenue)}
                </td>
                <td
                  className={`py-2 pr-4 text-right font-semibold tabular-nums ${
                    d.profit > 0 ? "text-accent-bright" : "text-red-300"
                  }`}
                >
                  {formatMoney(d.profit)}
                </td>
                <td className="py-2 text-right font-display font-bold tabular-nums text-accent-bright">
                  {d.roas}x
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-slate-600">
        Données démo
      </p>
    </div>
  );
}
