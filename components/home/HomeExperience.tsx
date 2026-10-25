"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LedField, loadLeds, type Mapping } from "@/components/home/led-field";

type ScAct = { el: HTMLElement; p: number; vp: number; live: boolean };
type ScApi = { destroy: () => void; layout: () => void; acts: ScAct[] };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// La photo de l'allée : 2720 x 1530.
const IMG_W = 2720;
const IMG_H = 1530;
// La vidéo portrait est le tiers central de la vidéo 16:9 (608 px sur 1920).
const PORTRAIT_X0 = ((1920 - 608) / 2 / 1920) * IMG_W;
const PORTRAIT_W = (608 / 1920) * IMG_W;
// Même seuil que l'affiche (<picture media="(max-aspect-ratio: 4/5)">).
const isPortrait = () => innerWidth / Math.max(innerHeight, 1) <= 0.8;

/*
 * Chronologie du pic (progression de l'acte épinglé, 0 à 1).
 * 0.00-0.10  la salle vide dans le noir, seule la brume du fond éclaire
 * 0.10       les néons se rallument (interrupteur, avec leur clignotement)
 * 0.16-0.46  la boucle du logo se dessine, puis la flèche, le $, le mot
 * 0.46-1.00  « Votre espace est libre. » (repère dans le HTML)
 */
const PEAK = {
  lightOn: 0.1,
  lightOff: 0.08,
  main: [0.16, 0.34] as const,
  barbs: [0.33, 0.38] as const,
  dollar: [0.37, 0.41] as const,
  word: [0.39, 0.46] as const,
  reducedLit: [0.04, 0.24] as const,
};

// Le logo du hero commence à s'effacer à 76 % de l'acte (sa ligne aussi :
// 0.3 + 0.7 x (1 - 0.343) = 0.76).
const HERO_FADE = 0.76;

// Allumage des néons : six paliers de 70 ms.
const FLICKER = [0, 0.55, 0.1, 0.85, 0.35, 1];
const FLICKER_MS = FLICKER.length * 70;

/**
 * Anime l'accueil : monte le moteur scrollcraft (copié tel quel dans
 * lib/scrollcraft) sur la racine, puis pilote ce qu'il ne fait pas : les
 * voyants vivants du hero, le logo au point de fuite, la rotation des objets
 * du rail, la ligne des étapes, le retour de la lumière et le dessin du logo.
 * Tout le contenu existe déjà dans le HTML serveur ; sans JavaScript, la page
 * reste complète et lisible.
 */
export default function HomeExperience({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fineMQ = matchMedia("(hover: hover) and (pointer: fine)");
    const coarse = matchMedia("(hover: none) and (pointer: coarse)").matches;

    let api: ScApi | null = null;
    let raf = 0;
    let dead = false;
    const cleanups: (() => void)[] = [];

    const q = <T extends Element = HTMLElement>(sel: string, from: ParentNode = root) =>
      from.querySelector<T>(sel);
    const qa = <T extends Element = HTMLElement>(sel: string, from: ParentNode = root) =>
      Array.from(from.querySelectorAll<T>(sel));

    const hero = q(".tl-hero");
    const range_ = q(".tl-range");
    const peak = q(".tl-peak");
    if (!hero || !range_ || !peak) return;

    // Mouvement réduit : moins de défilement épinglé. À régler avant le
    // montage, qui lit data-sc-span.
    if (reduce) {
      qa("[data-tl-span-reduced]").forEach((el) => {
        el.setAttribute("data-sc-span", el.getAttribute("data-tl-span-reduced") || "1.2");
      });
      // Le rail n'est plus épinglé : sans déplacement latéral, il devient une
      // grille dans le flux, où tous les objets se voient en défilant.
      range_.setAttribute("data-sc-act", "flow");
      range_.removeAttribute("data-sc-span");
      root.classList.add("tl-reduce");
    }

    // La vidéo portrait sert les écrans plus hauts que larges, quel que soit
    // l'appareil : une tablette à l'horizontale garde la vidéo 16:9.
    const video = q<HTMLVideoElement>("video[data-sc-scrub]", hero);
    const portrait = isPortrait();
    if (video && portrait) {
      const src = video.getAttribute("data-tl-src-portrait");
      if (src) video.setAttribute("data-sc-src", src);
    }

    // --- éléments -----------------------------------------------------------
    const heroStage = q("[data-sc-stage]", hero)!;
    const heroCanvas = q<HTMLCanvasElement>("[data-tl-leds='hero']", hero);
    const heroZone = q(".tl-hero__logo-zone", hero);
    const heroLogo = q("[data-tl-hero-logo]", hero);
    const heroMark = q("[data-tl-hero-mark]", hero);
    const heroVeil = q(".tl-hero__veil", hero);
    const heroHaze = q(".tl-hero__haze", hero);
    const heroCopy = q(".tl-hero__copy", hero);
    const heroScrim = q("[data-tl-scrim-hero]", hero);
    const heroLine = q(".tl-hero__line", hero);
    const heroLineScrim = q(".tl-hero__linescrim", hero);

    const rail = q("[data-tl-rail]", range_);
    const objs = qa("[data-tl-obj]", range_).map((fig) => ({
      fig,
      turn: q("[data-tl-turn]", fig),
      shadow: q("[data-tl-shadow]", fig),
    }));

    const stepsList = q("[data-tl-steps]");
    const steps = stepsList
      ? qa("[data-tl-step]", stepsList).map((li) => ({ li, node: q(".tl-step__node", li)! }))
      : [];

    const peakStage = q("[data-sc-stage]", peak)!;
    const dark = q("[data-tl-dark]", peak);
    const markMain = q<SVGPathElement>("[data-tl-mark-main]", peak);
    const markBarbs = q<SVGPathElement>("[data-tl-mark-barbs]", peak);
    const markDollar = q<SVGRectElement>("[data-tl-mark-dollar]", peak);
    const word = q("[data-tl-word]", peak);
    const glow = q("[data-tl-glow]", peak);
    const textB = q(".tl-peak__b", peak);
    const scrimB = q("[data-tl-scrim-b]", peak);

    // --- écritures uniquement quand la valeur change ------------------------
    const last = new Map<string, string>();
    const set = (key: string, el: Element | null, apply: (el: Element, v: string) => void, v: string) => {
      if (!el || last.get(key) === v) return;
      last.set(key, v);
      apply(el, v);
    };
    const style = (key: string, el: HTMLElement | null, prop: string, v: string) =>
      set(key, el, (e, val) => (e as HTMLElement).style.setProperty(prop, val), v);
    const attr = (key: string, el: Element | null, name: string, v: string) =>
      set(key, el, (e, val) => e.setAttribute(name, val), v);
    const cls = (key: string, el: Element | null, name: string, on: boolean) =>
      set(key, el, (e, val) => e.classList.toggle(name, val === "1"), on ? "1" : "0");

    // --- pointeur (souris seulement), lissé ---------------------------------
    let tmx = 0, tmy = 0, mx = 0, my = 0;
    let cx = -1, cy = -1; // position brute, pour les voyants
    const pointerOK = !reduce && fineMQ.matches;
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tmx = (e.clientX / innerWidth) * 2 - 1;
      tmy = (e.clientY / innerHeight) * 2 - 1;
      cx = e.clientX;
      cy = e.clientY;
      kick();
    };
    const onLeave = () => {
      cx = -1;
      cy = -1;
    };
    if (pointerOK) {
      addEventListener("pointermove", onPointer, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        removeEventListener("pointermove", onPointer);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      });
    }

    // --- voyants du hero ---------------------------------------------------------
    const heroField = heroCanvas ? new LedField(heroCanvas) : null;
    if (heroField) heroField.reduced = reduce;
    let fieldLoading = false;
    const loadField = () => {
      if (fieldLoading || !heroField) return;
      fieldLoading = true;
      loadLeds()
        .then(({ json, sprite }) => {
          if (dead) return;
          heroField.setData(json, sprite);
          heroField.resize();
          root.classList.add("tl-leds-ready");
          kick();
        })
        .catch(() => {
          fieldLoading = false;
        });
    };

    // Image -> écran pour un plan « cover » de la taille de la scène.
    const coverMap = (sw: number, sh: number, x0: number, w: number, h: number): Mapping => {
      const k = Math.max(sw / w, sh / h);
      return { k, ox: (sw - w * k) / 2 - x0 * k, oy: (sh - h * k) / 2 };
    };

    // --- la lumière (interrupteur, avec son clignotement) -------------------------
    let lightOn = false;
    let lightT = -1e9;
    let lightLevel = 0;
    let lightFrom = 0; // niveau au moment où l'on éteint (on peut remonter en plein clignotement)
    const litLevel = (p: number, now: number) => {
      if (reduce) return smooth(range(p, PEAK.reducedLit[0], PEAK.reducedLit[1]));
      const want = lightOn ? p >= PEAK.lightOff : p >= PEAK.lightOn;
      if (want !== lightOn) {
        lightOn = want;
        lightT = now;
        lightFrom = lightLevel;
      }
      const dt = now - lightT;
      lightLevel = lightOn
        ? dt >= FLICKER_MS
          ? 1
          : FLICKER[Math.floor(dt / 70)]
        : lightFrom * Math.max(0, 1 - dt / 220);
      return lightLevel;
    };

    // État de départ quand JavaScript tourne : la salle dans le noir, le logo
    // pas encore dessiné, les étapes éteintes jusqu'à ce que la ligne les
    // atteigne. (Sans JavaScript, le HTML montre l'état final.)
    const arm = () => {
      root.classList.add("tl-armed");
      if (reduce) return;
      markMain?.setAttribute("stroke-dashoffset", "1");
      markBarbs?.setAttribute("stroke-dashoffset", "1");
      markDollar?.setAttribute("opacity", "0");
    };

    // --- rail : garder le lien du bout visible au clavier ---------------------
    const onRailFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !rail || !rail.contains(el) || reduce) return;
      const act = api?.acts.find((a) => a.el === range_);
      if (!act) return;
      const over = rail.scrollWidth - innerWidth;
      if (over <= 0) return;
      const r = el.getBoundingClientRect();
      const railX = r.left - rail.getBoundingClientRect().left;
      const want = clamp01((railX + r.width / 2 - innerWidth / 2) / (over * 1.02));
      const top = range_.getBoundingClientRect().top + scrollY;
      const travel = Math.max(range_.offsetHeight - innerHeight, 1);
      scrollTo({ top: top + want * travel, behavior: "instant" as ScrollBehavior });
    };
    root.addEventListener("focusin", onRailFocus);
    cleanups.push(() => root.removeEventListener("focusin", onRailFocus));

    // Un champ qui reçoit le focus dans un bloc pas encore apparu le fait
    // apparaître tout de suite (sinon le focus se pose sur de l'invisible).
    const onFocusReveal = (e: FocusEvent) => {
      const box = (e.target as Element | null)?.closest?.("[data-sc-in]");
      if (!box || !root.contains(box) || box.classList.contains("sc-in")) return;
      box.classList.add("sc-in");
      if (box.hasAttribute("data-sc-stagger")) {
        Array.from(box.children).forEach((kid) => kid.classList.add("sc-in"));
      }
    };
    root.addEventListener("focusin", onFocusReveal);
    cleanups.push(() => root.removeEventListener("focusin", onFocusReveal));

    // --- l'image -----------------------------------------------------------------
    let lastLed = 0;
    const ledInterval = coarse ? 1000 / 30 : 0;

    function frameFn(now: number) {
      raf = 0;
      if (dead || !api) return;
      const vw = innerWidth;
      const vh = innerHeight;
      const acts = api.acts;
      const heroA = acts.find((a) => a.el === hero);
      const rangeA = acts.find((a) => a.el === range_);
      const peakA = acts.find((a) => a.el === peak);
      let busy = false; // une animation dans le temps est en cours

      mx += (tmx - mx) * 0.08;
      my += (tmy - my) * 0.08;
      if (Math.abs(tmx - mx) > 0.001 || Math.abs(tmy - my) > 0.001) busy = true;

      const ledTick = now - lastLed >= ledInterval;
      if (ledTick) lastLed = now;

      // ---- mesures (toutes avant la première écriture) ------------------------
      const heroRect = hero!.getBoundingClientRect();
      const heroOn = heroRect.bottom > 0 && heroRect.top < vh;
      const heroStageRect = heroOn ? heroStage.getBoundingClientRect() : null;
      const zoneRect = heroOn && heroZone ? heroZone.getBoundingClientRect() : null;
      const objRects = rangeA && rangeA.live && !reduce ? objs.map((o) => o.fig.getBoundingClientRect()) : null;
      const stepsRect = stepsList && !reduce ? stepsList.getBoundingClientRect() : null;
      const nodeRects =
        stepsRect && stepsRect.bottom > -80 && stepsRect.top < vh + 80
          ? steps.map((s) => s.node.getBoundingClientRect())
          : null;
      const peakRect = peak!.getBoundingClientRect();
      const peakOn = peakRect.bottom > 0 && peakRect.top < vh;

      // ---- 1. le hero ------------------------------------------------------------
      if (heroA && heroOn && heroStageRect) {
        const e = reduce ? 0 : smooth(heroA.p);
        // Le logo attend au fond de l'allée : la caméra s'en approche.
        if (heroLogo && zoneRect) {
          // centre de l'image du logo hors transformations (offsetTop les
          // ignore) : c'est elle qui va vers le point de fuite
          const markCy =
            zoneRect.top +
            heroLogo.offsetTop +
            (heroMark ? heroMark.offsetTop + heroMark.offsetHeight / 2 : heroLogo.offsetHeight / 2);
          const toVP = vh / 2 - markCy;
          const ty = e * toVP * 0.55 + (pointerOK ? my * -4 : 0);
          const tx = pointerOK ? mx * -6 : 0;
          // moins d'agrandissement sur un écran étroit : la ligne doit tenir
          const grow = vw < 861 ? 0.3 : 0.55;
          style("hl", heroLogo, "transform", `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${(1 + grow * e).toFixed(4)})`);
        }
        // Puis le logo s'efface à la fin de l'acte, avec la courbe des repères
        // du moteur (fondu et 2,4vh de descente sur le dernier quart) : le même
        // geste que sa ligne (repère « 0.3 1 0.25 0.343 ») et que les textes
        // des scènes suivantes.
        const fade = heroA.p <= HERO_FADE ? 1 : smooth(1 - (heroA.p - HERO_FADE) / (1 - HERO_FADE));
        style("hfo", heroMark, "opacity", fade.toFixed(3));
        style("hft", heroMark, "transform", reduce ? "none" : `translate3d(0,${((1 - fade) * 2.4).toFixed(2)}vh,0)`);
        style("hv", heroVeil, "opacity", (0.26 * (1 - e)).toFixed(3));
        style("hz", heroHaze, "transform", `translate3d(${(pointerOK ? mx * -14 : 0).toFixed(2)}px,${(e * -36).toFixed(2)}px,0) scale(${(1 + e * 0.18).toFixed(4)})`);
        // le voile de contraste suit le texte qu'il protège
        const co = heroCopy ? parseFloat(heroCopy.style.opacity || "1") : 1;
        style("hs", heroScrim, "opacity", co.toFixed(3));
        const lo = heroLine ? parseFloat(heroLine.style.opacity || "0") : 0;
        style("hls", heroLineScrim, "opacity", lo.toFixed(3));

        // Voyants : seulement au repos, posés sur l'image 0 de la vidéo.
        const o = 1 - smooth(range(heroA.vp, 0.004, 0.035));
        if (heroField?.ready && heroCanvas) {
          if (o > 0.002 && !reduce) {
            const r = heroStageRect;
            heroField.setMapping(
              portrait
                ? coverMap(r.width, r.height, PORTRAIT_X0, PORTRAIT_W, IMG_H)
                : coverMap(r.width, r.height, 0, IMG_W, IMG_H)
            );
            if (pointerOK && cx >= 0 && cy >= r.top && cy <= r.bottom) heroField.setPointer(cx - r.left, cy - r.top);
            else heroField.setPointer(null);
            if (ledTick) heroField.render(now, o);
            busy = true;
          } else if (last.get("hfc") !== "0") {
            heroField.clear();
          }
          last.set("hfc", o > 0.002 && !reduce ? "1" : "0");
        }
        attr("hvs", heroStage, "data-sc-verify-state", `${e.toFixed(3)}|${o.toFixed(2)}`);
      }

      // ---- 2. le rail ------------------------------------------------------------
      if (objRects) {
        for (let i = 0; i < objs.length; i++) {
          const o = objs[i];
          const r = objRects[i];
          if (r.right < -200 || r.left > vw + 200) continue;
          const d = Math.max(-1.3, Math.min(1.3, (r.left + r.width / 2 - vw / 2) / (vw * 0.5)));
          style(`ot${i}`, o.turn, "transform", `rotateY(${(-15 * d).toFixed(2)}deg)`);
          style(
            `os${i}`,
            o.shadow,
            "transform",
            `translate3d(${(d * -22).toFixed(1)}px,0,0) scaleX(${(1 - 0.2 * Math.abs(d)).toFixed(3)})`
          );
          // l'objet arrive : il se pose en entrant, au lieu d'apparaître d'un bloc
          const arrive = d > 0.62 ? 0.55 + 0.45 * smooth((1.28 - d) / 0.66) : 1;
          style(`oo${i}`, o.fig, "opacity", arrive.toFixed(3));
        }
      }

      // ---- 3. les étapes ------------------------------------------------------------
      // Une position le long de la ligne, en « numéros d'étape » : 1.5 = à
      // mi-chemin entre la 2e et la 3e. En rangée (bureau), elle avance pendant
      // que la rangée monte de 80 % à 38 % de l'écran ; en colonne (téléphone),
      // elle suit un curseur fixe à 62 % de la hauteur.
      if (nodeRects && nodeRects.length > 1) {
        const n = nodeRects.length;
        const ys = nodeRects.map((r) => r.top + r.height / 2);
        let P: number;
        if (Math.abs(ys[n - 1] - ys[0]) < 8) {
          P = ((vh * 0.8 - ys[0]) / (vh * 0.42)) * (n - 1);
        } else {
          const cur = vh * 0.62;
          if (cur <= ys[0]) P = (cur - ys[0]) / Math.max(ys[1] - ys[0], 1);
          else if (cur >= ys[n - 1]) P = n - 1;
          else {
            let i = 0;
            while (i < n - 2 && cur > ys[i + 1]) i++;
            P = i + (cur - ys[i]) / Math.max(ys[i + 1] - ys[i], 1);
          }
        }
        for (let i = 0; i < n; i++) {
          cls(`so${i}`, steps[i].li, "is-on", P >= i - 0.02);
          style(`sf${i}`, steps[i].li, "--tl-seg", clamp01(P - i).toFixed(3));
        }
      }

      // ---- 5. le pic -----------------------------------------------------------------
      if (peakA && peakOn) {
        const p = peakA.p;
        // poussée lente de la caméra + léger parallaxe du pointeur
        const push = reduce ? 1 : 1 + 0.045 * p;
        const px = pointerOK ? mx * -8 : 0;
        const py = pointerOK ? my * -5 : 0;
        style("pp", peakStage, "--tl-push", push.toFixed(4));
        style("ppx", peakStage, "--tl-px", `${px.toFixed(2)}px`);
        style("ppy", peakStage, "--tl-py", `${py.toFixed(2)}px`);

        const L = litLevel(p, now);
        style("dk", dark, "opacity", (1 - L).toFixed(3));
        if (!reduce && lightOn && now - lightT < FLICKER_MS + 40) busy = true;
        if (!reduce && !lightOn && L > 0) busy = true;

        // le logo se dessine dans la salle éclairée
        if (!reduce) {
          const mm = smooth(range(p, PEAK.main[0], PEAK.main[1]));
          const bb = smooth(range(p, PEAK.barbs[0], PEAK.barbs[1]));
          const dd = smooth(range(p, PEAK.dollar[0], PEAK.dollar[1]));
          const ww = smooth(range(p, PEAK.word[0], PEAK.word[1]));
          attr("mm", markMain, "stroke-dashoffset", (1 - mm).toFixed(4));
          attr("mb", markBarbs, "stroke-dashoffset", (1 - bb).toFixed(4));
          attr("md", markDollar, "opacity", dd.toFixed(3));
          style("mw", word, "opacity", ww.toFixed(3));
          style("mg", glow, "opacity", (0.25 + 0.75 * Math.max(mm * 0.6, ww)).toFixed(3));
        }
        // le voile de contraste suit son texte
        style("sb", scrimB, "opacity", (textB ? parseFloat(textB.style.opacity || "0") : 0).toFixed(3));
        attr("pvs", peakStage, "data-sc-verify-state", `${p.toFixed(3)}|${L.toFixed(2)}|${lightOn ? 1 : 0}`);
      }

      // Les voyants et le clignotement des néons vivent dans le temps : la
      // boucle continue tant qu'une scène qui en a est à l'écran.
      if (busy) kick();
    }

    function kick() {
      if (!raf && !dead && api) raf = requestAnimationFrame(frameFn);
    }

    // Enregistrés APRÈS le montage du moteur : son image de défilement passe
    // alors avant la nôtre, et la progression lue ici est celle de l'image.
    const onScroll = () => kick();
    const onResize = () => {
      last.clear();
      heroField?.resize();
      kick();
    };
    // Le bouton du pic n'apparaît qu'à la fin de l'acte épinglé. Au clavier, le
    // moteur centre l'élément qui reçoit le focus, mais dans une scène collante
    // ce défilement ne change rien et le bouton reste invisible : on amène
    // l'acte à 80 %, où il est pleinement là. Écouté sur window APRÈS le
    // montage du moteur, pour passer après son propre défilement.
    const onPeakFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !textB || !textB.contains(el)) return;
      const top = peak.getBoundingClientRect().top + scrollY;
      const travel = Math.max(peak.offsetHeight - innerHeight, 1);
      scrollTo({ top: top + 0.8 * travel, behavior: "instant" as ScrollBehavior });
    };
    const listen = () => {
      addEventListener("scroll", onScroll, { passive: true });
      addEventListener("resize", onResize, { passive: true });
      addEventListener("focusin", onPeakFocus);
      cleanups.push(() => {
        removeEventListener("scroll", onScroll);
        removeEventListener("resize", onResize);
        removeEventListener("focusin", onPeakFocus);
      });
      // Le moteur mesure la position des actes une fois (et au redimensionnement).
      // Si le contenu change de hauteur sans redimensionnement (un onglet plus
      // court, une image tardive), les actes plus bas seraient décalés : on le
      // laisse remesurer.
      if (typeof ResizeObserver === "function") {
        let lastH = -1;
        let roRaf = 0;
        const ro = new ResizeObserver((entries) => {
          const h = Math.round(entries[0]?.contentRect.height ?? 0);
          if (h === lastH) return;
          const first = lastH < 0;
          lastH = h;
          if (first || roRaf) return;
          roRaf = requestAnimationFrame(() => {
            roRaf = 0;
            if (dead || !api) return;
            api.layout();
            last.clear();
            kick();
          });
        });
        ro.observe(root);
        cleanups.push(() => {
          ro.disconnect();
          if (roRaf) cancelAnimationFrame(roRaf);
        });
      }
    };

    import("@/lib/scrollcraft/scrollcraft.js")
      .then(() => {
        if (dead) return;
        if (!window.ScrollCraft) {
          root.classList.add("tl-fallback");
          return;
        }
        try {
          api = window.ScrollCraft.mount(root) as unknown as ScApi;
          listen();
          root.classList.add("tl-live");
          arm();
          // Les voyants passent après le premier affichage : ils ne doivent
          // rien retarder de ce que le visiteur voit en arrivant.
          if (typeof window.requestIdleCallback === "function") {
            window.requestIdleCallback(loadField, { timeout: 1500 });
          } else {
            setTimeout(loadField, 600);
          }
          document.fonts?.ready.then(() => {
            last.clear();
            kick();
          });
          kick();
        } catch {
          root.classList.add("tl-fallback");
        }
      })
      .catch(() => root.classList.add("tl-fallback"));

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
      api?.destroy();
      root.classList.remove("tl-live", "tl-reduce", "tl-fallback", "tl-armed", "tl-leds-ready");
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
