"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Rafraîchissement en direct quand l'onglet est visible. */
const LIVE_INTERVAL_MS = 60_000;
/** Recalcul du libellé « il y a X min ». */
const TICK_MS = 15_000;

function ago(iso: string | null, now: number): string {
  if (!iso) return "jamais";
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l’instant";
  const min = Math.floor(s / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`;
}

/**
 * Pastille « En direct » de /admin/pubs : chaque minute (onglet visible) et au
 * retour sur l'onglet, demande une synchro rapide (aujourd'hui et hier, sautée
 * côté serveur si la dernière date de moins de 50 s), puis recharge les chiffres.
 * Hors de la page, la tâche planifiée /api/cron/sync prend le relais.
 */
export default function AdsLiveSync({ enabled, lastSync }: { enabled: boolean; lastSync: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const busyRef = useRef(false);

  const tick = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (enabled) {
        const r = await fetch("/api/admin/ads-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auto: true }),
        });
        setError(!r.ok);
      }
      startTransition(() => router.refresh());
    } catch {
      setError(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
      setNow(Date.now());
    }
  }, [enabled, router]);

  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const id = window.setInterval(() => {
      if (visible()) void tick();
    }, LIVE_INTERVAL_MS);
    const onVisibility = () => {
      if (visible()) void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tick]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const label = busy ? "Mise à jour…" : error ? "Direct interrompu, nouvel essai dans 1 min" : `En direct · ${ago(lastSync, now)}`;

  return (
    <p aria-live="polite" className={`inline-flex items-center gap-2 text-[12px] ${error ? "text-admin-danger" : "text-admin-muted"}`}>
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        {!error && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-admin-green opacity-40 motion-reduce:animate-none" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${error ? "bg-admin-danger" : "bg-admin-green"}`} />
      </span>
      {label}
    </p>
  );
}
