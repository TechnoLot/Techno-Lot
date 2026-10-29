"use client";

import { useEffect, useRef } from "react";
import { CONSTELLATIONS, ETOILES, FIGURES } from "@/components/site/ciel/ciel";
import {
  CLASSES,
  FRICTION,
  GREEN,
  N,
  PUSH,
  SPRING,
  STAR_RGB,
  clamp,
  creerEtoiles,
  creerPeintre,
  peindreEtoiles,
  peindrePoussiere,
  placerEtoiles,
  rayonsPointeur,
  type Dessous,
} from "@/components/site/ciel/etoiles";

/**
 * Effets du héros (client) : le vrai ciel de Montréal en deux canvas (poussière
 * d'étoiles faibles statique, étoiles animées), parallaxe de la lueur d'horizon,
 * inclinaison / reflet / glitch du logo et épinglage « hyperespace » adouci.
 * Le texte et le décor CSS sont rendus côté serveur (Hero.tsx) : si ce code ne
 * s'exécute pas, rien n'est caché. Ce composant ne fait que dessiner dans ses canvas
 * et poser des variables CSS et des attributs data-* sur la section [data-hero-tl] :
 *   --hx / --hy  pointeur lissé (-1..1)       → inclinaison et reflet du logo
 *   --gx / --gy  pointeur très lissé (-1..1)  → parallaxe lente de la lueur d'horizon
 *   --hp         progression de l'épinglage (0..1) → recul du logo et des titres
 *   --hero-logo-url, data-fx  image du logo pour les calques masqués (reflet, glitch)
 *   data-glitch (sur le logo), data-pointer, data-warp, data-paused
 *   data-lite  ordinateur ou téléphone lent : canevas en 1x, moins de poussière, sans scintillation,
 *              boucle arrêtée quand plus rien ne bouge
 * Étoiles : catalogue Yale Bright Star projeté depuis Montréal (components/site/ciel/ciel.ts,
 * généré par scripts/generer-ciel.mjs) ; couleurs, cadrage, poussière et dessin des étoiles
 * sont partagés avec les pages intérieures (components/site/ciel/etoiles.ts). Elles
 * restent en place, s'écartent doucement du curseur et reviennent chez elles par un
 * ressort ; les traits de la Grande Ourse et de Cassiopée s'éclairent quand le curseur
 * s'en approche.
 */

/** Mode allégé : en dessous d'environ 40 images/s en moyenne, l'effet se simplifie. */
const SLOW_FRAME_MS = 25;
const PERF_SAMPLE = 90;
/** Mode allégé, arrêt au repos : écart du pointeur lissé à sa cible sous lequel il est arrivé */
const REPOS_LISSE = 1e-6;

/** Traits des figures : opacité au repos, éclairés, distance d'éclairage (px) */
const LINE_REST = 0.22;
const LINE_LIT = 0.5;
const LINE_NEAR = 120;
/** nombre de traits au plus (segments des chaînes de FIGURES) */
const MAX_TRAITS = FIGURES.reduce((n, f) => n + f.length - 1, 0);

export function HeroFx() {
  const fondRef = useRef<HTMLCanvasElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const fond = fondRef.current;
    const root = canvas?.closest<HTMLElement>("[data-hero-tl]");
    const ctx = canvas?.getContext("2d");
    const fctx = fond?.getContext("2d");
    if (!canvas || !fond || !root || !ctx || !fctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let lite = false;

    let w = 0;
    let h = 0;
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

    const etoiles = creerEtoiles();
    const { homeX, homeY, px, py, vx, vy, fade, phase, freq, tau, tw, cls } = etoiles;
    /** profondeur (hyperespace) et vitesse de fuite, propres à l'accueil */
    const depth = new Float32Array(N);
    const speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      depth[i] = 0.35 + 0.65 * clamp((6 - ETOILES[i * 4 + 2]) / 6, 0, 1);
    }

    /** éclairage courant des traits, par constellation */
    const lit = new Float32Array(CONSTELLATIONS.length).fill(LINE_REST);
    const trailStyles: string[] = new Array(CLASSES).fill("");
    let trailKey = -1;

    /** dessin des étoiles : chemins gardés d'une image à l'autre, image sautée si rien ne change */
    const peintre = creerPeintre();
    /** traits de l'image en cours et de l'image affichée : alpha, x0, y0, x1, y1 */
    const traits = new Float64Array(MAX_TRAITS * 5);
    const traitsPeints = new Float64Array(MAX_TRAITS * 5);
    let nTraits = 0;
    let nTraitsPeints = 0;
    let traitsOn = false;
    let traineesPeintes = false;
    /** chemin de chaque trait et ses deux bouts */
    const cheminsTraits: (Path2D | null)[] = new Array(MAX_TRAITS).fill(null);
    const boutsTraits = new Float64Array(MAX_TRAITS * 4);

    /* ───────────── Poussière d'étoiles faibles (canevas statique) ───────────── */

    const hasIdle = typeof window.requestIdleCallback === "function";

    /** Poussière d'étoiles faibles, répartie uniformément (graine fixe : même ciel à chaque visite). */
    function paintFond() {
      peindrePoussiere(fctx!, fond!, dpr, w, h, lite);
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
      for (const c of [canvas!, fond!]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      peintre.pret = false;
      ({ pushR, growR } = rayonsPointeur(w, h));
      placerEtoiles(etoiles, w, h);
      paintFond();
    }

    /* ───────────── Étoiles animées ───────────── */

    /** Fait avancer les étoiles et les traits ; rend vrai si quelque chose a bougé */
    function step(dt: number, t: number, twinkle: boolean) {
      const cx = w / 2;
      const cy = h * 0.45;
      const R = pushR;
      const R2 = R * R;
      const fr = Math.pow(FRICTION, dt);
      // pendant l'hyperespace les étoiles filent ; sous 0,05 le ressort les ramène chez elles
      const spring = warp < 0.05;
      const margin = 30;
      let bouge = false;

      for (let i = 0; i < N; i++) {
        let x = px[i];
        let y = py[i];
        const x0 = x;
        const y0 = y;
        const vx0 = vx[i];
        const vy0 = vy[i];
        const fade0 = fade[i];
        const tw0 = tw[i];
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
        if (px[i] !== x0 || py[i] !== y0 || vx[i] !== vx0 || vy[i] !== vy0 || fade[i] !== fade0 || tw[i] !== tw0) {
          bouge = true;
        }
      }

      // traits : s'éclairent quand le pointeur approche d'une étoile de la constellation
      for (let c = 0; c < CONSTELLATIONS.length; c++) {
        const goal = pointer.on && pointerNear(c) ? LINE_LIT : LINE_REST;
        const l0 = lit[c];
        lit[c] += (goal - lit[c]) * Math.min(1, 0.06 * dt);
        if (lit[c] !== l0) bouge = true;
      }
      return bouge;
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

    /** traits des deux constellations : raccourcis aux deux bouts, estompés près du texte */
    function calculerTraits() {
      nTraits = 0;
      const lineFade = Math.max(0, 1 - 3 * warp);
      traitsOn = lineFade > 0.01;
      if (!traitsOn) return;
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
            const t = nTraits++ * 5;
            traits[t] = alpha;
            traits[t + 1] = ax + dx * g;
            traits[t + 2] = ay + dy * g;
            traits[t + 3] = ax + dx * (1 - g);
            traits[t + 4] = ay + dy * (1 - g);
          }
        }
      }
    }

    /** traits identiques à ceux de l'image affichée ? */
    function traitsInchanges() {
      if (nTraits !== nTraitsPeints) return false;
      for (let k = 0; k < nTraits * 5; k++) if (traits[k] !== traitsPeints[k]) return false;
      return true;
    }

    /** chemin du trait k (Path2D : mêmes pixels que le chemin du contexte), refait si ses bouts changent */
    function cheminTrait(k: number) {
      const t = k * 5;
      const b = k * 4;
      let p = cheminsTraits[k];
      if (
        !p ||
        boutsTraits[b] !== traits[t + 1] ||
        boutsTraits[b + 1] !== traits[t + 2] ||
        boutsTraits[b + 2] !== traits[t + 3] ||
        boutsTraits[b + 3] !== traits[t + 4]
      ) {
        p = new Path2D();
        p.moveTo(traits[t + 1], traits[t + 2]);
        p.lineTo(traits[t + 3], traits[t + 4]);
        cheminsTraits[k] = p;
        for (let j = 0; j < 4; j++) boutsTraits[b + j] = traits[t + 1 + j];
      }
      return p;
    }

    function tracerTraits(c2: CanvasRenderingContext2D) {
      if (!traitsOn) return;
      c2.lineWidth = 1;
      c2.lineCap = "butt";
      c2.strokeStyle = "rgb(94, 203, 51)";
      for (let k = 0; k < nTraits; k++) {
        c2.globalAlpha = traits[k * 5];
        c2.stroke(cheminTrait(k));
      }
      c2.globalAlpha = 1;
    }

    /** Sous les étoiles : traits, puis traînées de l'hyperespace */
    const dessous: Dessous = {
      change: false,
      dessiner(c2) {
        tracerTraits(c2);
        tracerTrainees(c2);
      },
    };

    /** Dessine l'image ; rend faux si elle était déjà à l'écran (rien n'a changé) */
    function draw() {
      if (!w) return false;
      calculerTraits();
      // traînées affichées ou à effacer, traits modifiés : l'image change
      dessous.change = warp > 0.01 || traineesPeintes || !traitsInchanges();
      const peint = peindreEtoiles(ctx!, peintre, etoiles, w, h, pointer, growR, dessous);
      if (peint) {
        traitsPeints.set(traits);
        nTraitsPeints = nTraits;
        traineesPeintes = warp > 0.01;
      }
      return peint;
    }

    /** traînées de l'hyperespace : courtes, discrètes, qui glissent vers le vert de la marque */
    function tracerTrainees(c2: CanvasRenderingContext2D) {
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
    }

    /** mode allégé : boucle arrêtée parce que plus rien ne bouge (voir loop) */
    let repos = false;

    /** contexte perdu puis rendu (GPU) : canevas vidé, image complète à la prochaine image */
    const onRestored = () => {
      peintre.pret = false;
      // boucle arrêtée au repos : relancée pour redessiner à l'image suivante, comme avant
      if (repos) wake();
    };
    canvas.addEventListener("contextrestored", onRestored);

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
      return () => {
        ro.disconnect();
        canvas.removeEventListener("contextrestored", onRestored);
      };
    }

    /* ───────────── Boucle d'animation ───────────── */

    let raf = 0;
    let last = 0;
    let started = false;
    let inView = true;
    let perfFrames = 0;
    let perfSum = 0;
    /** dernier intervalle entre deux images (ms) : reprise au même rythme après un arrêt au repos */
    let cadence = 0;
    /** défilement à mesurer (voir onScroll) */
    let scrollQueued = false;

    const canRun = () => started && inView && !document.hidden;
    /** pointeur lissé arrivé : plus aucune écriture de --hx, --hy, --gx, --gy à venir */
    const lisse = () =>
      Math.abs(target.x - tilt.x) <= REPOS_LISSE &&
      Math.abs(target.y - tilt.y) <= REPOS_LISSE &&
      Math.abs(target.x - glow.x) <= REPOS_LISSE &&
      Math.abs(target.y - glow.y) <= REPOS_LISSE &&
      Math.abs(target.x - tilt.wx) <= 0.001 &&
      Math.abs(target.y - tilt.wy) <= 0.001 &&
      Math.abs(target.x - glow.wx) <= 0.001 &&
      Math.abs(target.y - glow.wy) <= 0.001;

    const writeVar = (name: string, value: number) => root.style.setProperty(name, value.toFixed(3));

    /**
     * Appareil lent : canevas en 1x, moins de poussière, sans scintillation, décor CSS allégé (data-lite),
     * boucle arrêtée au repos.
     */
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
      // défilement en attente : la position est lue avant toute écriture de cette image et
      // appliquée à la fin (l'hyperespace en tient compte à l'image suivante, comme avant)
      const p = scrollQueued ? lirePosition() : -1;
      if (!canRun()) {
        if (p >= 0) appliquerPosition(p);
        return;
      }
      // reprise après un arrêt au repos : même intervalle qu'avant l'arrêt, comme si la boucle avait continué
      if (repos) {
        repos = false;
        last = now - cadence;
      }
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
      if (last) cadence = now - last;
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

      const bouge = step(dt, now / 1000, !lite);
      const peint = draw();
      if (p >= 0) appliquerPosition(p);
      // Mode allégé (sans scintillation) : quand plus rien ne bouge, les images suivantes seraient
      // identiques ; la boucle s'arrête jusqu'au prochain pointeur, défilement ou retour à l'écran.
      if (lite && !bouge && !peint && warp === 0 && scrollP === 0 && lisse()) {
        repos = true;
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function wake() {
      if (!raf && canRun()) {
        if (!repos) last = 0;
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
      // retour des étoiles et du pointeur lissé (boucle arrêtée au repos en mode allégé)
      wake();
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
      if (e.pointerType !== "mouse") {
        pointer.on = false;
        wake();
      }
    };

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("pointerdown", onPointerDown, { passive: true });
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);

    /* ───────────── Défilement : épinglage et hyperespace ───────────── */

    let writtenP = -1;
    /** Lecture de la position du héros et du canevas (aucune écriture) ; rend la progression de l'épinglage */
    const lirePosition = () => {
      scrollQueued = false;
      const r = root.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      const c = canvas.getBoundingClientRect();
      box.left = c.left;
      box.top = c.top;
      return range > 1 ? clamp(-r.top / range, 0, 1) : 0;
    };
    /** Écritures qui suivent la lecture : --hp et data-warp */
    const appliquerPosition = (p: number) => {
      scrollP = p;
      if (Math.abs(p - writtenP) > 0.0005 || (p === 0 && writtenP !== 0)) {
        writtenP = p;
        root.style.setProperty("--hp", p.toFixed(4));
      }
      if (p > 0.62) root.dataset.warp = "1";
      else delete root.dataset.warp;
    };
    const measure = () => {
      appliquerPosition(lirePosition());
      wake();
    };
    /**
     * Mesure demandée : boucle en cours, elle lit la position au début de sa prochaine image,
     * avant toute écriture ; sinon, une image dédiée (qui passe avant la boucle si celle-ci
     * repart ensuite).
     */
    const demanderMesure = () => {
      if (scrollQueued) return;
      scrollQueued = true;
      if (!raf) {
        requestAnimationFrame(() => {
          if (scrollQueued) measure();
        });
      }
    };
    /** défilement : aucune mesure tant que le héros est hors écran */
    const onScroll = () => {
      if (inView) demanderMesure();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();

    /* ───────────── Pause hors écran / onglet caché ───────────── */

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      // entrée ou sortie de l'écran : une mesure (le défilement hors écran n'en fait plus) ;
      // à l'entrée, elle passe avant la boucle relancée, comme la mesure du dernier défilement
      demanderMesure();
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
      // boucle arrêtée au repos (mode allégé) : relancée, le dessin vient à l'image suivante comme avant
      if (repos && canRun()) wake();
      else if (!raf) draw();
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
      window.clearTimeout(glitchTimer);
      window.clearTimeout(glitchOff);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("contextrestored", onRestored);
      img?.removeEventListener("load", setLogoUrl);
      logo?.removeEventListener("pointerenter", glitch);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <canvas ref={fondRef} aria-hidden="true" className="hero-tl-canvas hero-tl-canvas--fond" />
      <canvas ref={ref} aria-hidden="true" className="hero-tl-canvas" />
    </>
  );
}
