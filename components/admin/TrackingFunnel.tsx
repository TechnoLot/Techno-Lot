"use client";

import { motion } from "framer-motion";
import { TrackingEmpty } from "@/components/admin/TrackingSources";

/**
 * Mini-entonnoir du site (table ad_events) sur la période :
 * visites → formulaire ouvert/commencé → formulaire envoyé.
 * Les valeurs sont des nombres de sessions distinctes.
 */
export default function TrackingFunnel({
  visits,
  formViews,
  submits,
}: {
  visits: number;
  formViews: number;
  submits: number;
}) {
  const steps = [
    { label: "Visites", value: visits, color: "rgba(148,163,184,0.55)" },
    { label: "Formulaire consulté", value: formViews, color: "rgba(94,203,51,0.55)" },
    { label: "Formulaire envoyé", value: submits, color: "#5ECB33" },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);
  const empty = steps.every((s) => s.value === 0);
  const global = visits > 0 ? (submits / visits) * 100 : null;

  return (
    <section className="admin-card flex flex-col p-5 sm:p-6" aria-labelledby="funnel-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="funnel-title" className="admin-card-title">
          Entonnoir du site
        </h2>
        <span className="text-xs text-slate-500">sessions</span>
      </div>

      {empty ? (
        <TrackingEmpty
          title="Aucune visite mesurée"
          text="Les visites et les envois du formulaire de soumission apparaîtront ici dès que le suivi aura enregistré des sessions."
        />
      ) : (
        <>
          <ol className="mt-5 space-y-4">
            {steps.map((step, i) => {
              const pct = (step.value / max) * 100;
              const prev = i > 0 ? steps[i - 1].value : null;
              const rate = prev ? (step.value / prev) * 100 : null;
              return (
                <li key={step.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-slate-300">{step.label}</span>
                    <span className="flex items-baseline gap-2">
                      {rate !== null && (
                        <span className="text-[11px] font-medium tabular-nums text-slate-500">
                          {rate.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} %
                        </span>
                      )}
                      <span className="font-display text-base font-semibold tabular-nums text-white">
                        {step.value.toLocaleString("fr-CA")}
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: step.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, step.value > 0 ? 2 : 0)}%` }}
                      transition={{ duration: 0.7, delay: i * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>

          {global !== null && (
            <div className="mt-5 flex items-baseline justify-between rounded-xl bg-accent/[0.06] px-4 py-3 ring-1 ring-inset ring-accent/15">
              <span className="text-xs text-slate-400">Taux visite → envoi</span>
              <span className="font-display text-lg font-semibold tabular-nums text-accent-bright">
                {global.toLocaleString("fr-CA", { maximumFractionDigits: 2 })} %
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
