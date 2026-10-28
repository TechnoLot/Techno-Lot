"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/admin/format";

type Point = { day: string; total: number };

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${d.toLocaleDateString("fr-CA", { month: "short" })}`;
}

export default function EbaySalesChart({ data }: { data: Point[] }) {
  return (
    <div className="mt-4 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ebayFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5ECB33" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5ECB33" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDate} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={(v) => formatMoney(v)} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
          <Tooltip
            contentStyle={{ background: "#0b1020", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
            labelFormatter={(l) => shortDate(String(l))}
            formatter={(v) => [formatMoney(Number(v), true), "Ventes"]}
          />
          <Area type="monotone" dataKey="total" stroke="#5ECB33" strokeWidth={2} fill="url(#ebayFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
