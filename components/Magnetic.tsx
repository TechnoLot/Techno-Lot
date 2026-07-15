"use client";

import { useRef, type ReactNode } from "react";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

/**
 * Effet « magnétique » : l'élément est doucement attiré vers le curseur
 * lorsqu'on le survole. Désactivé si prefers-reduced-motion.
 */
export default function Magnetic({
  children,
  strength = 0.3,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 180, damping: 16, mass: 0.4 });

  function onMouseMove(e: React.MouseEvent) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <m.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={reduceMotion ? undefined : { x: sx, y: sy }}
      className={`inline-block ${className}`}
    >
      {children}
    </m.div>
  );
}
