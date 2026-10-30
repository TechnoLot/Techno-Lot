"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdPlatform, AdsSyncState } from "@/lib/ads/types";
import { messageErreurApi } from "@/lib/admin/message-erreur";

type SyncResponse = {
  skipped?: boolean;
  error?: string;
  ref?: string;
  results?: { platform: AdPlatform; ok: boolean; message: string }[];
  lastSync?: Partial<Record<AdPlatform, string | null>>;
};

/** Intervalle de la synchro de fond quand l'onglet est visible. */
const AUTO_INTERVAL_MS = 60_000;
/** Attente minimale entre deux essais (si la dernière synchro est déjà ancienne). */
const MIN_WAIT_MS = 10_000;
/** Recalcul du libellé « il y a X min ». */
const TICK_MS = 30_000;
/** Jours resynchronisés par un clic sur la pastille (aujourd'hui et hier). */
const CLICK_DAYS = 2;

const NAMES: Record<AdPlatform, string> = { meta: "Meta", google: "Google" };

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
 * Synchro automatique des pubs (même principe que EbayAutoSync) : au montage,
 * chaque minute (onglet visible) et au retour sur l'onglet, POST
 * /api/admin/ads-sync `{ auto: true }` (aujourd'hui et hier, ou les jours manqués
 * depuis la dernière synchro réussie à la première du jour ; le serveur saute
 * si la dernière synchro a moins de 50 s). Une pastille par plateforme ; un clic
 * force la synchro. Rafraîchit la page quand une plateforme a été resynchronisée.
 */
export default function AdsAutoSync({
  platforms,
  state,
  variant = "inline",
}: {
  /** Pastilles à afficher, dans l'ordre */
  platforms: AdPlatform[];
  /** État rendu par le serveur (dernière tentative par plateforme) */
  state: Record<AdPlatform, AdsSyncState>;
  variant?: "inline" | "badge";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<AdPlatform, string>>>({});
  const [now, setNow] = useState(() => Date.now());
  const busyRef = useRef(false);
  const lastRef = useRef<Record<AdPlatform, string | null>>({ meta: state.meta.at, google: state.google.at });
  /** Dernière synchro connue, toutes plateformes (ms), pour caler le prochain essai */
  const latestRef = useRef<number | null>(
    Math.max(Date.parse(state.meta.at ?? "") || 0, Date.parse(state.google.at ?? "") || 0) || null,
  );
  const timerRef = useRef<number | undefined>(undefined);
  const configured = state.meta.configured || state.google.configured;

  useEffect(() => {
    lastRef.current = { meta: state.meta.at, google: state.google.at };
  }, [state.meta.at, state.google.at]);

  const sync = useCallback(
    async (auto: boolean) => {
      if (!configured || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const r = await fetch("/api/admin/ads-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(auto ? { auto: true } : { days: CLICK_DAYS }),
        });
        const data = (await r.json().catch(() => ({}))) as SyncResponse;
        if (r.status === 401) {
          setErrors({ meta: "session expirée", google: "session expirée" });
        } else if (!r.ok && !data.results?.length) {
          const msg = messageErreurApi(data, r.status);
          setErrors({ meta: msg, google: msg });
        } else if (!data.skipped) {
          const next: Partial<Record<AdPlatform, string>> = {};
          for (const res of data.results ?? []) if (!res.ok) next[res.platform] = res.message;
          setErrors(next);
        }
        const fresh = data.lastSync ?? {};
        const times = [fresh.meta, fresh.google].filter((t): t is string => !!t).map((t) => Date.parse(t));
        if (times.length) latestRef.current = Math.max(latestRef.current ?? 0, ...times);
        const changed = (["meta", "google"] as const).some(
          (p) => fresh[p] !== undefined && fresh[p] !== lastRef.current[p],
        );
        if (changed || !auto) startTransition(() => router.refresh());
      } catch {
        setErrors({ meta: "serveur injoignable", google: "serveur injoignable" });
      } finally {
        busyRef.current = false;
        setBusy(false);
        setNow(Date.now());
      }
    },
    [configured, router],
  );

  // Synchro de fond : montage, puis 1 min après la dernière synchro connue
  // (d'où qu'elle vienne : cette page, un autre onglet ou la tâche planifiée),
  // et au retour sur l'onglet. Une seule minuterie en attente à la fois.
  useEffect(() => {
    if (!configured) return;
    let stopped = false;
    const visible = () => document.visibilityState === "visible";
    const loop = async () => {
      if (stopped) return;
      if (visible()) await sync(true);
      if (stopped) return;
      const latest = latestRef.current;
      const wait = latest
        ? Math.min(Math.max(latest + AUTO_INTERVAL_MS + 1_000 - Date.now(), MIN_WAIT_MS), AUTO_INTERVAL_MS)
        : AUTO_INTERVAL_MS;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void loop(), wait);
    };
    void loop();
    const onVisibility = () => {
      if (visible()) void loop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [configured, sync]);

  // Libellé relatif recalculé toutes les 30 s
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const size = variant === "badge" ? "text-xs" : "text-[13px]";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {platforms.map((p) => {
        const s = state[p];
        const name = NAMES[p];
        if (!s.configured) {
          return (
            <p key={p} className={`${size} text-admin-muted`}>
              {name} · synchro auto inactive
            </p>
          );
        }
        const error = errors[p] ?? (s.ok ? null : s.message ?? "échec de la dernière synchro");
        const label = busy
          ? `${name} · synchronisation…`
          : error
            ? `${name} · échec : ${error}`
            : `${name} · synchro auto · ${ago(s.at, now)}`;
        return (
          <button
            key={p}
            type="button"
            onClick={() => void sync(false)}
            disabled={busy}
            title={error ? `Réessayer la synchronisation ${name}` : `Synchroniser ${name} maintenant`}
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
      })}
    </div>
  );
}
