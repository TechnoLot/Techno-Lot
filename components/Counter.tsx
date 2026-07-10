"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  useInView,
  useReducedMotion,
} from "framer-motion";

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
    const controls = animate(0, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = `${prefix}${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, to, suffix, prefix, duration, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
