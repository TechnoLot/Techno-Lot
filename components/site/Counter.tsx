"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";

type CounterProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  /** true = pas de séparateur de milliers */
  plain?: boolean;
  locale: Locale;
  className?: string;
  /** Durée en secondes */
  duration?: number;
};

/** Compteur animé au défilement (chiffres tabulaires). Valeur finale rendue côté serveur ; directe en mouvement réduit. */
export function Counter({ value, prefix, suffix, plain = false, locale, className, duration = 1.6 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();

  const format = (v: number) =>
    plain ? String(Math.round(v)) : Math.round(v).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA");

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = format(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce]);

  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {prefix ? <span>{prefix} </span> : null}
      <span ref={ref}>{format(value)}</span>
      {suffix ? <span>{suffix}</span> : null}
    </span>
  );
}
