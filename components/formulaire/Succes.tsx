"use client";

import { useEffect, useRef } from "react";
import { Check, Phone, RotateCcw } from "lucide-react";
import { site } from "@/lib/site";
import type { TextesFormulaire } from "./textes";

type Props = {
  t: TextesFormulaire;
  title: string;
  text: string;
  againLabel: string;
  onAgain: () => void;
};

/** Écran de confirmation : message, prochaines étapes, rappel téléphone. */
export function Succes({ t, title, text, againLabel, onAgain }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="tlf-panel">
      <div className="tlf-success-badge" aria-hidden="true">
        <Check className="h-8 w-8" strokeWidth={3} />
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="tlf-stage-title mt-6">
        {title}
      </h2>
      <p className="tlf-stage-hint max-w-xl">{text}</p>

      <h3 className="tlf-subtitle mt-8">{t.successNextTitle}</h3>
      <ol className="tlf-next mt-3">
        {t.successNext.map((step, i) => (
          <li key={step.title}>
            <span className="tlf-next-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="font-display font-bold">{step.title}</span>
            <span className="text-sm leading-relaxed text-moss">{step.text}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-moss">
          {t.successCall}{" "}
          <a href={site.phoneHref} className="tlf-link !text-sm">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {site.phone}
          </a>
        </p>
        <button type="button" onClick={onAgain} className="tl-btn tl-btn-md tl-btn-ghost tlf-btn">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {againLabel}
        </button>
      </div>
    </div>
  );
}
