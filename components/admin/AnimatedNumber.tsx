"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Compteur animé qui monte en douceur jusqu'à `value`, avec un formateur
 * personnalisable (montant, entier…). Au montage il part de 0 ; lors d'un
 * changement de valeur (ex. nouvelle période) il part de la valeur
 * affichée, pour une transition continue.
 */
export default function AnimatedNumber({
  value,
  format,
  duration = 1.1,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const current = useRef(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration,
      ease: [0.21, 0.47, 0.32, 0.98],
      onUpdate: (v) => {
        current.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return <span className={className}>{format(display)}</span>;
}
