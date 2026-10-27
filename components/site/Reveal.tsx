"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Délai en secondes (échelonnement : 0.06–0.09 s par élément) */
  delay?: number;
  /** Décalage vertical de départ en px */
  y?: number;
  /** Conservé pour compatibilité : la révélation se joue toujours une seule fois. */
  once?: boolean;
  style?: CSSProperties;
};

/* Registre partagé : un seul écouteur de défilement (filet de sécurité de
   l'IntersectionObserver, qui peut être suspendu dans certains contextes). */
const pending = new Set<HTMLElement>();
let listening = false;
let last = 0;

function reveal(el: HTMLElement) {
  el.setAttribute("data-in", "");
  pending.delete(el);
}

function sweep() {
  const limit = window.innerHeight * 0.95;
  pending.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < limit && r.bottom > 0) reveal(el);
  });
}

function listen() {
  if (listening) return;
  listening = true;
  let trailing: ReturnType<typeof setTimeout> | undefined;
  const onScroll = () => {
    if (!pending.size) return;
    clearTimeout(trailing);
    trailing = setTimeout(sweep, 120);
    const now = Date.now();
    if (now - last < 90) return;
    last = now;
    sweep();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("hashchange", sweep);
  // Impression : tout afficher
  window.addEventListener("beforeprint", () => pending.forEach(reveal));
}

/**
 * Révélation au défilement : fondu + montée (transform/opacity, CSS .tl-reveal
 * dans app/site.css), une seule fois.
 * Le contenu est VISIBLE au rendu serveur : rien n'est caché si le JavaScript
 * échoue. Après l'hydratation, seul un bloc encore sous la ligne de flottaison
 * est « armé » (masqué hors écran), puis révélé quand il entre dans la vue.
 * Un bloc déjà à l'écran reste tel quel (aucun clignotement, LCP intact).
 * Mouvement réduit : aucun masquage ni déplacement.
 */
export function Reveal({ children, className, delay = 0, y = 28, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Déjà à l'écran (ou au-dessus) : on ne masque rien.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    el.setAttribute("data-armed", "");
    pending.add(el);
    listen();

    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            reveal(el);
            io?.disconnect();
          }
        },
        { rootMargin: "0px 0px -5% 0px", threshold: 0.01 },
      );
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      pending.delete(el);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`tl-reveal ${className ?? ""}`}
      style={{ ...style, ["--tl-reveal-y" as string]: `${y}px`, ["--tl-reveal-d" as string]: `${delay}s` }}
    >
      {children}
    </div>
  );
}
