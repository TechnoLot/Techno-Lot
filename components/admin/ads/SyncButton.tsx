"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react";
import type { LastSync } from "@/lib/ads/types";
import { formatDateTime, formatRelative } from "./format";
import { btnPrimary } from "./ui";

type Result = { platform: string; ok: boolean; rows: number; message: string };
type Toast = { tone: "ok" | "warn" | "error"; title: string; lines: string[] };

const NAMES: Record<string, string> = { meta: "Meta", google: "Google" };

/**
 * Bouton « Mettre à jour depuis Meta » : POST /api/admin/ads-sync (toutes les
 * plateformes configurées), puis rafraîchit la page. Affiche la date de la
 * dernière mise à jour et un message de résultat.
 */
export default function SyncButton({
  lastSync,
  days = 30,
  label = "Mettre à jour depuis Meta",
}: {
  lastSync: LastSync;
  days?: number;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 8000);
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
        (r) => `${NAMES[r.platform] ?? r.platform} : ${r.ok ? `${r.rows} ligne${r.rows > 1 ? "s" : ""} importée${r.rows > 1 ? "s" : ""}` : r.message}`,
      );
      if (res.status === 401) {
        setToast({ tone: "error", title: "Session expirée", lines: ["Reconnecte-toi au tableau de bord."] });
      } else if (!res.ok || json.error) {
        setToast({ tone: "error", title: "Mise à jour impossible", lines: [json.error ?? `Erreur ${res.status}`, ...lines] });
      } else {
        const allOk = results.length > 0 && results.every((r) => r.ok);
        setToast({
          tone: allOk ? "ok" : "warn",
          title: allOk ? "Chiffres à jour" : "Mise à jour partielle",
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <button type="button" onClick={run} disabled={loading} aria-busy={loading} className={btnPrimary}>
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
        {loading ? "Mise à jour…" : label}
      </button>
      <p className="max-w-[16rem] text-[12px] leading-snug text-[#4f5a52]">
        Dernière mise à jour
        <br />
        {lastSync ? (
          <span
            className={`font-medium ${lastSync.ok ? "text-[#0a0a0a]" : "text-[#b54708]"}`}
            title={lastSync.ok ? undefined : lastSync.message ?? undefined}
            suppressHydrationWarning
          >
            {formatDateTime(lastSync.at)} ({formatRelative(lastSync.at)})
            {!lastSync.ok && " · échec"}
          </span>
        ) : (
          <span className="font-medium text-[#0a0a0a]">jamais</span>
        )}
      </p>

      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] justify-end">
        {toast && (
          <div
            role="status"
            className={`pointer-events-auto w-80 max-w-full rounded-2xl border bg-white p-4 shadow-[0_12px_32px_-12px_rgba(10,10,10,0.25)] ${
              toast.tone === "ok" ? "border-[#cfe9c2]" : toast.tone === "warn" ? "border-[#f6d7b0]" : "border-[#f4c7c3]"
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.tone === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#257a10]" aria-hidden />
              ) : (
                <AlertTriangle
                  className={`mt-0.5 h-5 w-5 shrink-0 ${toast.tone === "warn" ? "text-[#b54708]" : "text-[#b42318]"}`}
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0a0a0a]">{toast.title}</p>
                {toast.lines.map((l, i) => (
                  <p key={i} className="mt-1 break-words text-[13px] text-[#4f5a52]">
                    {l}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-full p-1 text-[#4f5a52] hover:bg-[#f4f7f2] hover:text-[#0a0a0a]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
