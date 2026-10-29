"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { PERIODES, type PeriodeKey } from "@/lib/admin/periodes";

/**
 * Sélecteur de période (paramètre d'URL `param`, « periode » par défaut).
 * `options` limite les choix ; `resetParams` sont retirés de l'URL au
 * changement (par défaut « page », pour revenir à la première page).
 */
export default function PeriodeSelect({
  current,
  param = "periode",
  options,
  resetParams = ["page"],
}: {
  current: PeriodeKey;
  param?: string;
  options?: PeriodeKey[];
  resetParams?: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Sélection optimiste : la pastille bouge tout de suite, les données suivent.
  const [optimistic, setOptimistic] = useState<PeriodeKey | null>(null);
  const selected = pending && optimistic ? optimistic : current;
  const layoutId = `periode-${useId()}`;
  const list = options ? PERIODES.filter((p) => options.includes(p.key)) : PERIODES;

  function pick(key: PeriodeKey) {
    if (key === current) return;
    setOptimistic(key);
    const p = new URLSearchParams(params?.toString() ?? "");
    p.set(param, key);
    for (const r of resetParams) p.delete(r);
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
