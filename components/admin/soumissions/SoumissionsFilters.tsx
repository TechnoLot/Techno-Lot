"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";
import { formatCount } from "@/lib/admin/format";
import type { FiltreSoumissions } from "@/lib/admin/soumissions";

const ONGLETS: { key: FiltreSoumissions; label: string }[] = [
  { key: "toutes", label: "Toutes" },
  { key: "a-traiter", label: "À traiter" },
  { key: "lot-cree", label: "Lot créé" },
];

/** Recherche (nom, courriel, téléphone, entreprise, message) et onglets de statut avec leur compte. */
export default function SoumissionsFilters({
  counts,
}: {
  counts: Record<FiltreSoumissions, number>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params?.get("q") ?? "");
  const statut = params?.get("statut") ?? "toutes";
  const [pending, startTransition] = useTransition();
  const layoutId = `soumissions-statut-${useId()}`;

  // Recherche débounée ; rien à faire quand q est déjà celui de l'URL (au
  // montage notamment), sinon on perdrait la page en cours.
  useEffect(() => {
    if (q === (params?.get("q") ?? "")) return;
    const timeout = setTimeout(() => {
      const p = new URLSearchParams(params?.toString() ?? "");
      if (q) p.set("q", q);
      else p.delete("q");
      p.delete("page");
      startTransition(() =>
        router.replace(`?${p.toString()}`, { scroll: false }),
      );
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pickStatut(key: FiltreSoumissions) {
    const p = new URLSearchParams(params?.toString() ?? "");
    if (key === "toutes") p.delete("statut");
    else p.set("statut", key);
    p.delete("page");
    startTransition(() =>
      router.replace(`?${p.toString()}`, { scroll: false }),
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative sm:w-80">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, courriel, téléphone…"
          aria-label="Rechercher une soumission"
          className="field !py-2.5 pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-admin-muted" aria-hidden />
          ) : q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Effacer la recherche"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card flex h-6 w-6 items-center justify-center rounded-md text-admin-muted hover:bg-admin-page hover:text-admin-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </span>
      </div>
      <div role="tablist" aria-label="Filtrer par statut" className="admin-segment">
        {ONGLETS.map(({ key, label }) => {
          const active = statut === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pickStatut(key)}
              className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
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
              <span className="relative">
                {label}
                <span className="ml-1.5 tabular-nums opacity-70">{formatCount(counts[key])}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
