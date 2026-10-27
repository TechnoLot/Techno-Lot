"use client";

import { m, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Parallaxe douce : le contenu glisse de +amount à -amount px pendant que le bloc traverse l'écran.
 * Transform seulement ; immobile en mouvement réduit. Rien n'est masqué avant l'hydratation.
 */
export function Parallax({ children, amount = 48, className }: { children: ReactNode; amount?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [amount, -amount]);
  return (
    <div ref={ref} className={className}>
      <m.div style={{ y }} className="h-full w-full will-change-transform">
        {children}
      </m.div>
    </div>
  );
}

/** Trait qui se dessine de gauche à droite à l'entrée dans l'écran (décor). */
export function DrawLine({ className, delay = 0 }: { className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <m.span
      aria-hidden="true"
      className={`block origin-left ${className ?? ""}`}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}
