"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Truck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getContenuCarte } from "./contenu-carte";
import { CARTE_RAYON_MAX, CARTE_W, MASCOUCHE, QUEBEC_PATH, VILLES } from "./zones-carte";
import "./zones.css";

/** Cadre : la carte (1024 de haut) + une marge basse pour l'étiquette du siège social. */
const W = CARTE_W;
const H = 1080;
/** Zoom de départ (bureau) : on part serré sur Mascouche, puis la caméra recule. */
const ZMAX = 3.4;
/** Bas du cadrage quand on zoome : frontière sud + marge (évite une bande vide sous le Québec). */
const BAS = 1025;
/** Sous ce zoom, l'étiquette du siège passe du nord-ouest au sud-est (vers la frontière). */
const Z_TAG = 1.25;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Placement des étiquettes : côté, zoom minimal pour rester lisible, affichée sur mobile. */
/** mside : étiquette au-dessus du point sur mobile (évite qu'elle sorte du cadre). */
type Placement = { side: "l" | "r" | "t"; mside?: "t"; minZ: number; mobile: boolean };
const PLACEMENT: Record<string, Placement> = {
  laval: { side: "l", minZ: 2.8, mobile: false },
  montreal: { side: "r", minZ: 2.8, mobile: false },
  "trois-rivieres": { side: "r", minZ: 1.5, mobile: false },
  sherbrooke: { side: "r", minZ: 1, mobile: false },
  gatineau: { side: "l", mside: "t", minZ: 1, mobile: false },
  quebec: { side: "r", minZ: 1, mobile: true },
  saguenay: { side: "t", minZ: 1, mobile: true },
  rimouski: { side: "r", minZ: 1, mobile: false },
  "rouyn-noranda": { side: "r", minZ: 1, mobile: true },
  "sept-iles": { side: "r", minZ: 1, mobile: true },
  gaspe: { side: "r", minZ: 1, mobile: true },
};

/** Chronologie (0 → 1) : les trajets partent un à un, puis le vert couvre tout le Québec. */
const T0 = 0.04;
const T1 = 0.76;
const DUR = 0.11;
const FILL0 = 0.72;
const FILL1 = 0.93;

/** Trajet Mascouche → ville : courbe quadratique qui bombe vers le nord. */
function trajet(x: number, y: number): string {
  const dx = x - MASCOUCHE.x;
  const dy = y - MASCOUCHE.y;
  let nx = dy;
  let ny = -dx;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const k = 0.2;
  const cx = (MASCOUCHE.x + x) / 2 + nx * k;
  const cy = (MASCOUCHE.y + y) / 2 + ny * k;
  return `M${MASCOUCHE.x} ${MASCOUCHE.y}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x} ${y}`;
}

const ROUTES = VILLES.map((v, i) => ({
  ...v,
  d: trajet(v.x, v.y),
  start: T0 + (i * (T1 - T0 - DUR)) / Math.max(1, VILLES.length - 1),
  place: PLACEMENT[v.id] ?? { side: "r" as const, minZ: 1, mobile: true },
}));

const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(3)}%`;

/**
 * Carte interactive « Partout au Québec » : depuis Mascouche, les trajets se dessinent un à un
 * au défilement, la caméra recule pour suivre le réseau, puis le Québec se remplit de vert.
 * Rendu serveur = état final (tout est visible si le JS échoue) ; mouvement réduit : état final.
 */
export function ZonesCarte({ locale }: { locale: Locale }) {
  const t = getContenuCarte(locale);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `zc-clip-${uid}`;
  const titleId = `zc-titre-${uid}`;
  const descId = `zc-desc-${uid}`;

  const frameRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<SVGGElement>(null);
  const fillRef = useRef<SVGCircleElement>(null);
  const frontRef = useRef<SVGCircleElement>(null);
  const hqRef = useRef<HTMLDivElement>(null);
  const routeRefs = useRef<(SVGPathElement | null)[]>([]);
  const headRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cityRefs = useRef<(HTMLLIElement | null)[]>([]);

  const [survol, setSurvol] = useState<string | null>(null);
  const [epingle, setEpingle] = useState<string | null>(null);
  const actif = survol ?? epingle;

  const nom = (id: string, defaut: string) => t.names[id] ?? defaut;

  useEffect(() => {
    const frame = frameRef.current;
    const cam = camRef.current;
    const fill = fillRef.current;
    const front = frontRef.current;
    const hq = hqRef.current;
    const track = frame?.closest<HTMLElement>("[data-zones-track]") ?? null;
    if (!frame || !cam || !fill || !front || !hq || !track) return;

    const paths = routeRefs.current;
    const heads = headRefs.current;
    const cities = cityRefs.current;
    const lengths = paths.map((p) => (p ? p.getTotalLength() : 0));

    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqDesk = window.matchMedia("(min-width: 1024px)");

    let ppu = 1; // pixels CSS par unité de carte
    let raf = 0;
    let cur = -1;
    let force = true;
    const litPrev: (string | null)[] = cities.map(() => null);
    const lblPrev: (string | null)[] = cities.map(() => null);
    let tagPrev: string | null = null;

    const measure = () => {
      ppu = frame.clientWidth / W || 1;
    };

    /** Progression cible selon le défilement. */
    const target = () => {
      if (mqReduce.matches) return 1;
      const vh = window.innerHeight || 1;
      if (mqDesk.matches) {
        const r = track.getBoundingClientRect();
        return clamp(-r.top / Math.max(1, r.height - vh));
      }
      // Mobile / tablette : pas d'épinglage, la carte s'anime en traversant l'écran.
      const r = frame.getBoundingClientRect();
      return clamp((vh * 0.85 - r.top) / (vh * 0.3 + r.height));
    };

    const apply = (P: number) => {
      const desk = mqDesk.matches && !mqReduce.matches;
      const M = MASCOUCHE;

      // 1. Avancement de chaque trajet et position de sa tête
      let minX = M.x;
      let maxX = M.x;
      let minY = M.y;
      let maxY = M.y;
      let reach = 0;
      const tt: number[] = [];
      const pts: { x: number; y: number }[] = [];
      ROUTES.forEach((r, i) => {
        const k = ease(clamp((P - r.start) / DUR));
        tt.push(k);
        let p = { x: M.x, y: M.y };
        if (k >= 1) p = { x: r.x, y: r.y };
        else if (k > 0 && paths[i]) {
          const q = paths[i]!.getPointAtLength(k * lengths[i]);
          p = { x: q.x, y: q.y };
        }
        pts.push(p);
        if (k > 0) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
          reach = Math.max(reach, Math.hypot(p.x - M.x, p.y - M.y));
        }
      });

      // 2. Caméra : cadre le réseau déjà tracé (bureau seulement), puis recule sur tout le Québec
      const sweepK = ease(clamp((P - FILL0) / (FILL1 - FILL0)));
      let z = 1;
      let cx = W / 2;
      let cy = H / 2;
      if (desk) {
        // marges : place pour les étiquettes des villes en bordure du cadre
        const bw = maxX - minX + 2 * 85;
        const bh = maxY - minY + 2 * 52;
        z = lerp(clamp(Math.min(W / bw, H / bh), 1, ZMAX), 1, sweepK);
        cx = lerp((minX + maxX) / 2, W / 2, sweepK);
        cy = lerp((minY + maxY) / 2, H / 2, sweepK);
        const hw = W / 2 / z;
        const hh = H / 2 / z;
        cx = clamp(cx, hw, W - hw);
        // la marge basse revient quand on dézoome (étiquette du siège au sud-est)
        const bas = lerp(H, BAS, clamp((z - 1) / 0.4));
        cy = clamp(cy, hh, Math.max(hh, bas - hh));
      }
      cam.setAttribute("transform", `translate(${W / 2} ${H / 2}) scale(${z}) translate(${-cx} ${-cy})`);
      cam.style.setProperty("--zc-sw", String(1 / (ppu * z)));

      // 3. Remplissage vert : suit le réseau, puis balaie tout le Québec
      const sweep = lerp(0, CARTE_RAYON_MAX + 16, sweepK);
      const rFill = Math.max(reach > 0 ? reach * 1.08 + 6 : 0, sweep);
      fill.setAttribute("r", rFill.toFixed(1));
      // Teinte légère pendant les trajets, vert plein une fois tout le Québec couvert
      fill.style.opacity = String(lerp(0.45, 1, sweepK));
      front.setAttribute("r", rFill.toFixed(1));
      front.style.opacity = rFill > 0 && rFill < CARTE_RAYON_MAX ? "1" : "0";

      const toX = (x: number) => ((x - cx) * z + W / 2) * ppu;
      const toY = (y: number) => ((y - cy) * z + H / 2) * ppu;

      // 4. Trajets, têtes, villes
      ROUTES.forEach((r, i) => {
        const k = tt[i];
        const path = paths[i];
        if (path) path.style.strokeDashoffset = String(1 - k);
        const head = heads[i];
        if (head) {
          const on = k > 0.001 && k < 0.999;
          head.style.opacity = on ? "1" : "0";
          if (on) head.style.transform = `translate3d(${toX(pts[i].x)}px, ${toY(pts[i].y)}px, 0)`;
        }
        const city = cities[i];
        if (city) {
          city.style.transform = `translate3d(${toX(r.x) - r.x * ppu}px, ${toY(r.y) - r.y * ppu}px, 0)`;
          const lit = k >= 0.999 ? "1" : "0";
          if (lit !== litPrev[i]) {
            city.dataset.lit = lit;
            litPrev[i] = lit;
          }
          const lbl = k >= 0.999 && z >= r.place.minZ - 0.001 ? "1" : "0";
          if (lbl !== lblPrev[i]) {
            city.dataset.lbl = lbl;
            lblPrev[i] = lbl;
          }
        }
      });

      hq.style.transform = `translate3d(${toX(M.x) - M.x * ppu}px, ${toY(M.y) - M.y * ppu}px, 0)`;
      const tag = z > Z_TAG ? "nw" : "se";
      if (tag !== tagPrev) {
        hq.dataset.tag = tag;
        tagPrev = tag;
      }
    };

    // Lissage dans le temps (indépendant de la fréquence d'affichage)
    let last = 0;
    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(250, now - last) : 16;
      last = now;
      const tgt = target();
      if (cur < 0 || mqReduce.matches) cur = tgt;
      const d = tgt - cur;
      const next = Math.abs(d) < 0.0008 ? tgt : cur + d * (1 - Math.exp(-dt / 90));
      if (next !== cur || force) {
        cur = next;
        force = false;
        apply(cur);
      }
      if (cur !== tgt) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const refresh = () => {
      measure();
      force = true;
      kick();
    };

    measure();
    frame.dataset.ready = "1";
    kick();

    const ro = new ResizeObserver(refresh);
    ro.observe(frame);
    window.addEventListener("scroll", kick, { passive: true });
    mqDesk.addEventListener("change", refresh);
    mqReduce.addEventListener("change", refresh);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", kick);
      mqDesk.removeEventListener("change", refresh);
      mqReduce.removeEventListener("change", refresh);
    };
  }, []);

  const villesTexte = ROUTES.map((r) => nom(r.id, r.nom));

  return (
    <figure className="zc m-0" data-actif={actif ? "1" : undefined}>
      <div ref={frameRef} className="zc-frame">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="zc-svg"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <title id={titleId}>{t.mapTitle}</title>
          <desc id={descId}>{t.mapDesc(villesTexte)}</desc>
          <defs>
            <clipPath id={clipId}>
              <path d={QUEBEC_PATH} />
            </clipPath>
          </defs>
          <g ref={camRef} className="zc-cam">
            <path d={QUEBEC_PATH} className="zc-land" />
            <g clipPath={`url(#${clipId})`}>
              <circle
                ref={fillRef}
                cx={MASCOUCHE.x}
                cy={MASCOUCHE.y}
                r={CARTE_RAYON_MAX + 16}
                className="zc-fill"
              />
              <circle
                ref={frontRef}
                cx={MASCOUCHE.x}
                cy={MASCOUCHE.y}
                r={CARTE_RAYON_MAX + 16}
                className="zc-front"
                style={{ opacity: 0 }}
              />
            </g>
            <path d={QUEBEC_PATH} className="zc-outline" />
            <g className="zc-routes">
              {ROUTES.map((r, i) => (
                <path
                  key={r.id}
                  ref={(el) => {
                    routeRefs.current[i] = el;
                  }}
                  d={r.d}
                  pathLength={1}
                  className="zc-route"
                  data-on={actif === r.id ? "1" : undefined}
                />
              ))}
            </g>
          </g>
        </svg>

        <div className="zc-overlay">
          {ROUTES.map((r, i) => (
            <span
              key={r.id}
              ref={(el) => {
                headRefs.current[i] = el;
              }}
              className="zc-head"
              aria-hidden="true"
            />
          ))}

          <ul className="zc-cities" aria-label={t.listLabel}>
            {ROUTES.map((r, i) => (
              <li
                key={r.id}
                ref={(el) => {
                  cityRefs.current[i] = el;
                }}
                className="zc-city"
                data-side={r.place.side}
                data-mside={r.place.mside}
                data-m={r.place.mobile ? "1" : "0"}
                data-lit="1"
                data-lbl={r.place.minZ <= 1 ? "1" : "0"}
                data-on={actif === r.id ? "1" : undefined}
                style={{ left: pct(r.x, W), top: pct(r.y, H) }}
              >
                <button
                  type="button"
                  className="zc-hit"
                  aria-pressed={epingle === r.id}
                  onMouseEnter={() => setSurvol(r.id)}
                  onMouseLeave={() => setSurvol((s) => (s === r.id ? null : s))}
                  onFocus={() => setSurvol(r.id)}
                  onBlur={() => setSurvol((s) => (s === r.id ? null : s))}
                  onClick={() => setEpingle((e) => (e === r.id ? null : r.id))}
                >
                  <span className="zc-dot" aria-hidden="true" />
                  <span className="zc-lbl">{nom(r.id, r.nom)}</span>
                </button>
              </li>
            ))}
          </ul>

          <div
            ref={hqRef}
            className="zc-hq"
            data-tag="se"
            aria-hidden="true"
            style={{ left: pct(MASCOUCHE.x, W), top: pct(MASCOUCHE.y, H) }}
          >
            <span className="zc-hq-lead zc-hq-lead-nw" />
            <span className="zc-hq-lead zc-hq-lead-se" />
            <span className="zc-hq-tag zc-hq-tag-nw">
              <strong>{t.hqName}</strong> · {t.hqCity}
            </span>
            <span className="zc-hq-tag zc-hq-tag-se">
              <strong>{t.hqName}</strong> · {t.hqCity}
            </span>
            <span className="zc-hq-pin">
              <Truck className="h-[55%] w-[55%]" strokeWidth={2.2} />
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
