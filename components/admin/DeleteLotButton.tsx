"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteLot } from "@/lib/admin/actions";

export default function DeleteLotButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Le mode "confirmation" se ré-arme après 3 s d'inactivité
  useEffect(() => {
    if (!confirming) return;
    const timeout = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timeout);
  }, [confirming]);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      // En cas de succès, deleteLot redirige et ne retourne jamais.
      const res = await deleteLot(id);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-2 rounded-lg border border-admin-tint-red-line bg-admin-tint-red px-3 py-2 text-xs text-admin-danger"
        >
          Suppression impossible : {error}
        </p>
      )}
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-70 ${
        confirming
          ? "border-admin-tint-red-line bg-admin-tint-red-strong text-admin-danger"
          : "border-admin-line-strong bg-admin-card text-admin-ink hover:border-admin-tint-red-line hover:text-admin-danger"
      }`}
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Suppression…
        </>
      ) : (
        <>
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {confirming ? "Confirmer" : "Supprimer"}
        </>
      )}
    </button>
    </>
  );
}
