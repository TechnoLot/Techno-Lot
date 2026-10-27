"use client";

import { useEffect, useRef } from "react";

/**
 * Effets du héros (client) : constellation de particules en canvas, parallaxe
 * des lueurs, inclinaison / reflet / glitch du logo et épinglage « hyperespace ».
 * Le texte et le décor sont rendus côté serveur (Hero.tsx) : si ce code ne
 * s'exécute pas, rien n'est caché. Ce composant ne fait que poser des variables
 * CSS et des attributs data-* sur la section [data-hero-tl] :
 *   --hx / --hy  pointeur lissé (-1..1)       → inclinaison et reflet du logo
 *   --gx / --gy  pointeur très lissé (-1..1)  → parallaxe lente des lueurs
 *   --hp         progression de l'épinglage (0..1) → recul du logo et des titres
 *   --hero-logo-url, data-fx  image du logo pour les calques masqués (reflet, glitch)
 *   data-glitch (sur le logo), data-pointer, data-warp, data-paused
 */

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** vitesse de dérive propre (vers laquelle la vitesse revient) */
  bx: number;
  by: number;
  r: number;
  /** profondeur : vitesse en hyperespace */
  z: number;
  /** index de couleur */
  c: number;
  /** opacité d'apparition (après réapparition) */
  a: number;
  /** déplacement radial courant en hyperespace (px par image) */
  s: number;
};

type Wave = { x: number; y: number; r: number; max: number };

/* vert du logo, vert vif, émeraude */
const COLORS = ["94, 203, 51", "139, 233, 95", "52, 211, 153"] as const;
const TAU = Math.PI * 2;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function HeroFx() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const root = canvas?.closest<HTMLElement>("[data-hero-tl]");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !root || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    let linkDist = 120;
    let particles: Particle[] = [];
    const waves: Wave[] = [];

    const pointer = { x: 0, y: 0, on: false };
    const target = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0, wx: 9, wy: 9 };
    const glow = { x: 0, y: 0, wx: 9, wy: 9 };
    const box = { left: 0, top: 0 };
    let scrollP = 0;
    let warp = 0;

    /* ───────────── Particules ───────────── */

    const small = () => coarse || w < 640;

    function particleCount() {
      const area = w * h;
      return Math.round(clamp(area / (small() ? 9500 : 10500), 26, small() ? 56 : 130));
    }

    function spawn(): Particle {
      const ang = Math.random() * TAU;
      const sp = 0.08 + Math.random() * 0.22;
      const bx = Math.cos(ang) * sp;
      const by = Math.sin(ang) * sp;
      const roll = Math.random();
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: bx,
        vy: by,
        bx,
        by,
        r: 0.8 + Math.random() * 1.5,
        z: 0.35 + Math.random() * 0.65,
        c: roll < 0.62 ? 0 : roll < 0.82 ? 1 : 2,
        a: 1,
        s: 0,
      };
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      box.left = rect.left;
      box.top = rect.top;
      const nw = Math.max(1, Math.round(rect.width));
      const nh = Math.max(1, Math.round(rect.height));
      if (nw === w && nh === h && particles.length) return;
      const sx = w ? nw / w : 1;
      const sy = h ? nh / h : 1;
      w = nw;
      h = nh;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of particles) {
        p.x *= sx;
        p.y *= sy;
      }
      const n = particleCount();
      while (particles.length < n) particles.push(spawn());
      if (particles.length > n) particles = particles.slice(0, n);
      linkDist = clamp(Math.min(w, h) * 0.15, 90, 150);
    }

    function step(dt: number) {
      const cx = w / 2;
      const cy = h * 0.45;
      const R = Math.max(110, linkDist * 1.05);
      const R2 = R * R;
      const relax = Math.min(1, 0.04 * dt);
      const margin = 30;

      for (const wv of waves) wv.r += 10 * dt;
      for (let i = waves.length - 1; i >= 0; i--) if (waves[i].r >= waves[i].max) waves.splice(i, 1);

      for (const p of particles) {
        // la vitesse revient doucement à la dérive propre de la particule
        p.vx += (p.bx - p.vx) * relax;
        p.vy += (p.by - p.vy) * relax;

        // s'écarte doucement autour du curseur
        if (pointer.on) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 1) {
            const d = Math.sqrt(d2);
            const k = 1 - d / R;
            const f = k * k * 0.32 * dt;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }

        // onde (toucher / clic) : poussée au passage du front
        for (const wv of waves) {
          const dx = p.x - wv.x;
          const dy = p.y - wv.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const band = Math.abs(d - wv.r);
          if (band < 34 && d > 1) {
            const f = (1 - band / 34) * (1 - wv.r / wv.max) * 0.9 * dt;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // hyperespace : fuite radiale depuis le centre, de plus en plus rapide
        if (warp > 0.002) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const sp = warp * warp * (d * 0.06 + 1.5) * p.z;
          p.x += (dx / d) * sp * dt;
          p.y += (dy / d) * sp * dt;
          p.s = sp;
        } else {
          p.s = 0;
        }

        p.a = Math.min(1, p.a + 0.04 * dt);

        if (p.x < -margin || p.x > w + margin || p.y < -margin || p.y > h + margin) {
          if (warp > 0.04) {
            // une nouvelle étoile apparaît quelque part dans le champ
            p.x = cx + (Math.random() - 0.5) * w * 0.9;
            p.y = cy + (Math.random() - 0.5) * h * 0.9;
            p.a = 0;
          } else {
            if (p.x < -margin) p.x = w + margin;
            else if (p.x > w + margin) p.x = -margin;
            if (p.y < -margin) p.y = h + margin;
            else if (p.y > h + margin) p.y = -margin;
          }
        }
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const linkFade = Math.max(0, 1 - warp * 1.8);
      const n = particles.length;
      const cx = w / 2;
      const cy = h * 0.45;

      // traits fins entre particules proches (4 paliers d'opacité, un seul trait par palier)
      if (linkFade > 0.01) {
        const L = linkDist;
        const L2 = L * L;
        const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
        for (let i = 0; i < n; i++) {
          const a = particles[i];
          if (a.a < 0.5) continue;
          for (let j = i + 1; j < n; j++) {
            const b = particles[j];
            const dx = a.x - b.x;
            if (dx > L || dx < -L) continue;
            const dy = a.y - b.y;
            if (dy > L || dy < -L) continue;
            const d2 = dx * dx + dy * dy;
            if (d2 >= L2 || b.a < 0.5) continue;
            const k = 1 - Math.sqrt(d2) / L;
            const path = paths[Math.min(3, (k * 4) | 0)];
            path.moveTo(a.x, a.y);
            path.lineTo(b.x, b.y);
          }
        }
        ctx!.lineWidth = 1;
        for (let b = 0; b < 4; b++) {
          ctx!.strokeStyle = `rgba(94, 203, 51, ${(0.045 * (b + 1) * linkFade).toFixed(3)})`;
          ctx!.stroke(paths[b]);
        }

        // liens vers le curseur
        if (pointer.on) {
          const C = linkDist * 1.45;
          const C2 = C * C;
          const cpaths = [new Path2D(), new Path2D(), new Path2D()];
          for (const p of particles) {
            const dx = p.x - pointer.x;
            const dy = p.y - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= C2) continue;
            const k = 1 - Math.sqrt(d2) / C;
            const path = cpaths[Math.min(2, (k * 3) | 0)];
            path.moveTo(p.x, p.y);
            path.lineTo(pointer.x, pointer.y);
          }
          for (let b = 0; b < 3; b++) {
            ctx!.strokeStyle = `rgba(139, 233, 95, ${(0.12 * (b + 1) * linkFade).toFixed(3)})`;
            ctx!.stroke(cpaths[b]);
          }
        }
      }

      // traînées de l'hyperespace
      if (warp > 0.01) {
        ctx!.lineCap = "round";
        ctx!.lineWidth = 1 + warp * 1.2;
        for (let c = 0; c < COLORS.length; c++) {
          ctx!.beginPath();
          for (const p of particles) {
            if (p.c !== c || p.s < 0.3) continue;
            const dx = p.x - cx;
            const dy = p.y - cy;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const len = Math.min(p.s * 7, 260);
            ctx!.moveTo(p.x - (dx / d) * len, p.y - (dy / d) * len);
            ctx!.lineTo(p.x, p.y);
          }
          ctx!.strokeStyle = `rgba(${COLORS[c]}, ${(0.18 + warp * 0.55).toFixed(3)})`;
          ctx!.stroke();
        }
      }

      // points (grossis près du curseur)
      const C = linkDist * 1.45;
      for (let c = 0; c < COLORS.length; c++) {
        ctx!.beginPath();
        for (const p of particles) {
          if (p.c !== c || p.a < 0.999) continue;
          let r = p.r;
          if (pointer.on) {
            const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
            if (d < C) r *= 1 + 0.9 * (1 - d / C);
          }
          ctx!.moveTo(p.x + r, p.y);
          ctx!.arc(p.x, p.y, r, 0, TAU);
        }
        ctx!.fillStyle = `rgba(${COLORS[c]}, 0.75)`;
        ctx!.fill();
      }
      for (const p of particles) {
        if (p.a >= 0.999) continue;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, TAU);
        ctx!.fillStyle = `rgba(${COLORS[p.c]}, ${(0.75 * p.a).toFixed(3)})`;
        ctx!.fill();
      }

      // ondes
      ctx!.lineWidth = 1.5;
      for (const wv of waves) {
        const fade = 1 - wv.r / wv.max;
        ctx!.beginPath();
        ctx!.arc(wv.x, wv.y, wv.r, 0, TAU);
        ctx!.strokeStyle = `rgba(139, 233, 95, ${(0.45 * fade).toFixed(3)})`;
        ctx!.stroke();
        if (wv.r > 24) {
          ctx!.beginPath();
          ctx!.arc(wv.x, wv.y, wv.r * 0.72, 0, TAU);
          ctx!.strokeStyle = `rgba(94, 203, 51, ${(0.22 * fade).toFixed(3)})`;
          ctx!.stroke();
        }
      }
    }

    /* ───────────── Mouvement réduit : composition fixe ───────────── */

    if (reduce) {
      const paintStatic = () => {
        resize();
        draw();
      };
      paintStatic();
      canvas.classList.add("is-on");
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

    const writeVar = (name: string, value: number) => root.style.setProperty(name, value.toFixed(3));

    function loop(now: number) {
      raf = 0;
      if (!canRun()) return;
      const dt = last ? Math.min((now - last) / 16.667, 3) : 1;
      last = now;

      // pointeur lissé : rapide pour le logo, lent pour les lueurs
      tilt.x += (target.x - tilt.x) * Math.min(1, 0.12 * dt);
      tilt.y += (target.y - tilt.y) * Math.min(1, 0.12 * dt);
      glow.x += (target.x - glow.x) * Math.min(1, 0.035 * dt);
      glow.y += (target.y - glow.y) * Math.min(1, 0.035 * dt);
      if (Math.abs(tilt.x - tilt.wx) > 0.001) writeVar("--hx", (tilt.wx = tilt.x));
      if (Math.abs(tilt.y - tilt.wy) > 0.001) writeVar("--hy", (tilt.wy = tilt.y));
      if (Math.abs(glow.x - glow.wx) > 0.001) writeVar("--gx", (glow.wx = glow.x));
      if (Math.abs(glow.y - glow.wy) > 0.001) writeVar("--gy", (glow.wy = glow.y));

      warp += (scrollP - warp) * Math.min(1, 0.14 * dt);
      if (warp < 0.0005) warp = 0;

      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function wake() {
      if (!raf && canRun()) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    }

    /* ───────────── Pointeur, toucher ───────────── */

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.on = true;
      if (e.pointerType === "mouse" || (finePointer && e.pointerType === "pen")) {
        target.x = clamp((pointer.x / (w || 1)) * 2 - 1, -1, 1);
        target.y = clamp((pointer.y / (h || 1)) * 2 - 1, -1, 1);
        if (!root.dataset.pointer) root.dataset.pointer = "1";
      }
      wake();
    };
    const onPointerLeave = () => {
      pointer.on = false;
      target.x = 0;
      target.y = 0;
      delete root.dataset.pointer;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest("a, button")) return;
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      waves.push({ x, y, r: 0, max: Math.hypot(w, h) * 0.55 });
      if (waves.length > 4) waves.shift();
      if (e.pointerType !== "mouse") {
        pointer.x = x;
        pointer.y = y;
        pointer.on = true;
      }
      wake();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") pointer.on = false;
    };

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("pointerdown", onPointerDown, { passive: true });
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);

    /* ───────────── Défilement : épinglage et hyperespace ───────────── */

    let scrollQueued = false;
    let writtenP = -1;
    const measure = () => {
      scrollQueued = false;
      const r = root.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      const p = range > 1 ? clamp(-r.top / range, 0, 1) : 0;
      const c = canvas.getBoundingClientRect();
      box.left = c.left;
      box.top = c.top;
      scrollP = p;
      if (Math.abs(p - writtenP) > 0.0005 || (p === 0 && writtenP !== 0)) {
        writtenP = p;
        root.style.setProperty("--hp", p.toFixed(4));
      }
      if (p > 0.62) root.dataset.warp = "1";
      else delete root.dataset.warp;
      wake();
    };
    const onScroll = () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(measure);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();

    /* ───────────── Pause hors écran / onglet caché ───────────── */

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) {
        delete root.dataset.paused;
        wake();
      } else {
        root.dataset.paused = "1";
      }
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

    /* ───────────── Logo : calques masqués + glitch ───────────── */

    const logo = root.querySelector<HTMLElement>("[data-hero-logo]");
    const img = logo?.querySelector("img");
    const setLogoUrl = () => {
      const src = img?.currentSrc || img?.src;
      if (!src) return;
      root.style.setProperty("--hero-logo-url", `url("${src}")`);
      root.dataset.fx = "on";
    };
    if (img) {
      if (img.complete && img.naturalWidth) setLogoUrl();
      else img.addEventListener("load", setLogoUrl, { once: true });
    }

    let glitchTimer = 0;
    let glitchOff = 0;
    const glitch = () => {
      if (!logo || logo.dataset.glitch || !root.dataset.fx) return;
      logo.dataset.glitch = "1";
      glitchOff = window.setTimeout(() => {
        delete logo.dataset.glitch;
      }, 650);
    };
    const scheduleGlitch = (ms: number) => {
      glitchTimer = window.setTimeout(() => {
        if (inView && !document.hidden) glitch();
        scheduleGlitch(4200 + Math.random() * 4800);
      }, ms);
    };
    scheduleGlitch(2600);
    logo?.addEventListener("pointerenter", glitch);

    /* ───────────── Démarrage après la première peinture ───────────── */

    const start = () => {
      started = true;
      resize();
      canvas.classList.add("is-on");
      wake();
    };
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idleId = hasIdle ? window.requestIdleCallback(start, { timeout: 1200 }) : window.setTimeout(start, 300);

    return () => {
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      cancelAnimationFrame(raf);
      raf = 0;
      started = false;
      window.clearTimeout(glitchTimer);
      window.clearTimeout(glitchOff);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      img?.removeEventListener("load", setLogoUrl);
      logo?.removeEventListener("pointerenter", glitch);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="hero-tl-canvas" />;
}
