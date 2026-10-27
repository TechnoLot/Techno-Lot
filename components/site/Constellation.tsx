"use client";

import { useEffect, useRef } from "react";

type ConstellationProps = {
  className?: string;
  /** Nombre maximal de points (défaut 38) */
  max?: number;
};

/**
 * Constellation de particules de l'ancien héros, version légère : quelques
 * points verts qui dérivent et se relient. Canvas décoratif (aria-hidden),
 * en pause hors écran et onglet masqué, absent en mouvement réduit.
 */
export function Constellation({ className, max = 38 }: ConstellationProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const LINK = 120;
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = false;
    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let pts: P[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(12, Math.min(max, Math.floor((w * h) / 26000)));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 0.8 + Math.random() * 1.4,
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(139, 233, 95, 0.55)";
        ctx.fill();
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(94, 203, 51, ${(0.16 * (1 - d / LINK)).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };

    resize();
    canvas.style.opacity = "1";
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    document.addEventListener("visibilitychange", start);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", start);
    };
  }, [max]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-1000 ${className ?? ""}`}
    />
  );
}
