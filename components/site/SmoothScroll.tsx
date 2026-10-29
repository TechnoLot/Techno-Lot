"use client";

import type Lenis from "lenis";
import { useEffect } from "react";
import { appareilLent } from "@/lib/appareil";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/**
 * Défilement lissé (Lenis) pour la souris et le pavé tactile d'ordinateur.
 * Le tactile garde le défilement natif ; désactivé en mouvement réduit et sur
 * les appareils lents (lib/appareil), où le défilement natif, porté par le
 * compositeur, reste fluide même quand le fil principal est chargé.
 * Lenis n'est téléchargé que si ces conditions sont réunies (import dynamique).
 * Monté uniquement par la coque du site public (LocaleShell).
 */
export function SmoothScroll() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let annule = false;
    let lenis: Lenis | null = null;
    let rafId = 0;

    (async () => {
      if ((await appareilLent()) || annule) return;
      const { default: Lenis } = await import("lenis");
      if (annule) return;

      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
      });
      window.__lenis = lenis;

      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    })();

    return () => {
      annule = true;
      cancelAnimationFrame(rafId);
      if (!lenis) return;
      lenis.destroy();
      if (window.__lenis === lenis) delete window.__lenis;
    };
  }, []);

  return null;
}
