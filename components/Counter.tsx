"use client";

import { useEffect, useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";

type CounterProps = {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
};

/** Compteur animé qui se déclenche à l'entrée dans le viewport. */
export default function Counter({
  to,
  suffix = "",
  prefix = "",
  duration = 1.8,
  className,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    if (reduceMotion) {
      el.textContent = `${prefix}${to}${suffix}`;
      return;
    }
    // Animation en requestAnimationFrame pur (même courbe easeOut
    // cubique) : évite d'embarquer le moteur d'animation complet de
    // framer-motion dans le bundle initial.
    let raf = 0;
    const start = performance.now();
    const durationMs = duration * 1000;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${prefix}${Math.round(eased * to)}${suffix}`;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, suffix, prefix, duration, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
