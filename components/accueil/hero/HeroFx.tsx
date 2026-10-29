"use client";

import { useEffect, useRef } from "react";
import { CIEL, CONSTELLATIONS, ETOILES, FIGURES } from "./ciel";

/**
 * Effets du héros (client) : le vrai ciel de Montréal en deux canvas (voie lactée
 * statique, étoiles animées), parallaxe de la lueur d'horizon, inclinaison / reflet /
 * glitch du logo et épinglage « hyperespace » adouci.
 * Le texte et le décor CSS sont rendus côté serveur (Hero.tsx) : si ce code ne
 * s'exécute pas, rien n'est caché. Ce composant ne fait que dessiner dans ses canvas
 * et poser des variables CSS et des attributs data-* sur la section [data-hero-tl] :
 *   --hx / --hy  pointeur lissé (-1..1)       → inclinaison et reflet du logo
 *   --gx / --gy  pointeur très lissé (-1..1)  → parallaxe lente de la lueur d'horizon
 *   --hp         progression de l'épinglage (0..1) → recul du logo et des titres
 *   --hero-logo-url, data-fx  image du logo pour les calques masqués (reflet, glitch)
 *   data-glitch (sur le logo), data-pointer, data-warp, data-paused
 *   data-lite  ordinateur ou téléphone lent : canevas en 1x, moins de poussière, sans scintillation
 * Étoiles : catalogue Yale Bright Star projeté depuis Montréal (ciel.ts, généré par
 * scripts/generer-ciel.mjs). Elles restent en place, s'écartent doucement du curseur
 * et reviennent chez elles par un ressort ; les traits de la Grande Ourse et de
 * Cassiopée s'éclairent quand le curseur s'en approche.
 */

const TAU = Math.PI * 2;
const D = Math.PI / 180;
const REF_W = CIEL.largeur;
const REF_H = CIEL.hauteur;
const N = ETOILES.length / 4;

/** Couleurs des étoiles par classe de température : orangée … bleutée */
const STAR_RGB = [
  [255, 210, 168],
  [255, 234, 208],
  [250, 248, 240],
  [226, 236, 255],
  [206, 222, 255],
] as const;
const CLASSES = STAR_RGB.length;
/** vert de la marque */
const GREEN = [94, 203, 51] as const;

/** Paliers d'opacité des étoiles : un seul fill par couleur et par palier */
const TIERS = 32;
const BUCKETS = CLASSES * (TIERS + 1);
const FILLS = STAR_RGB.map(([r, g, b]) =>
  Array.from({ length: TIERS + 1 }, (_, t) => `rgba(${r}, ${g}, ${b}, ${(t / TIERS).toFixed(3)})`),
);

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Mode allégé : en dessous d'environ 40 images/s en moyenne, l'effet se simplifie. */
const SLOW_FRAME_MS = 25;
const PERF_SAMPLE = 90;
const LITE_SHARE = 0.5;

/** Pointeur : poussée douce autour du curseur, ressort de retour, frottement par image */
const PUSH = 0.25;
const SPRING = 0.005;
const FRICTION = 0.9;
/** Traits des figures : opacité au repos, éclairés, distance d'éclairage (px) */
const LINE_REST = 0.22;
const LINE_LIT = 0.5;
const LINE_NEAR = 120;
/** Poussière d'étoiles faibles : nombre de points pour un écran 1440×900 */
const DUST_REF = 1100;
const DUST_TIERS = 8;

/* ───────────── Voie lactée : grille basse résolution, calculée dans le navigateur ───────────── */

const GW = 200;
const GH = 125;
const PHI = CIEL.latitude * D;
const LST = CIEL.tempsSideral * 15 * D;
const A0 = CIEL.altitude * D;
const AZ = CIEL.azimut * D;
/** échelle de la projection stéréographique (px du cadre de référence) */
const KPROJ = REF_W / 2 / (2 * Math.tan((CIEL.champ / 4) * D));
/** repère local (nord, est, zénith) : visée, droite, haut de la caméra */
const CAM_F = [Math.cos(A0) * Math.cos(AZ), Math.cos(A0) * Math.sin(AZ), Math.sin(A0)];
const CAM_R = [-Math.sin(AZ), Math.cos(AZ), 0];
const CAM_U = [-Math.sin(A0) * Math.cos(AZ), -Math.sin(A0) * Math.sin(AZ), Math.cos(A0)];
const POLE = [Math.cos(PHI), 0, Math.sin(PHI)];
const MERID = [-Math.sin(PHI), 0, Math.cos(PHI)];
/** pôle nord galactique et longitude du pôle céleste (J2000) */
const ANGP = 192.85948 * D;
const DNGP = 27.12825 * D;
const LNCP = 122.93192 * D;

/* bruit de valeur + fbm, graine fixe : même voie lactée à chaque visite */
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t: number) => t * t * (3 - 2 * t);
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = smooth(x - xi);
  const v = smooth(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let o = 0; o < 5; o++) {
    s += a * vnoise(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}

/**
 * Une rangée de la grille : projection inverse de chaque cellule, latitude et
 * longitude galactiques, bande lumineuse bruitée, bande sombre, extinction près de
 * l'horizon. Écrit l'alpha (couleur fixe) et garde b et la hauteur z pour la poussière.
 */
function galaxyRow(j: number, rgba: Uint8ClampedArray, galB: Float32Array, galZ: Float32Array) {
  for (let i = 0; i < GW; i++) {
    const x = (((i + 0.5) / GW) * REF_W - REF_W / 2) / KPROJ;
    const y = -(((j + 0.5) / GH) * REF_H - REF_H / 2) / KPROJ;
    const rho = Math.hypot(x, y) || 1e-9;
    const c = 2 * Math.atan(rho / 2);
    const cc = Math.cos(c);
    const sc = Math.sin(c);
    const s0 = cc * CAM_F[0] + sc * ((x / rho) * CAM_R[0] + (y / rho) * CAM_U[0]);
    const s1 = cc * CAM_F[1] + sc * ((x / rho) * CAM_R[1] + (y / rho) * CAM_U[1]);
    const s2 = cc * CAM_F[2] + sc * ((x / rho) * CAM_R[2] + (y / rho) * CAM_U[2]);
    const dec = Math.asin(clamp(s0 * POLE[0] + s2 * POLE[2], -1, 1));
    const ra = LST - Math.atan2(-s1, s0 * MERID[0] + s2 * MERID[2]);
    const sd = Math.sin(dec);
    const cd = Math.cos(dec);
    const cr = Math.cos(ra - ANGP);
    const b = Math.asin(sd * Math.sin(DNGP) + cd * Math.cos(DNGP) * cr) / D;
    const l = ((((LNCP - Math.atan2(cd * Math.sin(ra - ANGP), sd * Math.cos(DNGP) - cd * Math.sin(DNGP) * cr)) / D) % 360) + 360) % 360;

    const k = j * GW + i;
    galB[k] = b;
    galZ[k] = s2;

    const airmass = clamp((s2 - 0.03) / 0.3, 0, 1);
    const core = Math.exp(-((b / 9) ** 2));
    const halo = Math.exp(-((b / 24) ** 2)) * 0.35;
    const lum = 0.55 + 0.45 * Math.cos((l * Math.PI) / 360) ** 2;
    let alpha = 0;
    // loin de la bande, l'intensité reste sous 1/255 : inutile de calculer le bruit
    if ((core * 1.2 + halo) * lum * airmass * 51 >= 0.5) {
      const n = fbm(i / 14 + l / 40, j / 14 + b / 25);
      const lane = Math.exp(-(((b + 1.5) / 2.2) ** 2)) * Math.max(0, fbm(i / 7 + 9, j / 7) - 0.45) * 1.6;
      const I = Math.max(0, (core * (0.45 + 0.75 * n) + halo * (0.6 + 0.4 * n) - lane * core) * lum * airmass);
      alpha = Math.min(255, I * 255 * 0.2);
    }
    const p = k * 4;
    rgba[p] = 196;
    rgba[p + 1] = 214;
    rgba[p + 2] = 236;
    rgba[p + 3] = alpha;
  }
}

/** Sprite de halo (dégradé radial pré-rendu) pour une couleur d'étoile */
function haloSprite([r, g, b]: readonly [number, number, number]) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const x = c.getContext("2d");
  if (x) {
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    x.fillStyle = grad;
    x.fillRect(0, 0, 64, 64);
  }
  return c;
}

export function HeroFx() {
  const voieRef = useRef<HTMLCanvasElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const voie = voieRef.current;
    const root = canvas?.closest<HTMLElement>("[data-hero-tl]");
    const ctx = canvas?.getContext("2d");
    const vctx = voie?.getContext("2d");
    if (!canvas || !voie || !root || !ctx || !vctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let lite = false;

    let w = 0;
    let h = 0;
    /** cadrage « cover » du cadre de référence */
    let S = 1;
    let ox = 0;
    let oy = 0;
    let pushR = 110;
    let growR = 160;

    const pointer = { x: 0, y: 0, on: false };
    const target = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0, wx: 9, wy: 9 };
    const glow = { x: 0, y: 0, wx: 9, wy: 9 };
    const box = { left: 0, top: 0 };
    let scrollP = 0;
    let warp = 0;

    /* ───────────── Étoiles : tableaux alloués une fois ───────────── */

    const homeX = new Float32Array(N);
    const homeY = new Float32Array(N);
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const vx = new Float32Array(N);
    const vy = new Float32Array(N);
    const rad = new Float32Array(N);
    const base = new Float32Array(N);
    const depth = new Float32Array(N);
    const fade = new Float32Array(N).fill(1);
    const phase = new Float32Array(N);
    const freq = new Float32Array(N);
    const tau = new Float32Array(N);
    const speed = new Float32Array(N);
    const tw = new Float32Array(N).fill(1);
    const cls = new Uint8Array(N);
    const halo = new Uint8Array(N);
    const bucket = new Uint16Array(N);
    const order = new Uint16Array(N);
    const counts = new Uint16Array(BUCKETS);
    const starts = new Uint16Array(BUCKETS + 1);
    const SKIP = 0xffff;

    for (let i = 0; i < N; i++) {
      const mag = ETOILES[i * 4 + 2];
      const fl = Math.pow(10, -0.4 * (mag - 6));
      rad[i] = 0.35 + 0.3 * Math.pow(fl, 0.38);
      base[i] = Math.min(1, 0.28 + 0.12 * Math.sqrt(fl));
      depth[i] = 0.35 + 0.65 * clamp((6 - mag) / 6, 0, 1);
      cls[i] = clamp(ETOILES[i * 4 + 3], 0, CLASSES - 1);
      halo[i] = mag < 2.4 ? 1 : 0;
      phase[i] = Math.random() * TAU;
      freq[i] = 0.5 + Math.random() * 1.1;
    }
    const sprites = STAR_RGB.map(haloSprite);

    /** éclairage courant des traits, par constellation */
    const lit = new Float32Array(CONSTELLATIONS.length).fill(LINE_REST);
    const trailStyles: string[] = new Array(CLASSES).fill("");
    let trailKey = -1;

    function frame() {
      S = Math.max(w / REF_W, h / REF_H);
      // portrait : centré sur x = 0,30 du cadre (Grande Ourse), sans jamais montrer de vide
      ox = w < h ? clamp(w / 2 - 0.3 * REF_W * S, w - REF_W * S, 0) : (w - REF_W * S) / 2;
      oy = (h - REF_H * S) / 2;
    }

    function layoutStars() {
      for (let i = 0; i < N; i++) {
        const x = ox + ETOILES[i * 4] * REF_W * S;
        const y = oy + ETOILES[i * 4 + 1] * REF_H * S;
        homeX[i] = x;
        homeY[i] = y;
        px[i] = x;
        py[i] = y;
        vx[i] = 0;
        vy[i] = 0;
        // scintillation plus forte près de l'horizon
        tau[i] = 0.1 + 0.2 * clamp(y / h, 0, 1);
      }
    }

    /* ───────────── Voie lactée et poussière (canevas statique) ───────────── */

    let galCanvas: HTMLCanvasElement | null = null;
    let galImage: ImageData | null = null;
    const galB = new Float32Array(GW * GH);
    const galZ = new Float32Array(GW * GH);
    let galRow = 0;
    let galReady = false;
    let galIdle = 0;
    let galTimer = 0;
    const hasIdle = typeof window.requestIdleCallback === "function";

    function galaxyInit() {
      galCanvas = document.createElement("canvas");
      galCanvas.width = GW;
      galCanvas.height = GH;
      galImage = galCanvas.getContext("2d")?.createImageData(GW, GH) ?? null;
      return galImage !== null;
    }
    function galaxyDone() {
      galCanvas!.getContext("2d")!.putImageData(galImage!, 0, 0);
      galReady = true;
      paintVoie();
      voie!.classList.add("is-on");
    }
    /** calcul par tranches, pendant les temps morts du navigateur */
    function galaxyChunk(deadline?: IdleDeadline) {
      galIdle = 0;
      galTimer = 0;
      const budget = deadline && !deadline.didTimeout ? clamp(deadline.timeRemaining(), 4, 12) : 8;
      const until = performance.now() + budget;
      do galaxyRow(galRow++, galImage!.data, galB, galZ);
      while (galRow < GH && performance.now() < until);
      if (galRow < GH) {
        if (hasIdle) galIdle = window.requestIdleCallback(galaxyChunk, { timeout: 300 });
        else galTimer = window.setTimeout(galaxyChunk, 16);
      } else {
        galaxyDone();
      }
    }

    function paintVoie() {
      if (!galReady || !w) return;
      const vc = vctx!;
      vc.setTransform(1, 0, 0, 1, 0, 0);
      vc.clearRect(0, 0, voie!.width, voie!.height);
      // voie lactée : grille agrandie au cadrage « cover », deux passes floutées
      const dx = ox * dpr;
      const dy = oy * dpr;
      const dw = REF_W * S * dpr;
      const dh = REF_H * S * dpr;
      vc.imageSmoothingEnabled = true;
      vc.imageSmoothingQuality = "high";
      if (typeof vc.filter === "string") {
        vc.filter = `blur(${10 * dpr}px)`;
        vc.drawImage(galCanvas!, dx, dy, dw, dh);
        vc.filter = `blur(${2 * dpr}px)`;
        vc.globalAlpha = 0.7;
        vc.drawImage(galCanvas!, dx, dy, dw, dh);
        vc.filter = "none";
      } else {
        // navigateur sans filtre canvas : flou approché par 9 copies décalées additionnées
        const o = 6 * dpr;
        vc.globalCompositeOperation = "lighter";
        vc.globalAlpha = 1 / 9;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) vc.drawImage(galCanvas!, dx + a * o, dy + b * o, dw, dh);
        vc.globalCompositeOperation = "source-over";
        vc.globalAlpha = 0.7;
        vc.drawImage(galCanvas!, dx, dy, dw, dh);
      }
      vc.globalAlpha = 1;

      // poussière d'étoiles faibles, plus dense le long de la voie lactée (graine fixe)
      vc.setTransform(dpr, 0, 0, dpr, 0, 0);
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const count = Math.round(DUST_REF * ((w * h) / (1440 * 900)) * (lite ? LITE_SHARE : 1));
      const dust = new Float32Array(count * 4);
      let placed = 0;
      for (let tries = 0; placed < count && tries < count * 20; tries++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const gi = clamp(Math.floor(((x - ox) / (REF_W * S)) * GW), 0, GW - 1);
        const gj = clamp(Math.floor(((y - oy) / (REF_H * S)) * GH), 0, GH - 1);
        const k = gj * GW + gi;
        if (galZ[k] < 0.03) continue;
        if (rnd() > 0.35 + 0.65 * Math.exp(-((galB[k] / 14) ** 2))) continue;
        const a = 0.1 + rnd() * 0.22;
        dust[placed * 4] = x;
        dust[placed * 4 + 1] = y;
        dust[placed * 4 + 2] = 0.35 + rnd() * 0.3;
        dust[placed * 4 + 3] = Math.min(DUST_TIERS - 1, Math.floor(((a - 0.1) / 0.22) * DUST_TIERS));
        placed++;
      }
      for (let t = 0; t < DUST_TIERS; t++) {
        vc.beginPath();
        for (let p = 0; p < placed; p++) {
          if (dust[p * 4 + 3] !== t) continue;
          const x = dust[p * 4];
          const y = dust[p * 4 + 1];
          const r = dust[p * 4 + 2];
          vc.moveTo(x + r, y);
          vc.arc(x, y, r, 0, TAU);
        }
        vc.fillStyle = `rgba(225, 235, 250, ${(0.1 + ((t + 0.5) / DUST_TIERS) * 0.22).toFixed(3)})`;
        vc.fill();
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      box.left = rect.left;
      box.top = rect.top;
      const nw = Math.max(1, Math.round(rect.width));
      const nh = Math.max(1, Math.round(rect.height));
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      for (const c of [canvas!, voie!]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const linkDist = clamp(Math.min(w, h) * 0.15, 90, 150);
      pushR = Math.max(110, linkDist * 1.05);
      growR = linkDist * 1.45;
      frame();
      layoutStars();
      paintVoie();
    }

    /* ───────────── Étoiles animées ───────────── */

    function step(dt: number, t: number, twinkle: boolean) {
      const cx = w / 2;
      const cy = h * 0.45;
      const R = pushR;
      const R2 = R * R;
      const fr = Math.pow(FRICTION, dt);
      // pendant l'hyperespace les étoiles filent ; sous 0,05 le ressort les ramène chez elles
      const spring = warp < 0.05;
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
        if (spring) {
          ax += (homeX[i] - x) * SPRING;
          ay += (homeY[i] - y) * SPRING;
        }
        vx[i] = (vx[i] + ax * dt) * fr;
        vy[i] = (vy[i] + ay * dt) * fr;
        x += vx[i] * dt;
        y += vy[i] * dt;

        // hyperespace : fuite radiale depuis le centre, plus rapide pour les étoiles brillantes
        if (warp > 0.002) {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const sp = warp * warp * (d * 0.018 + 0.5) * depth[i];
          x += (dx / d) * sp * dt;
          y += (dy / d) * sp * dt;
          speed[i] = sp;
        } else {
          speed[i] = 0;
        }

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

        tw[i] = twinkle ? 1 - tau[i] + tau[i] * (0.5 + 0.5 * Math.sin(phase[i] + freq[i] * t)) : 1;
      }

      // traits : s'éclairent quand le pointeur approche d'une étoile de la constellation
      for (let c = 0; c < CONSTELLATIONS.length; c++) {
        const goal = pointer.on && pointerNear(c) ? LINE_LIT : LINE_REST;
        lit[c] += (goal - lit[c]) * Math.min(1, 0.06 * dt);
      }
    }

    /** le pointeur est-il à moins de LINE_NEAR px d'une étoile de cette constellation ? */
    function pointerNear(c: number) {
      const near2 = LINE_NEAR * LINE_NEAR;
      for (const chain of CONSTELLATIONS[c]) {
        for (const s of FIGURES[chain]) {
          const dx = px[s] - pointer.x;
          const dy = py[s] - pointer.y;
          if (dx * dx + dy * dy < near2) return true;
        }
      }
      return false;
    }

    function draw() {
      if (!w) return;
      const c2 = ctx!;
      c2.clearRect(0, 0, w, h);

      // traits des deux constellations : raccourcis aux deux bouts, estompés près du texte
      const lineFade = Math.max(0, 1 - 3 * warp);
      if (lineFade > 0.01) {
        c2.lineWidth = 1;
        c2.lineCap = "butt";
        c2.strokeStyle = "rgb(94, 203, 51)";
        const mcx = w / 2;
        const mcy = h * 0.56;
        for (let c = 0; c < CONSTELLATIONS.length; c++) {
          const la = lit[c] * lineFade;
          for (const chain of CONSTELLATIONS[c]) {
            const fig = FIGURES[chain];
            for (let k = 0; k < fig.length - 1; k++) {
              const a = fig[k];
              const b = fig[k + 1];
              const ax = px[a];
              const ay = py[a];
              const dx = px[b] - ax;
              const dy = py[b] - ay;
              const d = Math.hypot(dx, dy);
              if (d < 16) continue;
              const mx = ax + dx / 2 - mcx;
              const my = ay + dy / 2 - mcy;
              const e = Math.hypot(mx / (0.36 * w), my / (0.34 * h));
              const alpha = la * clamp((e - 0.75) / 0.45, 0, 1) * Math.min(fade[a], fade[b]);
              if (alpha < 0.005) continue;
              const g = 7 / d;
              c2.globalAlpha = alpha;
              c2.beginPath();
              c2.moveTo(ax + dx * g, ay + dy * g);
              c2.lineTo(ax + dx * (1 - g), ay + dy * (1 - g));
              c2.stroke();
            }
          }
        }
        c2.globalAlpha = 1;
      }

      // traînées de l'hyperespace : courtes, discrètes, qui glissent vers le vert de la marque
      if (warp > 0.01) {
        const key = Math.round(warp * 40);
        if (key !== trailKey) {
          trailKey = key;
          const m = key / 40;
          const alpha = (0.06 + 0.16 * m).toFixed(3);
          for (let c = 0; c < CLASSES; c++) {
            const [r, g, b] = STAR_RGB[c];
            trailStyles[c] =
              `rgba(${Math.round(r + (GREEN[0] - r) * m)}, ${Math.round(g + (GREEN[1] - g) * m)}, ` +
              `${Math.round(b + (GREEN[2] - b) * m)}, ${alpha})`;
          }
        }
        const cx = w / 2;
        const cy = h * 0.45;
        c2.lineCap = "round";
        c2.lineWidth = 1 + warp * 0.35;
        for (let c = 0; c < CLASSES; c++) {
          c2.beginPath();
          let any = false;
          for (let i = 0; i < N; i++) {
            if (cls[i] !== c || speed[i] < 0.3 || fade[i] < 0.5) continue;
            const dx = px[i] - cx;
            const dy = py[i] - cy;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const len = Math.min(speed[i] * 3, 60);
            c2.moveTo(px[i] - (dx / d) * len, py[i] - (dy / d) * len);
            c2.lineTo(px[i], py[i]);
            any = true;
          }
          if (!any) continue;
          c2.strokeStyle = trailStyles[c];
          c2.stroke();
        }
      }

      // étoiles : tri par couleur et palier d'opacité (tri par dénombrement, sans allocation)
      counts.fill(0);
      const G = growR;
      const G2 = G * G;
      for (let i = 0; i < N; i++) {
        const x = px[i];
        const y = py[i];
        bucket[i] = SKIP;
        if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;
        const tier = Math.round(base[i] * tw[i] * fade[i] * TIERS);
        if (tier <= 0) continue;
        const b = cls[i] * (TIERS + 1) + tier;
        bucket[i] = b;
        counts[b]++;
      }
      starts[0] = 0;
      for (let b = 0; b < BUCKETS; b++) starts[b + 1] = starts[b] + counts[b];
      for (let i = 0; i < N; i++) {
        const b = bucket[i];
        if (b !== SKIP) order[starts[b] + --counts[b]] = i;
      }

      // halos doux des étoiles brillantes (sprite pré-rendu)
      for (let i = 0; i < N; i++) {
        if (!halo[i] || bucket[i] === SKIP) continue;
        const r = rad[i] * grow(i, G, G2) * 6;
        c2.globalAlpha = 0.22 * tw[i] * fade[i];
        c2.drawImage(sprites[cls[i]], px[i] - r, py[i] - r, r * 2, r * 2);
      }
      c2.globalAlpha = 1;

      for (let b = 1; b < BUCKETS; b++) {
        const from = starts[b];
        const to = starts[b + 1];
        if (from === to) continue;
        c2.beginPath();
        for (let o = from; o < to; o++) {
          const i = order[o];
          const r = rad[i] * grow(i, G, G2);
          c2.moveTo(px[i] + r, py[i]);
          c2.arc(px[i], py[i], r, 0, TAU);
        }
        c2.fillStyle = FILLS[(b / (TIERS + 1)) | 0][b % (TIERS + 1)];
        c2.fill();
      }
    }

    /** léger grossissement près du curseur (×1,5 au plus) */
    function grow(i: number, G: number, G2: number) {
      if (!pointer.on) return 1;
      const dx = px[i] - pointer.x;
      const dy = py[i] - pointer.y;
      const d2 = dx * dx + dy * dy;
      return d2 < G2 ? 1 + 0.5 * (1 - Math.sqrt(d2) / G) : 1;
    }

    /* ───────────── Mouvement réduit : image fixe ───────────── */

    if (reduce) {
      const paintStatic = () => {
        resize();
        draw();
      };
      if (galaxyInit()) {
        for (let j = 0; j < GH; j++) galaxyRow(j, galImage!.data, galB, galZ);
        galCanvas!.getContext("2d")!.putImageData(galImage!, 0, 0);
        galReady = true;
      }
      paintStatic();
      canvas.classList.add("is-on");
      voie.classList.add("is-on");
      const ro = new ResizeObserver(paintStatic);
      ro.observe(canvas);
      return () => ro.disconnect();
    }

    /* ───────────── Boucle d'animation ───────────── */

    let raf = 0;
    let last = 0;
    let started = false;
    let inView = true;
    let perfFrames = 0;
    let perfSum = 0;

    const canRun = () => started && inView && !document.hidden;

    const writeVar = (name: string, value: number) => root.style.setProperty(name, value.toFixed(3));

    /** Appareil lent : canevas en 1x, moins de poussière, sans scintillation, décor CSS allégé (data-lite). */
    const goLite = () => {
      lite = true;
      dpr = 1;
      root.dataset.lite = "1";
      w = 0;
      h = 0;
      resize();
    };

    function loop(now: number) {
      raf = 0;
      if (!canRun()) return;
      const dt = last ? Math.min((now - last) / 16.667, 3) : 1;
      // Mesure de la fluidité (images réellement enchaînées seulement)
      if (!lite && last && now - last < 250) {
        perfSum += now - last;
        if (++perfFrames >= PERF_SAMPLE) {
          if (perfSum / perfFrames > SLOW_FRAME_MS) goLite();
          perfFrames = 0;
          perfSum = 0;
        }
      }
      last = now;

      // pointeur lissé : rapide pour le logo, lent pour la lueur d'horizon
      tilt.x += (target.x - tilt.x) * Math.min(1, 0.12 * dt);
      tilt.y += (target.y - tilt.y) * Math.min(1, 0.12 * dt);
      glow.x += (target.x - glow.x) * Math.min(1, 0.035 * dt);
      glow.y += (target.y - glow.y) * Math.min(1, 0.035 * dt);
      if (Math.abs(tilt.x - tilt.wx) > 0.001) writeVar("--hx", (tilt.wx = tilt.x));
      if (Math.abs(tilt.y - tilt.wy) > 0.001) writeVar("--hy", (tilt.wy = tilt.y));
      if (Math.abs(glow.x - glow.wx) > 0.001) writeVar("--gx", (glow.wx = glow.x));
      if (Math.abs(glow.y - glow.wy) > 0.001) writeVar("--gy", (glow.wy = glow.y));

      warp += (scrollP - warp) * Math.min(1, 0.08 * dt);
      if (warp < 0.0005) warp = 0;

      step(dt, now / 1000, !lite);
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
    /** toucher : les étoiles s'écartent pendant le contact */
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.on = true;
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
      // voie lactée : calculée par tranches, puis le canevas statique apparaît en fondu
      if (galaxyInit()) galaxyChunk();
    };
    const idleId = hasIdle ? window.requestIdleCallback(start, { timeout: 1200 }) : window.setTimeout(start, 300);

    return () => {
      if (hasIdle) {
        window.cancelIdleCallback(idleId);
        if (galIdle) window.cancelIdleCallback(galIdle);
      } else {
        window.clearTimeout(idleId);
      }
      window.clearTimeout(galTimer);
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

  return (
    <>
      <canvas ref={voieRef} aria-hidden="true" className="hero-tl-canvas hero-tl-canvas--voie" />
      <canvas ref={ref} aria-hidden="true" className="hero-tl-canvas" />
    </>
  );
}
