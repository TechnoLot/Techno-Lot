"use client";

import { m, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Dérive lente au défilement (parallaxe) : le contenu glisse de `distance` px
 * vers le haut pendant que la section traverse l'écran, avec une rotation à
 * peine perceptible. transform seulement ; immobile en mouvement réduit.
 */
export function Parallaxe({
  children,
  className,
  distance = 56,
  tilt = 1.2,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  /** Rotation maximale en degrés. */
  tilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [distance, -distance]);
  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-tilt, tilt]);

  return (
    <div ref={ref} className={className}>
      <m.div style={{ y, rotate }} className="will-change-transform">
        {children}
      </m.div>
    </div>
  );
}
