"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Barre de progression de lecture (haut de l'écran) : suit la position dans
 * l'élément `#${targetId}`. Transform seulement (scaleX), mis à jour au rAF.
 */
export default function ReadingProgress({ targetId, label }: { targetId: string; label: string }) {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    const bar = barRef.current;
    if (!target || !bar) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const read = -rect.top + window.innerHeight * 0.2;
      const p = total > 0 ? Math.min(1, Math.max(0, read / total)) : 1;
      bar.style.transform = `scaleX(${p})`;
      bar.parentElement?.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <div
      className="blog-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <div ref={barRef} className="blog-progress__bar" />
    </div>
  );
}

/**
 * Liens internes du corps d'un article Soro (HTML brut, donc de simples <a>) :
 * un écouteur délégué sur `#${targetId}` les fait naviguer côté client comme
 * un <Link>, sans recharger la page. Touches de modification, target,
 * download, ancres, fichiers et autres sites : comportement normal du navigateur.
 */
export function InternalLinks({ targetId }: { targetId: string }) {
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
