"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LedField, loadLeds, type Band, type Mapping } from "@/components/home/led-field";

type ScAct = { el: HTMLElement; p: number; vp: number; live: boolean };
type ScApi = { destroy: () => void; acts: ScAct[] };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// La photo de l'allée (et la salle vide) : 2720 x 1530.
const IMG_W = 2720;
const IMG_H = 1530;
// La vidéo portrait est le tiers central de la vidéo 16:9 (608 px sur 1920).
const PORTRAIT_X0 = ((1920 - 608) / 2 / 1920) * IMG_W;
const PORTRAIT_W = (608 / 1920) * IMG_W;
// Même seuil que l'affiche (<picture media="(max-aspect-ratio: 4/5)">).
const isPortrait = () => innerWidth / Math.max(innerHeight, 1) <= 0.8;

/*
 * Chronologie du pic (progression de l'acte épinglé, 0 à 1).
 * 0.00-0.12  l'allée vivante, posée (le texte A arrive)
 * 0.12-0.52  mise hors tension, baie par baie, de la plus proche à la plus
 *            lointaine, en alternant gauche et droite
 * 0.50-0.58  le reste de l'allée s'assombrit ; seule la brume du fond reste
 * 0.58-0.62  le noir (silence voulu)
 * 0.62       la lumière revient (interrupteur, avec son clignotement)
 * 0.66-0.83  la boucle du logo se dessine, puis la flèche, le $, le mot
 * 0.80-1.00  « Votre espace est libre. »
 */
const PEAK = {
  wave: [0.12, 0.5] as const,
  bandDur: 0.07,
  spread: 0.035,
  dim: [0.5, 0.58] as const,
  lightOn: 0.62,
  lightOff: 0.6,
  main: [0.66, 0.76] as const,
  barbs: [0.755, 0.785] as const,
  dollar: [0.775, 0.8] as const,
  word: [0.785, 0.83] as const,
  reducedLit: [0.36, 0.56] as const,
};

// Les baies, en bandes verticales de la photo (pixels de l'image), de la plus
// proche à la plus lointaine. Gauche : du bord vers le point de fuite ;
// droite : idem en miroir. Le milieu (1300-1440) est la brume du fond.
const LEFT = [0, 470, 700, 830, 940, 1010, 1100, 1190, 1300];
const RIGHT = [2720, 2300, 1985, 1810, 1700, 1640, 1580, 1520, 1440];
const BANDS: Band[] = (() => {
  const out: Band[] = [];
  const n = (LEFT.length - 1) * 2;
  const step = (PEAK.wave[1] - PEAK.wave[0]) / (n - 1);
  for (let i = 0; i < LEFT.length - 1; i++) {
    out.push({ x0: LEFT[i], x1: LEFT[i + 1], start: PEAK.wave[0] + 2 * i * step });
    out.push({ x0: RIGHT[i + 1], x1: RIGHT[i], start: PEAK.wave[0] + (2 * i + 1) * step });
  }
  // Le milieu de l'allée (plancher et plafond au fond) s'éteint en dernier ;
  // seule la brume, protégée plus bas, garde sa lumière.
  out.push({ x0: LEFT[LEFT.length - 1], x1: RIGHT[RIGHT.length - 1], start: PEAK.wave[1] + 0.02 });
  return out;
})();
/**
 * Recale la vague sur les baies visibles. Sur un écran en portrait, la photo
 * est recadrée au centre : les baies proches sont hors champ, et la vague
 * passerait la moitié de l'acte sur du vide. Les baies hors champ s'éteignent
 * tout de suite ; les visibles se partagent toute la vague.
 */
function timeBands(xL: number, xR: number): Band[] {
  const n = BANDS.length - 1; // le milieu garde sa place, après la vague
  const seen = BANDS.slice(0, n).map((b) => {
    const o = Math.min(b.x1, xR) - Math.max(b.x0, xL);
    return o > (b.x1 - b.x0) * 0.3;
  });
  const count = seen.filter(Boolean).length;
  if (count === n || count < 2) return BANDS;
  const step = (PEAK.wave[1] - PEAK.wave[0]) / (count - 1);
  let k = 0;
  return BANDS.map((b, i) => {
    if (i === n) return b;
    if (!seen[i]) return { ...b, start: PEAK.wave[0] - 0.08 };
    return { ...b, start: PEAK.wave[0] + step * k++ };
  });
}
// Centre de la brume au fond de l'allée (pixels de l'image).
const HAZE = { x: 1372, y: 742, r: 300 };

// Allumage des néons : six paliers de 70 ms.
const FLICKER = [0, 0.55, 0.1, 0.85, 0.35, 1];
const FLICKER_MS = FLICKER.length * 70;

/**
 * Anime l'accueil : monte le moteur scrollcraft (copié tel quel dans
 * lib/scrollcraft) sur la racine, puis pilote ce qu'il ne fait pas : les
 * voyants vivants, le logo au point de fuite, la rotation des objets du rail,
 * la mise hors tension de l'allée, le retour de la lumière et le dessin du
 * logo. Tout le contenu existe déjà dans le HTML serveur ; sans JavaScript,
 * la page reste complète et lisible.
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

    const peakStage = q("[data-sc-stage]", peak)!;
    const lit = q("[data-tl-lit]", peak);
    const shade = q<HTMLCanvasElement>("[data-tl-shade]", peak);
    const peakCanvas = q<HTMLCanvasElement>("[data-tl-leds='peak']", peak);
    const markMain = q<SVGPathElement>("[data-tl-mark-main]", peak);
    const markBarbs = q<SVGPathElement>("[data-tl-mark-barbs]", peak);
    const markDollar = q<SVGRectElement>("[data-tl-mark-dollar]", peak);
    const word = q("[data-tl-word]", peak);
    const glow = q("[data-tl-glow]", peak);
    const textA = q(".tl-peak__a", peak);
    const textB = q(".tl-peak__b", peak);
    const scrimA = q("[data-tl-scrim-a]", peak);
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

    // --- voyants ---------------------------------------------------------------
    const heroField = heroCanvas ? new LedField(heroCanvas, "flash") : null;
    const peakField = peakCanvas ? new LedField(peakCanvas, "full") : null;
    if (heroField) heroField.reduced = reduce;
    if (peakField) peakField.reduced = reduce;
    let fieldsLoading = false;
    const loadFields = () => {
      if (fieldsLoading) return;
      fieldsLoading = true;
      loadLeds()
        .then(({ json, sprite }) => {
          if (dead) return;
          heroField?.setData(json, sprite, null);
          peakField?.setData(json, sprite, BANDS, PEAK.spread);
          peakField?.setBands(bands);
          heroField?.resize();
          peakField?.resize();
          root.classList.add("tl-leds-ready");
          kick();
        })
        .catch(() => {
          fieldsLoading = false;
        });
    };

    // Image -> écran pour un plan « cover » de la taille de la scène.
    const coverMap = (sw: number, sh: number, x0: number, w: number, h: number): Mapping => {
      const k = Math.max(sw / w, sh / h);
      return { k, ox: (sw - w * k) / 2 - x0 * k, oy: (sh - h * k) / 2 };
    };

    // --- l'ombre des baies (pic) ----------------------------------------------
    let bands: Band[] = BANDS;
    let bandsKey = "";
    const shadeCtx = shade?.getContext("2d") || null;
    let shadeDpr = 1;
    const sizeShade = () => {
      if (!shade) return;
      const r = shade.getBoundingClientRect();
      shadeDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(r.width * shadeDpr);
      const h = Math.round(r.height * shadeDpr);
      if (shade.width !== w || shade.height !== h) {
        shade.width = w;
        shade.height = h;
      }
    };
    let shadeKey = "";
    const drawShade = (p: number, m: Mapping) => {
      if (!shadeCtx || !shade) return;
      const key = `${p.toFixed(4)}|${m.ox.toFixed(1)}|${m.oy.toFixed(1)}|${m.k.toFixed(4)}`;
      if (key === shadeKey) return;
      shadeKey = key;
      const d = shadeDpr;
      const W = shade.width;
      const H = shade.height;
      shadeCtx.setTransform(1, 0, 0, 1, 0, 0);
      shadeCtx.clearRect(0, 0, W, H);
      if (reduce) return;
      const X = (x: number) => (m.ox + x * m.k) * d;
      // Un seul profil horizontal d'obscurité (le maximum des baies, avec un
      // fondu de 18 px de l'image au bord de chacune), posé d'un seul geste :
      // aucune couture entre deux baies voisines.
      const N = 160;
      const F = 18;
      const prof = new Float32Array(N + 1);
      let any = false;
      for (const b of bands) {
        const a = 0.84 * smooth((p - b.start - 0.012) / PEAK.bandDur);
        if (a <= 0.003) continue;
        any = true;
        for (let i = 0; i <= N; i++) {
          const x = (i / N) * IMG_W;
          const out = x < b.x0 ? b.x0 - x : x > b.x1 ? x - b.x1 : 0;
          const v = out >= F ? 0 : a * (1 - out / F);
          if (v > prof[i]) prof[i] = v;
        }
      }
      if (any) {
        const g = shadeCtx.createLinearGradient(X(0), 0, X(IMG_W), 0);
        for (let i = 0; i <= N; i++) g.addColorStop(i / N, `rgba(2,4,3,${prof[i].toFixed(3)})`);
        shadeCtx.fillStyle = g;
        shadeCtx.fillRect(0, 0, W, H);
      }
      // Puis tout le reste, sauf la brume du fond, qui reste la seule lumière.
      const dim = 0.6 * smooth(range(p, PEAK.dim[0], PEAK.dim[1]));
      if (dim > 0.003) {
        shadeCtx.fillStyle = `rgba(2,4,3,${dim.toFixed(3)})`;
        shadeCtx.fillRect(0, 0, W, H);
      }
      const hx = X(HAZE.x);
      const hy = (m.oy + HAZE.y * m.k) * d;
      const hr = HAZE.r * m.k * d;
      const rg = shadeCtx.createRadialGradient(hx, hy, 0, hx, hy, hr);
      rg.addColorStop(0, "rgba(0,0,0,0.9)");
      rg.addColorStop(0.45, "rgba(0,0,0,0.5)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      shadeCtx.globalCompositeOperation = "destination-out";
      shadeCtx.fillStyle = rg;
      shadeCtx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
      shadeCtx.globalCompositeOperation = "source-over";
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

    // État initial du pic quand le mouvement est permis : allée allumée, lumière
    // éteinte, logo pas encore dessiné. (Sans JavaScript, le HTML montre l'état
    // final : la salle vide et le logo.)
    const armPeak = () => {
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
      const zoneRect = heroOn && heroLogo ? heroLogo.parentElement!.getBoundingClientRect() : null;
      const objRects = rangeA && rangeA.live && !reduce ? objs.map((o) => o.fig.getBoundingClientRect()) : null;
      const peakRect = peak!.getBoundingClientRect();
      const peakOn = peakRect.bottom > 0 && peakRect.top < vh;
      const sr = peakOn ? peakStage.getBoundingClientRect() : null;

      // ---- 1. le hero ------------------------------------------------------------
      if (heroA && heroOn && heroStageRect) {
        const e = reduce ? 0 : smooth(heroA.p);
        // Le logo attend au fond de l'allée : la caméra s'en approche.
        if (heroLogo && zoneRect) {
          // centre de l'image du logo hors transformation (offsetTop ignore
          // les transforms) : c'est elle qui va vers le point de fuite
          const markCy =
            zoneRect.top + heroLogo.offsetTop + (heroMark ? heroMark.offsetTop + heroMark.offsetHeight / 2 : heroLogo.offsetHeight / 2);
          const logoCy = markCy;
          const toVP = vh / 2 - logoCy;
          const ty = e * toVP * 0.55 + (pointerOK ? my * -4 : 0);
          const tx = pointerOK ? mx * -6 : 0;
          // moins d'agrandissement sur un écran étroit : la ligne doit tenir
          const grow = vw < 861 ? 0.2 : 0.4;
          style("hl", heroLogo, "transform", `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${(1 + grow * e).toFixed(4)})`);
        }
        style("hv", heroVeil, "opacity", (0.42 * (1 - e)).toFixed(3));
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

      // ---- 4. le pic -----------------------------------------------------------------
      if (peakA && peakOn && sr) {
        const p = peakA.p;
        // poussée lente de la caméra + léger parallaxe du pointeur
        const push = reduce ? 1 : 1 + 0.045 * p;
        const px = pointerOK ? mx * -8 : 0;
        const py = pointerOK ? my * -5 : 0;
        style("pp", peakStage, "--tl-push", push.toFixed(4));
        style("ppx", peakStage, "--tl-px", `${px.toFixed(2)}px`);
        style("ppy", peakStage, "--tl-py", `${py.toFixed(2)}px`);
        const base = coverMap(sr.width, sr.height, 0, IMG_W, IMG_H);
        // baies réellement visibles à cette taille d'écran
        const xL = -base.ox / base.k;
        const xR = (sr.width - base.ox) / base.k;
        const bk = `${Math.round(xL)}|${Math.round(xR)}`;
        if (bk !== bandsKey) {
          bandsKey = bk;
          bands = timeBands(xL, xR);
          peakField?.setBands(bands);
          shadeKey = "";
        }
        const k = base.k * push;
        const m: Mapping = {
          k,
          ox: sr.width / 2 - (IMG_W / 2) * k + px,
          oy: sr.height / 2 - (IMG_H / 2) * k + py,
        };
        drawShade(p, m);

        const L = litLevel(p, now);
        style("lit", lit, "opacity", L.toFixed(3));
        if (!reduce && lightOn && now - lightT < FLICKER_MS + 40) busy = true;
        if (!reduce && !lightOn && L > 0) busy = true;

        if (peakField?.ready) {
          peakField.setMapping(m);
          if (pointerOK && cx >= 0 && cy >= sr.top && cy <= sr.bottom) peakField.setPointer(cx - sr.left, cy - sr.top);
          else peakField.setPointer(null);
          peakField.power(reduce ? 0 : p, now);
          // les voyants ne se voient plus une fois la lumière revenue
          if (L < 0.999) {
            if (ledTick || reduce) peakField.render(now, 1);
            if (!reduce) busy = true;
          } else if (last.get("pfc") !== "0") {
            peakField.clear();
          }
          last.set("pfc", L < 0.999 ? "1" : "0");
        }

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
        // les voiles de contraste suivent leur texte
        style("sa", scrimA, "opacity", (textA ? parseFloat(textA.style.opacity || "0") : 0).toFixed(3));
        style("sb", scrimB, "opacity", (textB ? parseFloat(textB.style.opacity || "0") : 0).toFixed(3));
        attr(
          "pvs",
          peakStage,
          "data-sc-verify-state",
          `${p.toFixed(3)}|${peakField?.alive ?? -1}|${L.toFixed(2)}|${lightOn ? 1 : 0}`
        );
      } else if (peakField?.ready && last.get("pfc") === "1") {
        peakField.clear();
        last.set("pfc", "0");
      }

      // Les voyants et les clignotements vivent dans le temps : la boucle
      // continue tant qu'une scène qui en a est à l'écran.
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
      shadeKey = "";
      heroField?.resize();
      peakField?.resize();
      sizeShade();
      kick();
    };
    const listen = () => {
      addEventListener("scroll", onScroll, { passive: true });
      addEventListener("resize", onResize, { passive: true });
      cleanups.push(() => {
        removeEventListener("scroll", onScroll);
        removeEventListener("resize", onResize);
      });
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
          armPeak();
          sizeShade();
          // Les voyants passent après le premier affichage : ils ne doivent
          // rien retarder de ce que le visiteur voit en arrivant.
          if (typeof window.requestIdleCallback === "function") {
            window.requestIdleCallback(loadFields, { timeout: 1500 });
          } else {
            setTimeout(loadFields, 600);
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
