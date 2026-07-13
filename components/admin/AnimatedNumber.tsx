"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Compteur animé qui monte en douceur de 0 à `value` au montage, avec un
 * formateur personnalisable (montant, entier…). Se déclenche à l'entrée
 * dans le DOM, pas au scroll — c'est un dashboard qui affiche des données
 * fraîches à chaque chargement.
 */
export default function AnimatedNumber({
  value,
  format,
  duration = 1.2,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.21, 0.47, 0.32, 0.98],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return <span className={className}>{format(display)}</span>;
}
