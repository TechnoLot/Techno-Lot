"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type MarqueeProps = {
  children: ReactNode;
  /** Libellé accessible du ruban */
  label?: string;
  className?: string;
  /** Vitesse de base en px/s */
  speed?: number;
  /** Accélération donnée par le défilement de la page (px/s par px défilé) */
  scrollBoost?: number;
  /** Vitesse ajoutée maximale (px/s) */
  maxBoost?: number;
};

/** Éléments qu'on atteint avec Tab : retirés de l'ordre de tabulation dans la copie. */
const FOCALISABLES = "a[href], button, input, select, textarea, [tabindex]";

/**
 * Ruban infini dont la vitesse et le sens suivent le défilement de la page.
 * Pause au survol et au focus ; en mouvement réduit, il devient une rangée
 * qu'on fait défiler soi-même. Le contenu est dupliqué pour boucler sans fin :
 * la copie est masquée aux lecteurs d'écran (aria-hidden) et sortie de l'ordre
 * de tabulation (tabindex -1), mais reste cliquable à la souris et au doigt
 * (pas d'`inert`, qui bloquait les clics sur la moitié des liens visibles).
 */
export function Marquee({ children, label, className, speed = 38, scrollBoost = 6, maxBoost = 900 }: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const halfRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [still, setStill] = useState(false);

  // Après chaque rendu : les liens de la copie restent cliquables mais hors tabulation
  useEffect(() => {
    copyRef.current?.querySelectorAll<HTMLElement>(FOCALISABLES).forEach((el) => el.setAttribute("tabindex", "-1"));
  });

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const half = halfRef.current;
    if (!root || !track || !half) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      return;
    }

    let x = 0;
    let dir = -1;
    let boost = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;
    let visible = false;
    let hover = false;

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      const width = half.offsetWidth + 16;
      boost *= 0.92;
      const v = hover ? 0 : speed + boost;
      x += dir * v * dt;
      if (width > 0) {
        if (x <= -width) x += width;
        if (x > 0) x -= width;
      }
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (Math.abs(dy) > 0.5) dir = dy > 0 ? -1 : 1;
      boost = Math.min(maxBoost, boost + Math.abs(dy) * scrollBoost);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) {
        lastT = performance.now();
        raf = requestAnimationFrame(loop);
      }
    });
    io.observe(root);
    const enter = () => (hover = true);
    const leave = () => (hover = false);
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("focusin", enter);
    root.addEventListener("focusout", leave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("focusin", enter);
      root.removeEventListener("focusout", leave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [speed, scrollBoost, maxBoost]);

  return (
    <div
      ref={rootRef}
      className={`relative ${still ? "overflow-x-auto" : "overflow-hidden"} ${className ?? ""}`}
      role="marquee"
      aria-label={label}
    >
      <div ref={trackRef} className="flex w-max items-center gap-4 will-change-transform">
        <div ref={halfRef} className="flex items-center gap-4">
          {children}
        </div>
        {!still && (
          // Copie pour la boucle : cachée aux lecteurs d'écran, cliquable, hors tabulation (voir plus haut)
          <div ref={copyRef} className="flex items-center gap-4" aria-hidden="true">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
