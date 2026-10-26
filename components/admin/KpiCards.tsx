"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Minus,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AnimatedNumber from "@/components/admin/AnimatedNumber";
import { formatCount, formatMoney, pctChange } from "@/lib/admin/format";

export type KpiSpec = {
  label: string;
  value: number;
  prev: number | null;
  format: "count" | "money";
  variant?: "default" | "green" | "gradient";
  /** Icône facultative (clé, pour rester sérialisable depuis un composant serveur). */
  icon?: "lots" | "spent" | "revenue" | "profit";
  /** Pour une dépense, une hausse n'est pas « bonne » : inverse la couleur de la variation. */
  invertDelta?: boolean;
};

const ICONS: Record<NonNullable<KpiSpec["icon"]>, LucideIcon> = {
  lots: Package,
  spent: ShoppingCart,
  revenue: CircleDollarSign,
  profit: TrendingUp,
};

export default function KpiCards({ cards }: { cards: KpiSpec[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {cards.map((c, i) => (
        <KpiCard key={c.label} spec={c} index={i} />
      ))}
    </div>
  );
}

function KpiCard({ spec, index }: { spec: KpiSpec; index: number }) {
  const { label, value, prev, format, variant = "default", icon, invertDelta } = spec;
  const formatter =
    format === "money"
      ? (n: number) => formatMoney(n)
      : (n: number) => formatCount(Math.round(n));

  const delta = prev !== null ? pctChange(value, prev) : null;
  const Icon = icon ? ICONS[icon] : null;
  const highlight = variant === "gradient";

  const numberClass =
    variant === "gradient"
      ? "text-gradient"
      : variant === "green"
        ? "text-accent-bright"
        : "text-white";

  const up = delta !== null && delta > 1;
  const down = delta !== null && delta < -1;
  const good = invertDelta ? down : up;
  const bad = invertDelta ? up : down;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`admin-card relative overflow-hidden p-4 sm:p-5 ${
        highlight ? "border-accent/20" : ""
      }`}
    >
      {highlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-accent/15 blur-3xl"
        />
      )}
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-400">{label}</p>
        {Icon && (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              highlight || variant === "green"
                ? "bg-accent/10 text-accent"
                : "bg-white/[0.04] text-slate-400"
            }`}
          >
            <Icon className="h-[15px] w-[15px]" aria-hidden />
          </span>
        )}
      </div>
      <p
        className={`relative mt-3 truncate font-display text-[22px] font-semibold leading-none tracking-tight tabular-nums sm:text-[28px] 2xl:text-[30px] ${numberClass}`}
      >
        <AnimatedNumber value={value} format={formatter} />
      </p>
      <div className="relative mt-3 flex min-h-[20px] flex-wrap items-center gap-1.5 text-xs">
        {delta === null ? (
          <span className="text-slate-600">
            {prev === null ? "Toute la période" : "Pas de référence"}
          </span>
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${
                good
                  ? "bg-accent/10 text-accent-bright"
                  : bad
                    ? "bg-red-500/10 text-red-300"
                    : "bg-white/[0.05] text-slate-400"
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
            <span className="hidden text-slate-500 sm:inline">vs période préc.</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
