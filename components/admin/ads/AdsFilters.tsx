"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Loader2 } from "lucide-react";
import { ADS_PERIODS, type PlatformFilter } from "@/lib/ads/types";

const PLATFORMS: { key: PlatformFilter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "meta", label: "Meta" },
  { key: "google", label: "Google" },
];

const pill = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 font-display text-[11px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
    active ? "bg-accent text-night-950 shadow-glow" : "text-slate-400 hover:text-white"
  }`;

/**
 * Sélecteurs de période (7/30/90 j ou plage perso) et de plateforme,
 * synchronisés avec les searchParams.
 */
export default function AdsFilters({
  period,
  from,
  to,
  platform,
  showPlatform = true,
}: {
  period: string;
  from: string;
  to: string;
  platform?: PlatformFilter;
  showPlatform?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setF(from);
    setT(to);
  }, [from, to]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function push(update: Record<string, string | null>) {
    const p = new URLSearchParams(params?.toString() ?? "");
    for (const [k, v] of Object.entries(update)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Période"
        className="relative inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
        ref={boxRef}
      >
        {ADS_PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={period === p.key}
            onClick={() => push({ period: p.key, from: null, to: null })}
            className={pill(period === p.key)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={period === "custom"}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((o) => !o)}
          className={`${pill(period === "custom")} inline-flex items-center gap-1.5`}
        >
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Perso</span>
          <span className="sr-only sm:hidden">Période personnalisée</span>
        </button>

        {open && (
          <form
            role="dialog"
            aria-label="Période personnalisée"
            onSubmit={(e) => {
              e.preventDefault();
              if (!f || !t) return;
              const [a, b] = f <= t ? [f, t] : [t, f];
              setOpen(false);
              push({ period: "custom", from: a, to: b });
            }}
            className="absolute left-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-night-900/95 p-4 shadow-card backdrop-blur-md"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-medium text-slate-400">
                Du
                <input type="date" value={f} max={t || undefined} onChange={(e) => setF(e.target.value)} className="field mt-1 !px-2.5 !py-2 [color-scheme:dark]" required />
              </label>
              <label className="text-[11px] font-medium text-slate-400">
                Au
                <input type="date" value={t} min={f || undefined} onChange={(e) => setT(e.target.value)} className="field mt-1 !px-2.5 !py-2 [color-scheme:dark]" required />
              </label>
            </div>
            <button type="submit" className="btn-primary mt-3 w-full !py-2 !text-[11px]">
              Appliquer
            </button>
          </form>
        )}
      </div>

      {showPlatform && (
        <div
          role="group"
          aria-label="Plateforme"
          className="inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
        >
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={platform === p.key}
              onClick={() => push({ platform: p.key === "all" ? null : p.key })}
              className={pill(platform === p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {pending && <Loader2 className="h-4 w-4 animate-spin text-accent" aria-label="Chargement" />}
    </div>
  );
}
