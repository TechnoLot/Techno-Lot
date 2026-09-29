"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const DEMO_DATA = [
  { name: "Google Ads", value: 42, color: "#4285F4" },
  { name: "Facebook", value: 28, color: "#1877F2" },
  { name: "Organique", value: 18, color: "#5ECB33" },
  { name: "Référence", value: 8, color: "#F59E0B" },
  { name: "Direct", value: 4, color: "#94A3B8" },
];

const TOTAL = DEMO_DATA.reduce((s, d) => s + d.value, 0);

export default function TrackingSources() {
  return (
    <div className="glass p-6">
      <h2 className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
        Sources de leads
      </h2>

      <div className="mt-4 flex items-center gap-6">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={DEMO_DATA}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {DEMO_DATA.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(6,10,20,0.95)",
                  border: "1px solid rgba(94,203,51,0.3)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  padding: "8px 12px",
                }}
                formatter={(value: number, name: string) => [
                  `${value} soumissions`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex-1 space-y-2.5">
          {DEMO_DATA.map((d) => (
            <li key={d.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-slate-300">{d.name}</span>
              </span>
              <span className="font-display font-semibold tabular-nums text-white">
                {Math.round((d.value / TOTAL) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-slate-600">
        Données démo
      </p>
    </div>
  );
}
