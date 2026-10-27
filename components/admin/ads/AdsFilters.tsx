"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Loader2 } from "lucide-react";
import { ADS_PERIODS, type PlatformFilter } from "@/lib/ads/types";

const PLATFORMS: { key: PlatformFilter; label: string }[] = [
  { key: "meta", label: "Meta" },
  { key: "google", label: "Google" },
  { key: "all", label: "Toutes" },
];

const group = "inline-flex max-w-full gap-1 rounded-full border border-[#e3eadf] bg-white p-1";

const pill = (active: boolean) =>
  `shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 ${
    active ? "bg-[#6bd63b] text-[#0a0a0a]" : "text-[#4f5a52] hover:text-[#0a0a0a]"
  }`;

const dateField =
  "mt-1 block w-full rounded-xl border border-[#c9d6c3] bg-white px-2.5 py-2 text-sm text-[#0a0a0a] [color-scheme:light] focus:border-[#257a10] focus:outline-none focus:ring-2 focus:ring-[#6bd63b]/40";

/**
 * Sélecteurs de période (7/30/90 j ou plage perso) et de plateforme
 * (Meta par défaut), synchronisés avec les searchParams.
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
        className={`relative ${group}`}
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
          <span className="hidden sm:inline">Personnalisé</span>
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
            className="absolute right-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[#e3eadf] bg-white p-4 shadow-[0_12px_32px_-12px_rgba(10,10,10,0.18)] sm:left-0 sm:right-auto"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[13px] font-medium text-[#4f5a52]">
                Du
                <input type="date" value={f} max={t || undefined} onChange={(e) => setF(e.target.value)} className={dateField} required />
              </label>
              <label className="text-[13px] font-medium text-[#4f5a52]">
                Au
                <input type="date" value={t} min={f || undefined} onChange={(e) => setT(e.target.value)} className={dateField} required />
              </label>
            </div>
            <button
              type="submit"
              className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#257a10] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e6a0b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#257a10]"
            >
              Appliquer
            </button>
          </form>
        )}
      </div>

      {showPlatform && (
        <div
          role="group"
          aria-label="Plateforme"
          className={group}
        >
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={platform === p.key}
              onClick={() => push({ platform: p.key === "meta" ? null : p.key })}
              className={pill(platform === p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {pending && <Loader2 className="h-4 w-4 animate-spin text-[#257a10]" aria-label="Chargement" />}
    </div>
  );
}
