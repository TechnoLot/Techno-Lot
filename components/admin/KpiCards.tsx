"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import AnimatedNumber from "@/components/admin/AnimatedNumber";
import { formatCount, formatMoney, pctChange } from "@/lib/admin/format";

export type KpiSpec = {
  label: string;
  value: number;
  prev: number | null;
  format: "count" | "money";
  variant?: "default" | "green" | "gradient";
};

export default function KpiCards({ cards }: { cards: KpiSpec[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <KpiCard key={c.label} spec={c} />
      ))}
    </div>
  );
}

function KpiCard({ spec }: { spec: KpiSpec }) {
  const { label, value, prev, format, variant = "default" } = spec;
  const formatter =
    format === "money" ? (n: number) => formatMoney(n) : (n: number) => formatCount(Math.round(n));

  const delta = prev !== null ? pctChange(value, prev) : null;

  const numberClass =
    variant === "gradient"
      ? "text-gradient"
      : variant === "green"
        ? "text-accent-bright"
        : "text-white";

  return (
    <div className="glass p-5 lg:p-6">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-3 font-display text-3xl font-bold tabular-nums lg:text-4xl ${numberClass}`}
      >
        <AnimatedNumber value={value} format={formatter} />
      </p>
      {delta !== null && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {delta > 1 ? (
            <ArrowUp className="h-3 w-3 text-accent" aria-hidden />
          ) : delta < -1 ? (
            <ArrowDown className="h-3 w-3 text-red-400" aria-hidden />
          ) : (
            <Minus className="h-3 w-3 text-slate-500" aria-hidden />
          )}
          <span
            className={
              delta > 1
                ? "font-semibold text-accent-bright"
                : delta < -1
                  ? "font-semibold text-red-300"
                  : "text-slate-400"
            }
          >
            {Math.abs(delta).toFixed(0)}%
          </span>
          <span className="text-slate-500">vs. période préc.</span>
        </div>
      )}
    </div>
  );
}
