"use client";

import { m } from "framer-motion";
import { Check, Clock } from "lucide-react";
import type { AccueilContenu } from "./contenu";
import { EtapesCamion } from "./etapes-camion";

type StepsMock = AccueilContenu["steps"]["mock"];

/** Fiche blanche posée dans le panneau ouvert (elle flotte : seule ombre de la section). */
const CARTE =
  "etapes-mock w-[min(100%,320px)] rounded-2xl bg-white p-4 text-ink shadow-[0_30px_60px_-32px_rgba(4,14,8,0.6)] sm:p-5";
const PASTILLE =
  "inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-deep sm:text-sm";
const COCHE = "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-vivid text-ink";

/**
 * Maquette de l'étape ouverte. `play` (panneau ouvert, mouvement permis) lance l'animation
 * propre à l'étape ; sinon la maquette est montrée dans son état final, immobile.
 */
export function MaquetteEtape({ index, mock, play }: { index: number; mock: StepsMock; play: boolean }) {
  if (index === 0) return <Inventaire mock={mock} />;
  if (index === 1) return <Calendrier mock={mock} />;
  if (index === 2) return <EtapesCamion reduce={!play} />;
  return <Paiement key={play ? "joue" : "fixe"} mock={mock} play={play} />;
}

function Pastille({ children }: { children: string }) {
  return (
    <p className={PASTILLE}>
      <span className={COCHE}>
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
      </span>
      {children}
    </p>
  );
}

/** Étape 1 : l'inventaire décrit en ligne, avec son total. */
function Inventaire({ mock }: { mock: StepsMock }) {
  const total = mock.rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <div className={CARTE}>
      <ul className="divide-y divide-ink/[0.08]">
        {mock.rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 py-2.5 text-sm font-medium first:pt-0 sm:text-base">
            {row.label}
            <span className="min-w-[3.25rem] rounded-full bg-mint px-3 py-0.5 text-center font-display text-base font-bold tabular-nums text-deep">
              {row.count}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 flex items-baseline gap-2 border-t-2 border-ink pt-3">
        <span className="font-display text-3xl font-bold leading-none tabular-nums">{total}</span>
        <span className="text-sm text-ink/65">{mock.totalLabel}</span>
      </p>
      <div className="mt-4">
        <Pastille>{mock.photosChip}</Pastille>
      </div>
    </div>
  );
}

/** Étape 2 : la date du ramassage fixée ensemble, réponse en 24 h. */
function Calendrier({ mock }: { mock: StepsMock }) {
  return (
    <div className={CARTE}>
      <p className="text-sm font-semibold text-ink/65">{mock.calendarTitle}</p>
      <div className="mt-3 grid grid-cols-7 gap-1.5" aria-hidden="true">
        {Array.from({ length: 21 }, (_, d) => (
          <span
            key={d}
            className={`flex aspect-square items-center justify-center rounded-lg font-display text-xs font-semibold tabular-nums sm:text-sm ${
              d === 10
                ? "bg-deep text-white ring-2 ring-vivid ring-offset-2 ring-offset-white"
                : d % 7 > 4
                  ? "text-ink/25"
                  : "bg-ink/[0.045] text-ink/70"
            }`}
          >
            {d + 1}
          </span>
        ))}
      </div>
      <p className={`mt-4 ${PASTILLE}`}>
        <Clock className="h-4 w-4" aria-hidden="true" />
        {mock.replyChip}
      </p>
    </div>
  );
}

/** Durées de la maquette 4 : la seconde moitié se remplit, puis se coche. */
const FILL_DELAY = 0.55;
const FILL_DUR = 1.3;

/** Étape 4 : la moitié au ramassage, le solde après l'inspection. */
function Paiement({ mock, play }: { mock: StepsMock; play: boolean }) {
  return (
    <div className={`${CARTE} ring-1 ring-ink/[0.06]`}>
      <p className="text-sm font-semibold text-ink/65">{mock.payTitle}</p>
      <ul className="mt-3 space-y-3">
        {mock.payRows.map((row, i) => {
          const later = i > 0 && play;
          return (
            <li key={row.label} className="border-b border-ink/[0.08] pb-3">
              <div className="flex items-center gap-3 text-sm font-medium sm:text-base">
                <span className="shrink-0 rounded-full bg-mint px-2.5 py-0.5 font-display font-bold tabular-nums text-deep">
                  {row.share}
                </span>
                {row.label}
              </div>
              {/* La barre se remplit, puis la ligne se coche */}
              <div className="mt-2.5 flex items-center gap-3">
                <span aria-hidden="true" className="block h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
                  <m.span
                    className="block h-full w-full origin-left rounded-full bg-leaf"
                    initial={later ? { scaleX: 0 } : false}
                    animate={{ scaleX: 1 }}
                    transition={later ? { delay: FILL_DELAY, duration: FILL_DUR, ease: [0.65, 0, 0.35, 1] } : { duration: 0 }}
                  />
                </span>
                <m.span
                  initial={later ? { opacity: 0, scale: 0.6 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={
                    later ? { delay: FILL_DELAY + FILL_DUR, type: "spring", stiffness: 420, damping: 18 } : { duration: 0 }
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-vivid px-2.5 py-1 text-xs font-bold text-ink"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                  {mock.paidLabel}
                </m.span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <Pastille>{mock.payNote}</Pastille>
      </div>
    </div>
  );
}
