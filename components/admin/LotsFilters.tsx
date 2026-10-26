"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";
import type { LotStatus } from "@/lib/admin/types";

const STATUS_TABS: { key: LotStatus | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "negotiating", label: "Négocié" },
  { key: "purchased", label: "Acheté" },
  { key: "sold", label: "Vendu" },
  { key: "cancelled", label: "Annulé" },
];

export default function LotsFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params?.get("q") ?? "");
  const status = params?.get("status") ?? "all";
  const [pending, startTransition] = useTransition();
  const layoutId = `lots-status-${useId()}`;

  // Recherche débounée
  useEffect(() => {
    const timeout = setTimeout(() => {
      const p = new URLSearchParams(params?.toString() ?? "");
      if (q) p.set("q", q);
      else p.delete("q");
      startTransition(() =>
        router.replace(`?${p.toString()}`, { scroll: false }),
      );
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pickStatus(key: string) {
    const p = new URLSearchParams(params?.toString() ?? "");
    if (key === "all") p.delete("status");
    else p.set("status", key);
    startTransition(() =>
      router.replace(`?${p.toString()}`, { scroll: false }),
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative sm:w-80">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un client…"
          aria-label="Rechercher un client"
          className="field !rounded-xl !py-2.5 pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-hidden />
          ) : q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Effacer la recherche"
              className="admin-focus flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </span>
      </div>
      <div role="tablist" aria-label="Filtrer par statut" className="admin-segment">
        {STATUS_TABS.map(({ key, label }) => {
          const active = status === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pickStatus(key)}
              className={`admin-focus relative shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? "text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  aria-hidden
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className="absolute inset-0 rounded-lg bg-white/[0.08] ring-1 ring-inset ring-white/[0.08]"
                />
              )}
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
