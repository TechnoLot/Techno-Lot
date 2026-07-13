"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { PERIODS, type PeriodKey } from "@/lib/admin/types";

export default function PeriodPills({ current }: { current: PeriodKey }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function pick(key: PeriodKey) {
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
      className="inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
    >
      {PERIODS.map((p) => {
        const active = p.key === current;
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => pick(p.key)}
            disabled={pending && active}
            className={`rounded-full px-3.5 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              active
                ? "bg-accent text-night-950 shadow-glow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
