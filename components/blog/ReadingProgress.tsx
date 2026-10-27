"use client";

import { useEffect, useRef } from "react";

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
