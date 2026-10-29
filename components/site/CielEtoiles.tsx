"use client";

import { useEffect, useRef } from "react";
import {
  FRICTION,
  N,
  PUSH,
  SPRING,
  creerEtoiles,
  dessinerEtoiles,
  peindrePoussiere,
  placerEtoiles,
  rayonsPointeur,
  type Pointeur,
} from "@/components/site/ciel/etoiles";

/**
 * Ciel de nuit de Montréal en étoiles vertes pour le héros des pages intérieures
 * (PageHero) : le même ciel que l'accueil (components/site/ciel/), sans hyperespace,
 * sans traits de constellations ni effets de logo. Deux canvas dans la boîte du parent :
 * poussière d'étoiles (statique, redessinée au redimensionnement) et étoiles (animées :
 * scintillation, écartement doux autour du curseur et retour par ressort). Le pointeur
 * s'écoute sur le <header> parent ; les canvas restent sous le contenu, sans clic.
 * Démarrage après la première peinture, en fondu ; pause hors écran et onglet caché ;
 * image fixe en mouvement réduit. Rien n'est caché en attendant ce code (LCP).
 */
export function CielEtoiles() {
  const fondRef = useRef<HTMLCanvasElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const fond = fondRef.current;
    const root = canvas?.closest<HTMLElement>("header");
    const ctx = canvas?.getContext("2d");
    const fctx = fond?.getContext("2d");
    if (!canvas || !fond || !root || !ctx || !fctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    let pushR = 110;
    let growR = 160;

    const pointer: Pointeur = { x: 0, y: 0, on: false };
    /** position du canevas dans la fenêtre, relue au besoin après un défilement */
    const box = { left: 0, top: 0 };
    let boxStale = true;

    const etoiles = creerEtoiles();
    const { homeX, homeY, px, py, vx, vy, fade, phase, freq, tau, tw } = etoiles;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      box.left = rect.left;
      box.top = rect.top;
      boxStale = false;
      const nw = Math.max(1, Math.round(rect.width));
      const nh = Math.max(1, Math.round(rect.height));
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      for (const c of [canvas!, fond!]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ({ pushR, growR } = rayonsPointeur(w, h));
      placerEtoiles(etoiles, w, h);
      peindrePoussiere(fctx!, fond!, dpr, w, h, false);
    }

    /* ───────────── Étoiles animées ───────────── */

    function step(dt: number, t: number) {
      const R = pushR;
      const R2 = R * R;
      const fr = Math.pow(FRICTION, dt);
      const margin = 30;

      for (let i = 0; i < N; i++) {
        let x = px[i];
        let y = py[i];
        let ax = 0;
        let ay = 0;
        if (pointer.on) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 1) {
            const d = Math.sqrt(d2);
            const k = 1 - d / R;
            const f = k * k * PUSH;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }
        ax += (homeX[i] - x) * SPRING;
        ay += (homeY[i] - y) * SPRING;
        vx[i] = (vx[i] + ax * dt) * fr;
        vy[i] = (vy[i] + ay * dt) * fr;
        x += vx[i] * dt;
        y += vy[i] * dt;

        // sortie du cadre : l'étoile renaît chez elle, en fondu (~1 s)
        if (
          (x < -margin || x > w + margin || y < -margin || y > h + margin) &&
          (Math.abs(x - homeX[i]) > 2 || Math.abs(y - homeY[i]) > 2)
        ) {
          x = homeX[i];
          y = homeY[i];
          vx[i] = 0;
          vy[i] = 0;
          fade[i] = 0;
        } else if (fade[i] < 1) {
          fade[i] = Math.min(1, fade[i] + dt / 60);
        }
        px[i] = x;
        py[i] = y;

        tw[i] = 1 - tau[i] + tau[i] * (0.5 + 0.5 * Math.sin(phase[i] + freq[i] * t));
      }
    }

    function draw() {
      if (!w) return;
      ctx!.clearRect(0, 0, w, h);
      dessinerEtoiles(ctx!, etoiles, w, h, pointer, growR);
    }

    /* ───────────── Mouvement réduit : image fixe ───────────── */

    if (reduce) {
      const paintStatic = () => {
        resize();
        draw();
      };
      paintStatic();
      canvas.classList.add("is-on");
      fond.classList.add("is-on");
      const ro = new ResizeObserver(paintStatic);
      ro.observe(canvas);
      return () => ro.disconnect();
    }

    /* ───────────── Boucle d'animation ───────────── */

    let raf = 0;
    let last = 0;
    let started = false;
    let inView = true;

    const canRun = () => started && inView && !document.hidden;

    function loop(now: number) {
      raf = 0;
      if (!canRun()) return;
      const dt = last ? Math.min((now - last) / 16.667, 3) : 1;
      last = now;
      step(dt, now / 1000);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function wake() {
      if (!raf && canRun()) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    }

    /* ───────────── Pointeur, toucher (écoutés sur le <header>) ───────────── */

    const toLocal = (e: PointerEvent) => {
      if (boxStale) {
        const rect = canvas.getBoundingClientRect();
        box.left = rect.left;
        box.top = rect.top;
        boxStale = false;
      }
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
    };
    const onPointerMove = (e: PointerEvent) => {
      toLocal(e);
      pointer.on = true;
      wake();
    };
    const onPointerLeave = () => {
      pointer.on = false;
    };
    /** toucher : les étoiles s'écartent pendant le contact */
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      toLocal(e);
      pointer.on = true;
      wake();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") pointer.on = false;
    };
    /** défilement : la boîte du canevas sera relue au prochain mouvement du pointeur */
    const onScroll = () => {
      boxStale = true;
    };

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("pointerdown", onPointerDown, { passive: true });
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ───────────── Pause hors écran / onglet caché ───────────── */

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) wake();
    });
    io.observe(root);
    const onVisibility = () => wake();
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      if (!started) return;
      resize();
      if (!raf) draw();
    });
    ro.observe(canvas);

    /* ───────────── Démarrage après la première peinture ───────────── */

    const hasIdle = typeof window.requestIdleCallback === "function";
    const start = () => {
      started = true;
      resize();
      canvas.classList.add("is-on");
      fond.classList.add("is-on");
      wake();
    };
    const idleId = hasIdle ? window.requestIdleCallback(start, { timeout: 1200 }) : window.setTimeout(start, 300);

    return () => {
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      cancelAnimationFrame(raf);
      raf = 0;
      started = false;
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <canvas ref={fondRef} aria-hidden="true" className="tl-ciel-canvas" />
      <canvas ref={ref} aria-hidden="true" className="tl-ciel-canvas" />
    </>
  );
}
