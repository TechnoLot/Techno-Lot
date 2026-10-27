"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { PERIODS, type PeriodKey } from "@/lib/admin/types";

/**
 * Sélecteur de période (paramètre d'URL `period`). `options` limite les
 * choix proposés (par défaut : toutes les périodes de PERIODS).
 */
export default function PeriodPills({
  current,
  options,
}: {
  current: PeriodKey;
  options?: PeriodKey[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Sélection optimiste : la pastille bouge tout de suite, les données suivent.
  const [optimistic, setOptimistic] = useState<PeriodKey | null>(null);
  const selected = pending && optimistic ? optimistic : current;
  const layoutId = `period-${useId()}`;
  const list = options ? PERIODS.filter((p) => options.includes(p.key)) : PERIODS;

  function pick(key: PeriodKey) {
    if (key === current) return;
    setOptimistic(key);
    const p = new URLSearchParams(params?.toString() ?? "");
    p.set("period", key);
    startTransition(() => {
      router.push(`?${p.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Période"
      aria-busy={pending}
      className={`admin-segment transition-opacity ${pending ? "opacity-70" : ""}`}
    >
      {list.map((p) => {
        const active = p.key === selected;
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => pick(p.key)}
            className={`admin-focus relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              active ? "text-admin-ink" : "text-admin-muted hover:text-admin-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-full bg-[#6bd63b]"
              />
            )}
            <span className="relative">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
