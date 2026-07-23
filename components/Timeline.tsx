"use client";

import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export type TimelineStep = {
  title: string;
  text: ReactNode;
  /** Élément JSX déjà rendu (ex. <Truck className="…" />) pour rester sérialisable. */
  icon?: ReactNode;
};

/** Timeline verticale animée (reveal séquentiel au scroll). */
export default function Timeline({
  steps,
  stepLabel = "Étape",
}: {
  steps: TimelineStep[];
  stepLabel?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <ol className="relative ml-4 border-l border-white/10 sm:ml-6">
      {steps.map((step, i) => {
        return (
          <m.li
            key={i}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.6,
              delay: i * 0.12,
              ease: [0.21, 0.47, 0.32, 0.98],
            }}
            className="relative pb-10 pl-8 last:pb-0 sm:pl-12"
          >
            <span className="absolute -left-[21px] flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-night-900 shadow-glow sm:-left-[23px] sm:h-11 sm:w-11">
              {step.icon ? (
                step.icon
              ) : (
                <span className="font-display text-sm font-bold text-accent">
                  {i + 1}
                </span>
              )}
            </span>
            <div className="glass glass-hover p-6">
              <p className="mb-1 font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {stepLabel} {i + 1}
              </p>
              <h3 className="font-display text-lg font-semibold text-white">
                {step.title}
              </h3>
              <div className="mt-2 text-sm leading-relaxed text-slate-300">
                {step.text}
              </div>
            </div>
          </m.li>
        );
      })}
    </ol>
  );
}
