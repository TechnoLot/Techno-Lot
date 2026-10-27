"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RefreshCw, Search, Shuffle } from "lucide-react";
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
  const appel = params?.get("appel") ?? "all";
  const partners = params?.get("partenaires") === "1";
  const shuffled = params?.get("ordre") === "aleatoire";
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
    "rounded-[10px] border border-[#c9d6c3] bg-white px-3 py-2 text-[13px] text-[#0a0a0a] focus:border-[#6bd63b] focus:outline-none focus:ring-2 focus:ring-[#6bd63b]/40";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative sm:w-72">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5a52]"
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
          className="inline-flex gap-1 rounded-full border border-[#e3eadf] bg-white p-1"
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
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                score === key
                  ? "bg-[#6bd63b] text-[#0a0a0a]"
                  : "text-[#4f5a52] hover:text-[#0a0a0a]"
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
          value={appel}
          onChange={(e) =>
            push((p) => {
              if (e.target.value === "all") p.delete("appel");
              else p.set("appel", e.target.value);
            })
          }
          aria-label="Filtrer par appel fait"
          className={selectClass}
        >
          <option value="all">Appel : tous</option>
          <option value="oui">Appel fait</option>
          <option value="non">Pas encore appelé</option>
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

        {/* Ordre aléatoire : stable tant qu'on ne relance pas le mélange */}
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-pressed={shuffled}
            title={
              shuffled
                ? "Revenir au tri par score"
                : "Mélanger les leads aléatoirement"
            }
            onClick={() =>
              push((p) => {
                if (shuffled) {
                  p.delete("ordre");
                  p.delete("seed");
                } else {
                  p.set("ordre", "aleatoire");
                  p.set("seed", Date.now().toString(36));
                }
              })
            }
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold transition-colors ${
              shuffled
                ? "border-[#8fcb76] bg-[#e2f3d8] text-[#257a10]"
                : "border-[#c9d6c3] bg-white text-[#4f5a52] hover:text-[#0a0a0a]"
            }`}
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden />
            Aléatoire
          </button>
          {shuffled && (
            <button
              type="button"
              title="Relancer le mélange"
              aria-label="Relancer le mélange"
              onClick={() =>
                push((p) => p.set("seed", Date.now().toString(36)))
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#c9d6c3] bg-white text-[#4f5a52] transition-colors hover:border-[#a9d896] hover:text-[#257a10]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#c9d6c3] bg-white px-3 py-2 text-[13px] font-medium text-[#0a0a0a]">
          <input
            type="checkbox"
            checked={partners}
            onChange={(e) =>
              push((p) => {
                if (e.target.checked) p.set("partenaires", "1");
                else p.delete("partenaires");
              })
            }
            className="h-3.5 w-3.5 accent-[#257a10]"
          />
          Inclure partenaires
        </label>
      </div>
    </div>
  );
}
