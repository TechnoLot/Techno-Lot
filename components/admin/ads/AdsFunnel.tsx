"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import AnimatedNumber from "@/components/admin/AnimatedNumber";
import type { Funnel } from "@/lib/ads/types";
import { formatCount, formatPct } from "./format";

export const FUNNEL_STEPS: { key: keyof Funnel; label: string; short: string }[] = [
  { key: "impressions", label: "Impressions", short: "Impr." },
  { key: "clicks", label: "Clics", short: "Clics" },
  { key: "visits", label: "Visites du site", short: "Visites" },
  { key: "formViews", label: "Formulaire vu", short: "Form. vu" },
  { key: "formStarts", label: "Formulaire commencé", short: "Commencé" },
  { key: "leads", label: "Formulaire envoyé", short: "Envoyé" },
  { key: "clients", label: "Client converti", short: "Client" },
];

/** Largeur visuelle : échelle log pour que les petites étapes restent visibles. */
function widthPct(v: number, max: number): number {
  if (max <= 0 || v <= 0) return 0;
  return Math.max(4, (Math.log10(v + 1) / Math.log10(max + 1)) * 100);
}

/**
 * Funnel animé : barres centrées dont la largeur décroît, avec le taux de
 * passage entre chaque étape (le maillon le plus faible est signalé).
 */
export default function AdsFunnel({ funnel, title = "Funnel de conversion" }: { funnel: Funnel; title?: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(...FUNNEL_STEPS.map((s) => funnel[s.key]));
  const rates = FUNNEL_STEPS.map((s, i) => {
    if (i === 0) return null;
    const prev = funnel[FUNNEL_STEPS[i - 1].key];
    return prev > 0 ? funnel[s.key] / prev : null;
  });
  // Maillon faible : plus petit taux de passage (hors impressions → clics, naturellement bas)
  let weakest = -1;
  let weakestRate = Infinity;
  rates.forEach((r, i) => {
    if (i >= 2 && r != null && r < weakestRate) {
      weakestRate = r;
      weakest = i;
    }
  });
  const overall = funnel.visits > 0 ? funnel.leads / funnel.visits : null;
  const closeRate = funnel.leads > 0 ? funnel.clients / funnel.leads : null;

  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="ads-funnel-title">
      <h2 id="ads-funnel-title" className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
        {title}
      </h2>

      <ol className="mt-5 space-y-1">
        {FUNNEL_STEPS.map((s, i) => {
          const v = funnel[s.key];
          const w = widthPct(v, max);
          const rate = rates[i];
          const strength = 0.25 + (i / (FUNNEL_STEPS.length - 1)) * 0.75;
          return (
            <li key={s.key}>
              {i > 0 && (
                <div className="flex items-center justify-center gap-1.5 py-0.5 text-[10px]" aria-hidden={rate == null}>
                  <ChevronDown className="h-3 w-3 text-slate-600" aria-hidden />
                  <span
                    className={`rounded-full px-1.5 py-px font-semibold tabular-nums ${
                      i === weakest
                        ? "bg-amber-400/10 text-amber-300"
                        : "text-slate-400"
                    }`}
                    title={i === weakest ? "Plus grosse perte du funnel" : undefined}
                  >
                    {rate == null ? "—" : formatPct(rate)}
                    <span className="sr-only"> de passage depuis l&apos;étape précédente</span>
                  </span>
                  {i === weakest && <span className="text-amber-300/80">maillon faible</span>}
                </div>
              )}
              <div className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 sm:grid-cols-[9.5rem_1fr_auto]">
                <span className="truncate text-xs font-medium text-slate-300 sm:text-sm">{s.label}</span>
                <div className="relative h-7 overflow-hidden rounded-lg bg-white/[0.03]">
                  <motion.div
                    className="absolute inset-y-0 left-1/2 rounded-lg"
                    style={{
                      x: "-50%",
                      background: `linear-gradient(90deg, rgba(94,203,51,${strength * 0.55}), rgba(52,211,153,${strength}))`,
                      boxShadow: i === FUNNEL_STEPS.length - 1 && v > 0 ? "0 0 18px rgba(94,203,51,0.45)" : undefined,
                    }}
                    initial={reduce ? false : { width: "0%" }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.8, delay: 0.08 * i, ease: [0.21, 0.47, 0.32, 0.98] }}
                  />
                </div>
                <span className="min-w-[3.5rem] text-right font-display text-sm font-bold tabular-nums text-white sm:text-base">
                  <AnimatedNumber value={v} format={(n) => formatCount(Math.round(n))} />
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
          <p className="text-[11px] text-slate-400">Visite → lead</p>
          <p className="font-display text-lg font-bold text-accent-bright">{formatPct(overall)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[11px] text-slate-400">Lead → client</p>
          <p className="font-display text-lg font-bold text-white">{formatPct(closeRate)}</p>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-slate-500">Largeur des barres en échelle logarithmique.</p>
    </section>
  );
}

/** Mini-barre de funnel (tableau) : visites → leads → clients sous forme de segments. */
export function MiniFunnel({ funnel }: { funnel: Funnel }) {
  const steps = [funnel.clicks, funnel.visits, funnel.formStarts, funnel.leads, funnel.clients];
  const max = Math.max(...steps, 1);
  const labels = ["Clics", "Visites", "Commencés", "Leads", "Clients"];
  return (
    <div className="flex h-6 items-end gap-0.5" role="img" aria-label={steps.map((v, i) => `${labels[i]} ${v}`).join(", ")}>
      {steps.map((v, i) => (
        <span
          key={i}
          className="w-2 rounded-sm"
          style={{
            height: `${v > 0 ? Math.max(12, widthPct(v, max)) : 6}%`,
            background: v > 0 ? `rgba(94,203,51,${0.3 + i * 0.17})` : "rgba(255,255,255,0.08)",
          }}
          title={`${labels[i]} : ${formatCount(v)}`}
        />
      ))}
    </div>
  );
}
