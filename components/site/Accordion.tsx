"use client";

import { useId, useState, type ReactNode } from "react";

export type AccordionItem = {
  q: string;
  a: ReactNode;
};

type AccordionProps = {
  items: AccordionItem[];
  className?: string;
  /** Index ouvert au départ (0 par défaut, null = tout fermé) */
  defaultOpen?: number | null;
};

/**
 * Accordéon FAQ : bandes à pas de ton (bg-surface, bg-surface-2 ouverte ou
 * survolée), sans filets ; question en Chakra Petch ; icône plus → moins
 * animée ; hauteur animée en CSS (grid-template-rows, app/site.css).
 * Une seule réponse ouverte à la fois. Les réponses restent dans le DOM
 * (référencement) mais sont masquées (visibility) quand elles sont fermées.
 */
export function Accordion({ items, className, defaultOpen = 0 }: AccordionProps) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const baseId = useId();

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const buttonId = `${baseId}-btn-${i}`;
        const panelId = `${baseId}-panel-${i}`;
        return (
          <div
            key={i}
            data-open={isOpen ? "true" : "false"}
            className={`tl-acc-item rounded-2xl transition-colors duration-300 ${
              isOpen ? "bg-surface-2" : "bg-surface hover:bg-surface-2"
            }`}
          >
            <h3 className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="tl-acc-trigger flex w-full items-center justify-between gap-5 rounded-2xl px-5 py-5 text-left sm:px-7 sm:py-6"
              >
                <span className="font-display text-[17px] font-semibold leading-snug text-mist sm:text-xl">{item.q}</span>
                <span className="tl-acc-icon" aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen ? "true" : "false"} className="tl-acc-panel">
              <div>
                <div className="max-w-3xl px-5 pb-6 text-[15px] leading-relaxed text-moss sm:px-7 sm:pb-7 sm:text-[17px]">
                  {item.a}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
