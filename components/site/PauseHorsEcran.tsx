"use client";

import { useEffect, useRef } from "react";

/**
 * Pose data-paused sur le <header> parent tant qu'il est hors de l'écran : app/site.css
 * y met en pause les animations CSS de l'objet flottant et du logo (.tl-float,
 * .tl-logo-move, .tl-logo-halo), qui reprennent là où elles étaient au retour.
 * Même technique que le héros de l'accueil (hero.css, .hero-tl-root[data-paused]).
 * Ne rend qu'une balise vide masquée (repère pour trouver le <header>).
 */
export function PauseHorsEcran() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("header");
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) root.removeAttribute("data-paused");
      else root.setAttribute("data-paused", "");
    });
    io.observe(root);
    return () => {
      io.disconnect();
      root.removeAttribute("data-paused");
    };
  }, []);

  return <span ref={ref} hidden />;
}
