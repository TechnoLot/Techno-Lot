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

  // gradient = tuile mise en avant (lime, texte encre) ; green = chiffre vert.
  const numberClass = variant === "green" ? "text-[#257a10]" : "text-[#0a0a0a]";

  const up = delta !== null && delta > 1;
  const down = delta !== null && delta < -1;
  const good = invertDelta ? down : up;
  const bad = invertDelta ? up : down;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`relative rounded-2xl border p-4 sm:p-5 ${
        highlight ? "border-[#6bd63b] bg-[#6bd63b]" : "border-[#e3eadf] bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[13px] font-medium ${highlight ? "text-[#0a0a0a]" : "text-[#4f5a52]"}`}>
          {label}
        </p>
        {Icon && (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              highlight ? "bg-[#0a0a0a]/10 text-[#0a0a0a]" : "bg-[#f4f7f2] text-[#4f5a52]"
            }`}
          >
            <Icon className="h-[15px] w-[15px]" aria-hidden />
          </span>
        )}
      </div>
      <p
        className={`mt-3 truncate font-display text-[24px] font-semibold leading-none tracking-tight tabular-nums sm:text-[30px] ${numberClass}`}
      >
        <AnimatedNumber value={value} format={formatter} />
      </p>
      <div className="mt-3 flex min-h-[20px] flex-wrap items-center gap-1.5 text-xs">
        {delta === null ? (
          <span className={highlight ? "text-[#0a0a0a]" : "text-[#4f5a52]"}>
            {prev === null ? "Toute la période" : "Pas de référence"}
          </span>
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold tabular-nums ${
                good
                  ? "bg-[#e6f4de] text-[#1f5f0c]"
                  : bad
                    ? "bg-[#fdecea] text-[#b42318]"
                    : "bg-[#eef2ec] text-[#4f5a52]"
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
            <span className={`hidden sm:inline ${highlight ? "text-[#0a0a0a]" : "text-[#4f5a52]"}`}>
              vs période préc.
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}
