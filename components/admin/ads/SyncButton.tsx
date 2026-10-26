"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react";
import type { LastSync } from "@/lib/ads/types";
import { formatRelative } from "./format";

type Result = { platform: string; ok: boolean; rows: number; message: string };
type Toast = { tone: "ok" | "warn" | "error"; title: string; lines: string[] };

const NAMES: Record<string, string> = { meta: "Meta", google: "Google" };

/**
 * Bouton « Synchroniser » : POST /api/admin/ads-sync puis rafraîchit la page.
 * Affiche un toast avec le résultat par plateforme.
 */
export default function SyncButton({ lastSync, days = 30 }: { lastSync: LastSync; days?: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(id);
  }, [toast]);

  async function run() {
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/ads-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const json = (await res.json().catch(() => ({}))) as { results?: Result[]; error?: string };
      const results = json.results ?? [];
      const lines = results.map(
        (r) => `${NAMES[r.platform] ?? r.platform} : ${r.ok ? `${r.rows} ligne${r.rows > 1 ? "s" : ""}` : r.message}`,
      );
      if (res.status === 401) {
        setToast({ tone: "error", title: "Session expirée", lines: ["Reconnecte-toi au tableau de bord."] });
      } else if (!res.ok || json.error) {
        setToast({ tone: "error", title: "Synchronisation impossible", lines: [json.error ?? `Erreur ${res.status}`, ...lines] });
      } else {
        const allOk = results.length > 0 && results.every((r) => r.ok);
        setToast({
          tone: allOk ? "ok" : "warn",
          title: allOk ? "Synchronisation terminée" : "Synchronisation partielle",
          lines,
        });
        router.refresh();
      }
    } catch {
      setToast({ tone: "error", title: "Erreur réseau", lines: ["Réessaie dans un instant."] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        aria-busy={loading}
        className="btn-primary !px-4 !py-2.5 !text-xs disabled:cursor-wait disabled:opacity-80"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
        {loading ? "Synchro…" : "Synchroniser"}
      </button>
      <p className="text-[11px] leading-tight text-slate-500">
        Dernière synchro
        <br />
        <span className={lastSync && !lastSync.ok ? "text-amber-300" : "text-slate-300"}>
          {lastSync ? formatRelative(lastSync.at) : "jamais"}
        </span>
      </p>

      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] justify-end">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              role="status"
              className={`pointer-events-auto w-80 max-w-full rounded-2xl border bg-night-900/95 p-4 shadow-card backdrop-blur-md ${
                toast.tone === "ok"
                  ? "border-accent/40"
                  : toast.tone === "warn"
                    ? "border-amber-400/40"
                    : "border-red-500/40"
              }`}
            >
              <div className="flex items-start gap-3">
                {toast.tone === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                ) : (
                  <AlertTriangle
                    className={`mt-0.5 h-5 w-5 shrink-0 ${toast.tone === "warn" ? "text-amber-300" : "text-red-400"}`}
                    aria-hidden
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{toast.title}</p>
                  {toast.lines.map((l, i) => (
                    <p key={i} className="mt-1 break-words text-xs text-slate-400">
                      {l}
                    </p>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="rounded-full p-1 text-slate-500 hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
