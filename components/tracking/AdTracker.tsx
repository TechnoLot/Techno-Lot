"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ctaLabelFor, sendEvent } from "@/lib/tracking/attribution";

/** Délai pendant lequel un même lien recliqué n'est pas recompté (double-clic). */
const CTA_DEDUP_MS = 1000;

/**
 * Envoie un page_view à chaque changement de route, hors chemin critique (LCP),
 * et un cta_click pour les liens vers la soumission, tel: et mailto:
 * (un seul écouteur délégué sur document, aucune modification des pages).
 */
export default function AdTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const send = () => sendEvent("page_view", pathname);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(send, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(send, 1500);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    let lastHref = "";
    let lastAt = 0;

    const onClick = (e: MouseEvent) => {
      try {
        const target = e.target as Element | null;
        const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!link || !ctaLabelFor(link)) return;
        const now = Date.now();
        if (link.href === lastHref && now - lastAt < CTA_DEDUP_MS) return;
        lastHref = link.href;
        lastAt = now;
        // Chemin de la page où le clic a eu lieu (sendBeacon : ne bloque pas
        // la navigation).
        sendEvent("cta_click", window.location.pathname);
      } catch {
        /* le tracking ne doit jamais casser le site */
      }
    };

    // Phase de capture : compté même si un composant stoppe la propagation.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
