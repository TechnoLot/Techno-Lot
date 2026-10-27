import { Check } from "lucide-react";

type Props = {
  steps: string[];
  current: number;
  label: string;
  stepOf: (n: number, total: number) => string;
};

/** Indicateur d'étapes : trois segments qui se remplissent, étape courante annoncée. */
export function Progression({ steps, current, label, stepOf }: Props) {
  return (
    <div>
      <ol className="tlf-steps" aria-label={label}>
        {steps.map((name, i) => {
          const state =
            i < current ? "done" : i === current ? "current" : "upcoming";
          return (
            <li
              key={name}
              className="tlf-step"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="tlf-step-bar" aria-hidden="true">
                <span />
              </span>
              <span className="tlf-step-label">
                <span className="tlf-step-num" aria-hidden="true">
                  {state === "done" ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="tlf-step-text">
                  <span className="sr-only">
                    {stepOf(i + 1, steps.length)},{" "}
                  </span>
                  {name}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {/* Mobile : une seule ligne lisible sous les barres (la liste reste lue par les lecteurs d'écran). */}
      <p className="tlf-steps-mobile" aria-hidden="true">
        {stepOf(current + 1, steps.length)} ·{" "}
        <span className="font-semibold text-mist">{steps[current]}</span>
      </p>
    </div>
  );
}
