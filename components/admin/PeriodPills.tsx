"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { PERIODS, type PeriodKey } from "@/lib/admin/types";

export default function PeriodPills({ current }: { current: PeriodKey }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Sélection optimiste : la pastille bouge tout de suite, les données suivent.
  const [optimistic, setOptimistic] = useState<PeriodKey | null>(null);
  const selected = pending && optimistic ? optimistic : current;
  const layoutId = `period-${useId()}`;

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
      className={`admin-segment transition-opacity ${pending ? "opacity-80" : ""}`}
    >
      {PERIODS.map((p) => {
        const active = p.key === selected;
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => pick(p.key)}
            className={`admin-focus relative shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              active ? "text-night-950" : "text-slate-400 hover:text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-lg bg-accent shadow-[0_4px_14px_-4px_rgba(94,203,51,0.7)]"
              />
            )}
            <span className="relative">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
