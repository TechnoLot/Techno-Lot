"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LOT_BANDS } from "@/components/home/lot-geometry";

type ScApi = { destroy: () => void };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// Position du séparateur, en fraction de la largeur, aux étapes de la page.
const SEAM = { hero: 0.5, cost: 0.44, proc: 0.42, peak: 0.4 };

// Chronologie du pic (progression de l'acte épinglé, 0 à 1).
const PEAK = {
  first: 0.07, // la première couche part après un temps d'arrêt voulu
  step: 0.12, // décalage entre deux couches
  dur: 0.11, // durée d'une traversée
  summary: [0.64, 0.72] as const,
  collapse: [0.76, 0.92] as const,
  done: [0.86, 0.95] as const,
};

/**
 * Anime l'accueil : monte le moteur scrollcraft (copié tel quel dans
 * lib/scrollcraft) sur la racine, puis pilote ce que le moteur ne fait pas :
 * le séparateur de la scène partagée, la profondeur du hero et la ligne de
 * rachat (chaque couche du lot traverse le séparateur et devient une ligne
 * du bordereau). Tout le contenu existe déjà dans le HTML serveur ; sans
 * JavaScript, la page reste complète et lisible.
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
    const splitMQ = matchMedia("(min-width: 1024px)");
    const fineMQ = matchMedia("(hover: hover) and (pointer: fine)");

    let api: ScApi | null = null;
    let raf = 0;
    let dead = false;
    const cleanups: (() => void)[] = [];

    // Mouvement réduit : moins de défilement épinglé, et des fondus au lieu
    // des déplacements. À régler avant le montage, qui lit data-sc-span.
    if (reduce) {
      root.querySelectorAll<HTMLElement>("[data-tl-span-reduced]").forEach((el) => {
        el.setAttribute("data-sc-span", el.getAttribute("data-tl-span-reduced") || "1.2");
      });
      root.classList.add("tl-reduce");
    }

    const q = (sel: string, from: ParentNode = root) => from.querySelector<HTMLElement>(sel);
    const qa = (sel: string, from: ParentNode = root) =>
      Array.from(from.querySelectorAll<HTMLElement>(sel));

    const hero = q(".tl-hero");
    const heroStage = q("[data-tl-hero]");
    const lastRow = qa(".tl-row").pop() || null;
    const proc = q(".tl-proc");
    const peak = q(".tl-peak");
    const peakStage = q("[data-tl-peak]");
    const seam = q(".tl-seam");
    if (!hero || !heroStage || !lastRow || !proc || !peak || !peakStage || !seam) return;

    const planes = {
      far: q('[data-tl-plane="far"]', heroStage),
      cone: q('[data-tl-plane="cone"]', heroStage),
      lot: q('[data-tl-plane="lot"]', heroStage),
      near: q('[data-tl-plane="near"]', heroStage),
    };
    const peakLot = q(".tl-lot--peak", peakStage);
    const bands = qa("[data-tl-band]", peakStage);
    const lines = qa("[data-tl-line]", peakStage);
    const more = q("[data-tl-more]", peakStage);
    const pay = q("[data-tl-pay]", peakStage);
    const done = q("[data-tl-done]", peakStage);
    const frame = q(".tl-frame--peak", peakStage);
    const tick = q(".tl-seam__tick", seam);

    // Pointeur (souris uniquement), lissé : la profondeur du hero penche
    // légèrement avec la main, jamais de verrouillage du curseur.
    let tmx = 0, tmy = 0, mx = 0, my = 0;
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tmx = (e.clientX / innerWidth) * 2 - 1;
      tmy = (e.clientY / innerHeight) * 2 - 1;
      kick();
    };
    if (!reduce && fineMQ.matches) {
      addEventListener("pointermove", onPointer, { passive: true });
      cleanups.push(() => removeEventListener("pointermove", onPointer));
    }

    // Écritures uniquement quand la valeur change.
    const last = new Map<string, string>();
    const set = (key: string, apply: (v: string) => void, value: string) => {
      if (last.get(key) === value) return;
      last.set(key, value);
      apply(value);
    };
    const css = (el: HTMLElement | null, prop: string, value: string, key: string) => {
      if (el) set(key, (v) => el.style.setProperty(prop, v), value);
    };

    // Segments du séparateur (bureau, mouvement complet) : de la sortie du
    // hero jusqu'à l'effondrement à la fin du pic.
    const seamAt = (y: number, k: { y: number; x: number }[]) => {
      if (y <= k[0].y) return k[0].x;
      for (let i = 1; i < k.length; i++) {
        if (y <= k[i].y) {
          const a = k[i - 1];
          const b = k[i];
          return a.x + (b.x - a.x) * smooth((y - a.y) / Math.max(b.y - a.y, 1));
        }
      }
      return k[k.length - 1].x;
    };

    function frameFn() {
      raf = 0;
      if (dead) return;
      const y = scrollY;
      const vw = root!.clientWidth;
      const vh = innerHeight;
      const split = splitMQ.matches;

      // --- géométrie du document (lue avant toute écriture) -------------
      const hr = hero!.getBoundingClientRect();
      const heroTop = hr.top + y;
      const heroPinEnd = heroTop + hr.height - vh;
      const costEnd = lastRow!.getBoundingClientRect().bottom + y;
      const pr = proc!.getBoundingClientRect();
      const procTop = pr.top + y;
      const procEnd = pr.bottom + y;
      const kr = peak!.getBoundingClientRect();
      const peakTop = kr.top + y;
      const travel = Math.max(kr.height - vh, 1);
      const peakP = clamp01((y - peakTop) / travel);
      const lotR = peakLot ? peakLot.getBoundingClientRect() : null;

      // --- le séparateur -------------------------------------------------
      let x: number;
      let avantO = 1;
      if (reduce) {
        // Aucun déplacement : il reste au milieu, puis s'efface en fondu.
        x = SEAM.hero;
        avantO = 1 - range(peakP, PEAK.collapse[0], PEAK.collapse[1]);
      } else {
        x = seamAt(y, [
          { y: heroPinEnd, x: SEAM.hero },
          { y: costEnd - vh * 0.6, x: SEAM.cost },
          { y: procEnd - vh * 0.6, x: SEAM.proc },
          { y: peakTop, x: SEAM.peak },
          { y: peakTop + PEAK.collapse[0] * travel, x: SEAM.peak },
          { y: peakTop + PEAK.collapse[1] * travel, x: 0 },
        ]);
        if (x < 0.0005) x = 0;
      }
      css(root, "--tl-x", x.toFixed(4), "x");
      css(root, "--tl-avant-o", avantO.toFixed(3), "ao");
      const seamOn = split && x > 0.002 && avantO > 0.02;
      set("seamOn", (v) => seam!.classList.toggle("is-off", v === "0"), seamOn ? "1" : "0");
      const vn = y > procTop - vh * 0.5 && y < procEnd - vh * 0.5;
      set("vn", (v) => seam!.classList.toggle("is-vn", v === "1"), vn ? "1" : "0");
      if (tick) {
        const end = peakTop + PEAK.collapse[1] * travel;
        const prog = clamp01(y / Math.max(end, 1));
        css(tick, "--tl-tick", `${(prog * (vh - 160)).toFixed(1)}px`, "tick");
      }

      // --- le hero : plans indépendants ---------------------------------
      if (y < heroPinEnd + vh * 1.2 && !reduce) {
        mx += (tmx - mx) * 0.08;
        my += (tmy - my) * 0.08;
        const hp = clamp01((y - heroTop) / Math.max(hr.height - vh, 1));
        const he = clamp01((y - heroPinEnd) / vh);
        const push = hp * 0.7 + he * 0.3;
        const tr = (dx: number, dy: number, s: number) =>
          `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) scale(${s.toFixed(4)})`;
        const far = tr(mx * -4, my * -3 - push * 10, 1 + push * 0.03);
        const cone = tr(mx * -6, my * -4 - push * 18, 1 + push * 0.05);
        const lotS = 1 + push * 0.07;
        const lot = tr(mx * -10, my * -6 - push * 24, lotS);
        const nearY = my * -16 + push * 70;
        const near = tr(mx * -26, nearY, 1 + push * 0.22);
        if (planes.far) set("pf", (v) => (planes.far!.style.transform = v), far);
        if (planes.cone) set("pc", (v) => (planes.cone!.style.transform = v), cone);
        if (planes.lot) set("pl", (v) => (planes.lot!.style.transform = v), lot);
        if (planes.near) set("pn", (v) => (planes.near!.style.transform = v), near);
        set(
          "hv",
          (v) => heroStage!.setAttribute("data-sc-verify-state", v),
          `${lotS.toFixed(3)}|${nearY.toFixed(0)}`
        );
      }

      // --- la ligne de rachat --------------------------------------------
      if (lotR && y > peakTop - vh * 1.5 && y < peakTop + travel + vh * 1.5) {
        // Point de traversée : le séparateur au bureau, le bord de l'écran
        // sur téléphone (la scène y est verticale).
        const cut = split ? SEAM.peak * vw : vw;
        const crossed: number[] = [];
        const shifts: number[] = [];
        LOT_BANDS.forEach((b, i) => {
          const start = PEAK.first + i * PEAK.step;
          const t = range(peakP, start, start + PEAK.dur);
          const L = lotR.left + b.left * lotR.width;
          const R = lotR.left + b.right * lotR.width;
          let c: number;
          if (reduce) {
            c = smooth(t);
            css(bands[i], "opacity", (1 - c).toFixed(3), `bo${i}`);
            shifts.push(0);
          } else {
            const dx = easeInOut(t) * (cut - L + 12);
            const lift = Math.sin(Math.PI * t) * -5;
            set(`bt${i}`, (v) => (bands[i].style.transform = v), `translate3d(${dx.toFixed(1)}px,${lift.toFixed(1)}px,0)`);
            c = clamp01((R + dx - cut) / Math.max(R - L, 1));
            shifts.push(Math.round(dx));
          }
          crossed.push(c);
          css(lines[i], "--c", c.toFixed(3), `lc${i}`);
        });
        const sum = smooth(range(peakP, PEAK.summary[0], PEAK.summary[1]));
        css(more, "--o", sum.toFixed(3), "mo");
        css(pay, "--o", sum.toFixed(3), "po");
        const fin = smooth(range(peakP, PEAK.done[0], PEAK.done[1]));
        css(done, "--o", fin.toFixed(3), "do");
        if (done) set("dv", (v) => (done.style.visibility = v), fin > 0.02 ? "visible" : "hidden");
        // Téléphone : la photo se replie vers le haut et le bordereau monte.
        const k = reduce ? 0 : easeInOut(range(peakP, PEAK.collapse[0], PEAK.collapse[1]));
        css(peakStage, "--tl-k", k.toFixed(4), "k");
        if (reduce && frame) css(frame, "opacity", avantO.toFixed(3), "fo");
        set(
          "kv",
          (v) => peakStage!.setAttribute("data-sc-verify-state", v),
          `${x.toFixed(3)}|${shifts.join(",")}|${crossed.map((c) => c.toFixed(2)).join(",")}|${sum.toFixed(2)}|${fin.toFixed(2)}|${k.toFixed(2)}`
        );
      }

      // L'ambiance (poussière, faisceau) ne tourne que si une scène est visible.
      const ambient = y < heroPinEnd + vh || (y > peakTop - vh && y < peakTop + travel + vh);
      set("amb", (v) => root!.classList.toggle("is-still", v === "0"), ambient ? "1" : "0");

      // Le lissage du pointeur continue tant qu'il n'est pas arrivé.
      if (Math.abs(tmx - mx) > 0.001 || Math.abs(tmy - my) > 0.001) kick();
    }

    function kick() {
      if (!raf && !dead) raf = requestAnimationFrame(frameFn);
    }

    const onScroll = () => kick();
    const onResize = () => {
      last.clear();
      kick();
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize, { passive: true });
    cleanups.push(() => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onResize);
    });
    const onSplit = () => {
      last.clear();
      kick();
    };
    splitMQ.addEventListener("change", onSplit);
    cleanups.push(() => splitMQ.removeEventListener("change", onSplit));

    import("@/lib/scrollcraft/scrollcraft.js")
      .then(() => {
        if (dead || !window.ScrollCraft) return;
        try {
          api = window.ScrollCraft.mount(root);
          root.classList.add("tl-live");
          document.fonts?.ready.then(() => {
            last.clear();
            kick();
          });
          kick();
        } catch {
          // En cas d'échec, tout redevient visible et statique.
          root.classList.add("tl-fallback");
        }
      })
      .catch(() => root.classList.add("tl-fallback"));

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
      api?.destroy();
      root.classList.remove("tl-live", "tl-reduce", "tl-fallback", "is-still");
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
