"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Loader2, Trash2 } from "lucide-react";
import { messageErreurApi } from "@/lib/admin/message-erreur";

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
        setError(`Suppression échouée : ${messageErreurApi(body, res.status)}`);
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
        <p className="text-sm text-admin-muted">
          Aucun lot enregistré pour l&apos;instant.
        </p>
        <p className="mt-1 text-xs text-admin-muted">
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
          className="rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
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
            <p className="truncate font-display text-base font-semibold text-admin-ink">
              {l.name}
            </p>
            <p className="mt-0.5 text-xs text-admin-muted">
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
              className="inline-flex items-center gap-1.5 rounded-full bg-[#257a10] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1f6a0d] disabled:opacity-50"
            >
              <Calculator className="h-3 w-3" aria-hidden />
              Ouvrir
            </button>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => deleteLot(l.id, l.name)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                confirmingId === l.id
                  ? "border-admin-tint-red-line bg-admin-tint-red-strong text-admin-danger"
                  : "border-admin-line-strong bg-admin-card text-admin-ink hover:border-admin-tint-red-line hover:text-admin-danger"
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
