"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/* Délai avant l'apparition : aucune barre sur les navigations rapides */
const DELAI_MS = 150;
/* Filet de sécurité : la barre s'efface d'elle-même si la page n'arrive pas */
const MAX_MS = 10000;
/* Durée du fondu de sortie */
const FONDU_MS = 200;

/** Chemin comparable (décodé, sans barre oblique finale). */
function normaliser(chemin: string) {
  let c = chemin;
  try {
    c = decodeURIComponent(chemin);
  } catch {
    /* chemin mal encodé : comparé tel quel */
  }
  return c.length > 1 && c.endsWith("/") ? c.slice(0, -1) : c;
}

/**
 * Fine barre verte en haut de l'écran pendant un changement de page : clic sur
 * un lien interne ou retour/avance du navigateur. Elle n'apparaît qu'au-delà de
 * 150 ms, avance vite puis ralentit vers 80 % (transition CSS longue, courbe
 * décroissante), puis va au bout et s'efface dès que usePathname() change.
 * Seulement transform et opacity, écrits directement sur l'élément (aucun rendu
 * React pendant la navigation). Mouvement réduit : barre fixe à 60 %.
 * Pas de useSearchParams() (les pages statiques passeraient en rendu client) :
 * un lien qui ne change que la recherche d'URL n'affiche pas de barre.
 * Décorative (aria-hidden), monté uniquement par la coque du site public (LocaleShell).
 */
export function BarreChargement() {
  const pathname = usePathname();
  const barre = useRef<HTMLDivElement>(null);
  const cheminActuel = useRef(pathname);
  const minuteries = useRef<{ debut?: number; max?: number; fin?: number }>({});
  const visible = useRef(false);
  const arreter = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const el = barre.current;
    if (!el) return;
    const t = minuteries.current;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");

    const effacerMinuteries = () => {
      window.clearTimeout(t.debut);
      window.clearTimeout(t.max);
      window.clearTimeout(t.fin);
    };

    const afficher = () => {
      visible.current = true;
      el.style.willChange = "transform, opacity";
      el.style.transition = "none";
      el.style.opacity = "1";
      if (reduit.matches) {
        el.style.transform = "scaleX(0.6)";
        return;
      }
      el.style.transform = "scaleX(0)";
      // Point de départ appliqué avant la transition vers 80 %
      void el.offsetWidth;
      el.style.transition = "transform 8s cubic-bezier(0.08, 0.82, 0.17, 1)";
      el.style.transform = "scaleX(0.8)";
    };

    const terminer = () => {
      effacerMinuteries();
      if (!visible.current) return;
      visible.current = false;
      if (reduit.matches) {
        el.style.transition = `opacity ${FONDU_MS}ms ease-out`;
      } else {
        el.style.transition = `transform ${FONDU_MS}ms ease-out, opacity ${FONDU_MS}ms ease-out ${FONDU_MS / 2}ms`;
        el.style.transform = "scaleX(1)";
      }
      el.style.opacity = "0";
      t.fin = window.setTimeout(() => {
        el.style.transition = "none";
        el.style.transform = "scaleX(0)";
        el.style.willChange = "";
      }, FONDU_MS * 2);
    };

    const commencer = () => {
      effacerMinuteries();
      t.debut = window.setTimeout(afficher, DELAI_MS);
      t.max = window.setTimeout(terminer, MAX_MS);
    };
    arreter.current = terminer;

    const surClic = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const lien = (e.target as Element | null)?.closest?.("a[href]");
      if (!(lien instanceof HTMLAnchorElement)) return;
      if ((lien.target && lien.target !== "_self") || lien.hasAttribute("download")) return;
      const url = new URL(lien.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Même page (ancre seule, même URL) ou seule la recherche change : pas de barre
      if (normaliser(url.pathname) === normaliser(cheminActuel.current)) return;
      commencer();
    };

    const surHistorique = () => {
      if (normaliser(window.location.pathname) === normaliser(cheminActuel.current)) return;
      commencer();
    };

    document.addEventListener("click", surClic, true);
    window.addEventListener("popstate", surHistorique);
    return () => {
      document.removeEventListener("click", surClic, true);
      window.removeEventListener("popstate", surHistorique);
      effacerMinuteries();
    };
  }, []);

  // Nouvelle page affichée : la barre va au bout et s'efface
  useEffect(() => {
    if (cheminActuel.current === pathname) return;
    cheminActuel.current = pathname;
    arreter.current?.();
  }, [pathname]);

  return (
    <div
      ref={barre}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-vivid-deep opacity-0"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
