"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Megaphone, Target } from "lucide-react";
import type { ConfigStatus } from "@/lib/ads/types";
import ConnectGuide from "./ConnectGuide";
import { FUNNEL_STEPS } from "./AdsFunnel";

/** État « Pas encore de données » : aperçu fantôme du funnel + guide de connexion. */
export default function AdsEmptyState({ config }: { config: ConfigStatus }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="glass relative overflow-hidden"
      aria-labelledby="ads-empty-title"
    >
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-cyan-400/5 blur-3xl" />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-center">
        <div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent shadow-glow">
            <Megaphone className="h-6 w-6" aria-hidden />
          </span>
          <h2 id="ads-empty-title" className="mt-5 font-display text-2xl font-bold text-white sm:text-3xl">
            Pas encore de données publicitaires
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Dès que tes pubs Meta ou Google enverront des visiteurs sur technolot.ca, tu verras ici les dépenses,
            le funnel complet de chaque pub — de l&apos;impression jusqu&apos;au client converti — et qui a rempli le
            formulaire.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
            {[
              { icon: BarChart3, t: "Coût par lead par pub" },
              { icon: Target, t: "Funnel visite → client" },
              { icon: Megaphone, t: "Meilleure pub repérée" },
            ].map(({ icon: I, t }) => (
              <li key={t} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                <I className="h-3.5 w-3.5 text-accent" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Funnel fantôme, purement décoratif */}
        <div aria-hidden className="space-y-1.5">
          {FUNNEL_STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right text-[10px] text-slate-600">{s.short}</span>
              <div className="relative h-5 flex-1">
                <motion.div
                  className="absolute inset-y-0 left-1/2 rounded-md border border-dashed border-accent/25 bg-accent/[0.04]"
                  style={{ x: "-50%" }}
                  initial={reduce ? false : { width: "0%" }}
                  animate={{ width: `${100 - i * 12}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.07 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative border-t border-white/5 bg-night-950/30 p-6 sm:p-8">
        <h3 className="mb-5 font-display text-sm font-semibold text-white">Comment connecter</h3>
        <ConnectGuide config={config} />
      </div>
    </motion.section>
  );
}
