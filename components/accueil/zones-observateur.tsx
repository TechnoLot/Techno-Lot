"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Seule partie de la carte exécutée dans le navigateur (zones-scene.tsx) : arme l'animation
 * d'entrée si la carte est sous l'écran au chargement, puis la lance à son apparition.
 */
export function ZonesObservateur({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Déjà à l'écran au chargement : rien n'est masqué
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.setAttribute("data-armed", "");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.setAttribute("data-in", "");
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure ref={ref} className="zc m-0">
      {children}
    </figure>
  );
}
