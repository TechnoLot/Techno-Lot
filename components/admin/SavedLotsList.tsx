"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Loader2, Trash2 } from "lucide-react";

type SavedLot = {
  id: string;
  name: string;
  itemCount: number;
  savedDate: string | null;
  updatedAt: string;
  createdByEmail: string | null;
};

/**
 * Liste cliente des lots enregistrés. « Ouvrir » redirige vers la
 * calculatrice avec `?lot=<id>` — l'iframe lit ce paramètre et charge le
 * lot depuis Supabase.
 */
export default function SavedLotsList({ lots }: { lots: SavedLot[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function openLot(id: string) {
    router.push(`/admin/calculatrice?lot=${id}`);
  }

  function deleteLot(id: string, name: string) {
    if (confirmingId !== id) {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId((c) => (c === id ? null : c)), 3000);
      return;
    }
    setConfirmingId(null);
    setBusy(id);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/admin/calculatrice/api/saved/${id}`, {
        method: "DELETE",
      });
      setBusy(null);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(`Suppression échouée : ${body.error ?? res.statusText}`);
        return;
      }
      router.refresh();
      // Pour info à l'utilisateur ; on peut réutiliser le nom si besoin
      void name;
    });
  }

  const isWorking = pending || busy !== null;

  if (lots.length === 0) {
    return (
      <div className="glass p-12 text-center">
        <p className="text-sm text-slate-400">
          Aucun lot enregistré pour l&apos;instant.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Dans la calculatrice, clique « Enregistrer le lot » pour le retrouver
          ici (et sur les autres appareils).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {lots.map((l) => (
        <div
          key={l.id}
          className="glass flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-white">
              {l.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {l.itemCount} item{l.itemCount > 1 ? "s" : ""}
              {" · "}enregistré {formatDate(l.savedDate ?? l.updatedAt)}
              {l.createdByEmail && ` · par ${l.createdByEmail}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isWorking}
              onClick={() => openLot(l.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-accent-bright transition-colors hover:border-accent hover:shadow-glow disabled:opacity-50"
            >
              <Calculator className="h-3 w-3" aria-hidden />
              Ouvrir
            </button>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => deleteLot(l.id, l.name)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                confirmingId === l.id
                  ? "border-red-500/60 bg-red-500/20 text-red-200"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-red-500/40 hover:text-red-300"
              }`}
            >
              {busy === l.id ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3 w-3" aria-hidden />
              )}
              {confirmingId === l.id ? "Confirmer" : "Supprimer"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("fr-CA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Toronto",
    }).format(d);
  } catch {
    return iso;
  }
}
