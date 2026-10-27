"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

type SyncResponse = { ok?: boolean; message?: string };

/** Bouton « Synchroniser avec eBay » : POST /api/admin/ebay-sync puis rafraîchit la page. */
export default function EbaySyncButton({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function sync() {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/admin/ebay-sync", { method: "POST" });
      const data = (await r.json().catch(() => ({}))) as SyncResponse;
      setResult({
        ok: Boolean(r.ok && data.ok),
        message: data.message ?? (r.ok ? "Synchronisation terminée." : `Erreur ${r.status}.`),
      });
      if (r.ok) startTransition(() => router.refresh());
    } catch {
      setResult({ ok: false, message: "Connexion au serveur impossible. Réessaie dans un instant." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button
        type="button"
        onClick={sync}
        disabled={busy || !configured}
        className="inline-flex items-center gap-2 rounded-full bg-[#257a10] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e6a0c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#257a10] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
        {busy ? "Synchronisation…" : "Synchroniser avec eBay"}
      </button>
      {!configured && <p className="text-xs text-[#4f5a52]">Disponible une fois eBay connecté.</p>}
      {result && (
        <p role="status" className={`max-w-xs text-xs sm:text-right ${result.ok ? "text-[#257a10]" : "text-[#b42318]"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
