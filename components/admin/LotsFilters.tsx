"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
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
  const [, startTransition] = useTransition();

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
      <div className="relative sm:w-72">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un client…"
          className="field pl-10"
        />
      </div>
      <div
        role="tablist"
        aria-label="Filtrer par statut"
        className="inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
      >
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={status === key}
            onClick={() => pickStatus(key)}
            className={`rounded-full px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              status === key
                ? "bg-accent text-night-950 shadow-glow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
