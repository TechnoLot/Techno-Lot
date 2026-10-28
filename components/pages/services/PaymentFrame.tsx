"use client";

import { animate, m, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useContext, useEffect } from "react";
import { EtapeSceneContext } from "./PinnedSteps";

type PaymentFrameProps = {
  /** Suffixe du pourcentage (espace insécable avant « % » en français) */
  suffix: string;
  /** Légende sous le chiffre : à 50 % (ramassage), puis à 100 % (après l'inspection) */
  captionStart: string;
  captionEnd: string;
  note: string;
};

/**
 * Anneau de paiement de l'estimation : 50 % au ramassage, puis il se remplit jusqu'à 100 %
 * pendant qu'on fait défiler la dernière étape (séquence épinglée). Hors épinglage (mobile),
 * il se remplit tout seul quand l'étape s'affiche. Mouvement réduit : 100 % directement.
 * Rendu serveur : 50 %.
 */
export function PaymentFrame({ suffix, captionStart, captionEnd, note }: PaymentFrameProps) {
  const scene = useContext(EtapeSceneContext);
  const reduce = useReducedMotion();
  /** 0 = moitié payée, 1 = paiement complet */
  const k = useMotionValue(0);

  const progress = scene?.progress;
  const pinned = scene?.pinned ?? false;
  const active = scene?.active ?? true;
  const start = scene?.start ?? 0;
  const end = scene?.end ?? 1;

  useEffect(() => {
    if (progress && pinned && !reduce) {
      // Fenêtre de remplissage : du premier sixième aux quatre cinquièmes de l'étape
      const span = end - start;
      const a = start + span * 0.15;
      const b = start + span * 0.8;
      const apply = (v: number) => k.set(Math.min(1, Math.max(0, (v - a) / (b - a))));
      apply(progress.get());
      return progress.on("change", apply);
    }
    if (!active) {
      k.set(0);
      return;
    }
    if (reduce) {
      k.set(1);
      return;
    }
    k.set(0);
    const controls = animate(k, 1, { delay: 0.7, duration: 1.6, ease: [0.65, 0, 0.35, 1] });
    return () => controls.stop();
  }, [progress, pinned, active, start, end, reduce, k]);

  const offset = useTransform(k, (v) => 50 - 50 * v);
  const pct = useTransform(k, (v) => `${Math.round(50 + 50 * v)}${suffix}`);
  // Légendes exactes seulement : « au ramassage » à 50 %, « après l'inspection » à 100 %
  const startOpacity = useTransform(k, [0, 0.12], [1, 0]);
  const endOpacity = useTransform(k, [0.88, 1], [0, 1]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6">
      <div className="relative aspect-square w-[52%] max-w-[260px]">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
          <m.circle
            className="svc-donut-arc"
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            stroke="#6bd63b"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={100}
            style={{ strokeDashoffset: offset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <m.span className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">{pct}</m.span>
          <span className="mt-1 grid max-w-[9rem] text-xs leading-snug text-slate-300 sm:text-sm">
            <m.span className="col-start-1 row-start-1" style={{ opacity: startOpacity }}>
              {captionStart}
            </m.span>
            <m.span className="col-start-1 row-start-1" style={{ opacity: endOpacity }}>
              {captionEnd}
            </m.span>
          </span>
        </div>
      </div>
      <span className="rounded-full border border-[#6bd63b]/40 px-4 py-1.5 text-center font-display text-xs font-semibold uppercase tracking-[0.12em] text-[#8BE95F]">
        {note}
      </span>
    </div>
  );
}
