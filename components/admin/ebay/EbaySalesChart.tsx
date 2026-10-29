"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/admin/format";

type Point = { day: string; total: number; orders?: number };

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${d.toLocaleDateString("fr-CA", { month: "short" })}`;
}

// Mois « YYYY-MM-01 » sans heure : formatés en UTC pour éviter tout décalage.
const moisCourtFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", month: "short" });
const moisLongFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", month: "long", year: "numeric" });

function moisUtc(iso: string): Date {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

/** « oct. 26 » */
function shortMonth(iso: string): string {
  return `${moisCourtFmt.format(moisUtc(iso))} ${iso.slice(2, 4)}`;
}

/** « octobre 2026 » */
function longMonth(iso: string): string {
  return moisLongFmt.format(moisUtc(iso));
}

export default function EbaySalesChart({
  data,
  granularite = "jour",
}: {
  data: Point[];
  granularite?: "jour" | "mois";
}) {
  const mois = granularite === "mois";
  return (
    <div className="mt-4 h-60 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--a-line-soft))" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={mois ? shortMonth : shortDate}
            tick={{ fill: "rgb(var(--a-muted))", fontSize: 11 }}
            axisLine={{ stroke: "rgb(var(--a-line))" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => formatMoney(v)}
            tick={{ fill: "rgb(var(--a-muted))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ stroke: "rgb(var(--a-line-strong))" }}
            contentStyle={{
              background: "rgb(var(--a-card))",
              border: "1px solid rgb(var(--a-line))",
              borderRadius: 12,
              fontSize: 12,
              color: "rgb(var(--a-ink))",
            }}
            labelStyle={{ color: "rgb(var(--a-muted))" }}
            labelFormatter={(l) => (mois ? longMonth(String(l)) : shortDate(String(l)))}
            formatter={(v, _name, item) => {
              const orders = (item?.payload as Point | undefined)?.orders;
              const suffix = orders ? ` · ${orders} commande${orders > 1 ? "s" : ""}` : "";
              return [`${formatMoney(Number(v), true)}${suffix}`, "Ventes"];
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="rgb(var(--a-green))"
            strokeWidth={2}
            fill="#6bd63b"
            fillOpacity={0.18}
            dot={mois ? { r: 4, fill: "rgb(var(--a-green))", stroke: "rgb(var(--a-card))", strokeWidth: 2 } : false}
            activeDot={{ r: 4, fill: "rgb(var(--a-green))", stroke: "rgb(var(--a-card))", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
