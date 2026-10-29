"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Liens internes du corps d'un article Soro (HTML brut, donc de simples <a>) :
 * un écouteur délégué sur `#${targetId}` les fait naviguer côté client comme
 * un <Link>, sans recharger la page. Touches de modification, target,
 * download, ancres, fichiers et autres sites : comportement normal du navigateur.
 */
export default function InternalLinks({ targetId }: { targetId: string }) {
  const router = useRouter();

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a") : null;
      if (!(a instanceof HTMLAnchorElement) || !target.contains(a)) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.hasAttribute("target") || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      if (url.origin !== window.location.origin || /\.[a-z0-9]+$/i.test(url.pathname)) return;
      // Ancre de la page courante : défilement natif
      if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      router.push(url.pathname + url.search + url.hash);
    };
    target.addEventListener("click", onClick);
    return () => target.removeEventListener("click", onClick);
  }, [targetId, router]);

  return null;
}
