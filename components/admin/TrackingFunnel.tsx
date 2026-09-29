"use client";

const STEPS = [
  { label: "Visiteurs", value: 2_840, color: "rgba(148,163,184,0.6)" },
  { label: "Soumissions", value: 96, color: "rgba(94,203,51,0.5)" },
  { label: "Lots achetés", value: 34, color: "rgba(94,203,51,0.7)" },
  { label: "Lots vendus", value: 21, color: "#5ECB33" },
];

export default function TrackingFunnel() {
  const max = STEPS[0].value;

  return (
    <div className="glass p-6">
      <h2 className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
        Funnel de conversion
      </h2>

      <div className="mt-5 space-y-3">
        {STEPS.map((step, i) => {
          const pct = (step.value / max) * 100;
          const convRate =
            i > 0
              ? ((step.value / STEPS[i - 1].value) * 100).toFixed(1)
              : null;

          return (
            <div key={step.label}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-300">
                  {step.label}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-bold tabular-nums text-white">
                    {step.value.toLocaleString("fr-CA")}
                  </span>
                  {convRate && (
                    <span className="text-[11px] font-semibold tabular-nums text-accent-bright">
                      {convRate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: step.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-slate-400">
            Taux global visiteur → vente
          </span>
          <span className="font-display text-lg font-bold text-accent-bright">
            {((STEPS[3].value / STEPS[0].value) * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-slate-600">
        Données démo
      </p>
    </div>
  );
}
