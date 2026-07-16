"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { LEAD_STATUS_LABELS, RESEARCH_STATUS_LABELS } from "@/lib/crm/types";

const SCORE_TABS: { key: string; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "9", label: "9+" },
  { key: "7", label: "7+" },
  { key: "5", label: "5+" },
];

export default function CompaniesFilters({ regions }: { regions: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params?.get("q") ?? "");
  const score = params?.get("score") ?? "all";
  const region = params?.get("region") ?? "all";
  const status = params?.get("status") ?? "all";
  const suivi = params?.get("suivi") ?? "all";
  const partners = params?.get("partenaires") === "1";
  const [, startTransition] = useTransition();

  function push(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params?.toString() ?? "");
    mutate(p);
    startTransition(() =>
      router.replace(`?${p.toString()}`, { scroll: false }),
    );
  }

  // Recherche débounée
  useEffect(() => {
    const timeout = setTimeout(() => {
      push((p) => {
        if (q) p.set("q", q);
        else p.delete("q");
      });
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const selectClass =
    "rounded-xl border border-white/10 bg-night-800/80 px-3 py-2 text-xs text-white focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative sm:w-72">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une compagnie…"
          className="field pl-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Score minimum"
          className="inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
        >
          {SCORE_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={score === key}
              onClick={() =>
                push((p) => {
                  if (key === "all") p.delete("score");
                  else p.set("score", key);
                })
              }
              className={`rounded-full px-3 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                score === key
                  ? "bg-accent text-night-950 shadow-glow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={suivi}
          onChange={(e) =>
            push((p) => {
              if (e.target.value === "all") p.delete("suivi");
              else p.set("suivi", e.target.value);
            })
          }
          aria-label="Filtrer par suivi"
          className={selectClass}
        >
          <option value="all">Tous les suivis</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={region}
          onChange={(e) =>
            push((p) => {
              if (e.target.value === "all") p.delete("region");
              else p.set("region", e.target.value);
            })
          }
          aria-label="Filtrer par région"
          className={selectClass}
        >
          <option value="all">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) =>
            push((p) => {
              if (e.target.value === "all") p.delete("status");
              else p.set("status", e.target.value);
            })
          }
          aria-label="Filtrer par statut de recherche"
          className={selectClass}
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(RESEARCH_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <input
            type="checkbox"
            checked={partners}
            onChange={(e) =>
              push((p) => {
                if (e.target.checked) p.set("partenaires", "1");
                else p.delete("partenaires");
              })
            }
            className="h-3.5 w-3.5 accent-[#5ECB33]"
          />
          Inclure partenaires
        </label>
      </div>
    </div>
  );
}
