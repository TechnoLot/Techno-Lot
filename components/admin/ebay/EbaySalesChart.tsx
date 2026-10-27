"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/admin/format";

type Point = { day: string; total: number; orders?: number };

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${d.toLocaleDateString("fr-CA", { month: "short" })}`;
}

export default function EbaySalesChart({ data }: { data: Point[] }) {
  return (
    <div className="mt-4 h-60 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#edf2ea" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDate}
            tick={{ fill: "#4f5a52", fontSize: 11 }}
            axisLine={{ stroke: "#e3eadf" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => formatMoney(v)}
            tick={{ fill: "#4f5a52", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ stroke: "#c9d6c3" }}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e3eadf",
              borderRadius: 12,
              fontSize: 12,
              color: "#0a0a0a",
            }}
            labelStyle={{ color: "#4f5a52" }}
            labelFormatter={(l) => shortDate(String(l))}
            formatter={(v, _name, item) => {
              const orders = (item?.payload as Point | undefined)?.orders;
              const suffix = orders ? ` · ${orders} commande${orders > 1 ? "s" : ""}` : "";
              return [`${formatMoney(Number(v), true)}${suffix}`, "Ventes"];
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#257a10"
            strokeWidth={2}
            fill="#6bd63b"
            fillOpacity={0.18}
            activeDot={{ r: 4, fill: "#257a10", stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
