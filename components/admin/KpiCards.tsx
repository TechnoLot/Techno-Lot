"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import AnimatedNumber from "@/components/admin/AnimatedNumber";
import { formatCount, formatMoney, pctChange } from "@/lib/admin/format";

export type KpiSpec = {
  label: string;
  value: number;
  prev: number | null;
  format: "count" | "money";
  variant?: "default" | "green" | "gradient";
  /** Pour une dépense, une hausse n'est pas « bonne » : inverse la couleur de la variation. */
  invertDelta?: boolean;
};

export default function KpiCards({ cards }: { cards: KpiSpec[] }) {
  return (
    <div className="admin-stats grid-cols-2 xl:grid-cols-4">
      {cards.map((c, i) => (
        <KpiCard key={c.label} spec={c} index={i} />
      ))}
    </div>
  );
}

function KpiCard({ spec, index }: { spec: KpiSpec; index: number }) {
  const { label, value, prev, format, variant = "default", invertDelta } = spec;
  const formatter =
    format === "money"
      ? (n: number) => formatMoney(n)
      : (n: number) => formatCount(Math.round(n));

  const delta = prev !== null ? pctChange(value, prev) : null;

  // gradient ou green : chiffre mis en avant, en vert.
  const numberClass = variant === "default" ? "" : "text-admin-green";

  const up = delta !== null && delta > 1;
  const down = delta !== null && delta < -1;
  const good = invertDelta ? down : up;
  const bad = invertDelta ? up : down;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="admin-stat"
    >
      <p className="text-[13px] font-medium text-admin-muted">{label}</p>
      <p
        className={`admin-stat-valeur ${numberClass}`}
      >
        <AnimatedNumber value={value} format={formatter} />
      </p>
      <div className="mt-3 flex min-h-[20px] flex-wrap items-center gap-1.5 text-xs">
        {delta === null ? (
          <span className="text-admin-muted">
            {prev === null ? "Toute la période" : "Pas de référence"}
          </span>
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold tabular-nums ${
                good
                  ? "bg-admin-tint-green text-admin-tint-green-ink"
                  : bad
                    ? "bg-admin-tint-red text-admin-danger"
                    : "bg-admin-tint-gray text-admin-muted"
              }`}
            >
              {up ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              ) : down ? (
                <ArrowDownRight className="h-3 w-3" aria-hidden />
              ) : (
                <Minus className="h-3 w-3" aria-hidden />
              )}
              {Math.abs(delta).toFixed(0)} %
            </span>
            <span className="hidden text-admin-muted sm:inline">
              vs période préc.
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}
