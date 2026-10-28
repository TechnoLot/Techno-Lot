"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SyncResponse = {
  ok?: boolean;
  configured?: boolean;
  skipped?: boolean;
  lastSync?: string | null;
  message?: string;
};

/** Intervalle de la synchro de fond quand l'onglet est visible. */
const AUTO_INTERVAL_MS = 2 * 60_000;
/** Recalcul du libellé « il y a X min ». */
const TICK_MS = 30_000;

function ago(iso: string | null, now: number): string {
  if (!iso) return "jamais";
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "à l’instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

/**
 * Synchro eBay automatique : au montage, toutes les 2 min (onglet visible) et
 * au retour sur l'onglet, POST /api/admin/ebay-sync `{ auto: true }` (le
 * serveur saute si la dernière tentative a moins de 90 s). Un clic force une
 * synchro manuelle. Rafraîchit la page quand une nouvelle synchro a réussi.
 */
export default function EbayAutoSync({
  configured,
  lastSync,
  variant = "inline",
}: {
  configured: boolean;
  /** Dernière synchro réussie telle que rendue par le serveur */
  lastSync: string | null;
  variant?: "inline" | "badge";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const busyRef = useRef(false);
  const lastSyncRef = useRef(lastSync);

  useEffect(() => {
    lastSyncRef.current = lastSync;
  }, [lastSync]);

  const sync = useCallback(
    async (auto: boolean) => {
      if (!configured || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const r = await fetch("/api/admin/ebay-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: auto ? JSON.stringify({ auto: true }) : undefined,
        });
        const data = (await r.json().catch(() => ({}))) as SyncResponse;
        if (data.ok || data.skipped) {
          setError(null);
        } else {
          setError(data.message ?? `Erreur ${r.status}.`);
        }
        if (data.lastSync && data.lastSync !== lastSyncRef.current) {
          startTransition(() => router.refresh());
        }
      } catch {
        setError("Serveur injoignable.");
      } finally {
        busyRef.current = false;
        setBusy(false);
        setNow(Date.now());
      }
    },
    [configured, router],
  );

  // Synchro de fond : montage, intervalle (onglet visible), retour sur l'onglet
  useEffect(() => {
    if (!configured) return;
    const visible = () => document.visibilityState === "visible";
    if (visible()) void sync(true);
    const id = window.setInterval(() => {
      if (visible()) void sync(true);
    }, AUTO_INTERVAL_MS);
    const onVisibility = () => {
      if (visible()) void sync(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [configured, sync]);

  // Libellé relatif recalculé toutes les 30 s
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const size = variant === "badge" ? "text-xs" : "text-[13px]";

  if (!configured) {
    return <p className={`${size} text-admin-muted`}>Synchro auto inactive (eBay non connecté)</p>;
  }

  const label = busy
    ? "Synchronisation…"
    : error
      ? `Échec de la synchro : ${error}`
      : `Synchro auto · ${ago(lastSync, now)}`;

  return (
    <button
      type="button"
      onClick={() => void sync(false)}
      disabled={busy}
      title={error ? "Réessayer la synchronisation" : "Synchroniser maintenant"}
      aria-live="polite"
      className={`admin-focus inline-flex max-w-full items-center gap-2 rounded-full ${size} ${
        variant === "badge" ? "border border-admin-line bg-admin-card px-2.5 py-1" : "py-1"
      } text-left transition-colors hover:text-admin-ink disabled:cursor-progress ${
        error ? "text-admin-danger" : "text-admin-muted"
      }`}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        {!error && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-admin-green opacity-40 motion-reduce:animate-none" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${error ? "bg-admin-danger" : "bg-admin-green"}`} />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
