"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";
import { getContenuCarte } from "./contenu-carte";
import { CADRE, DEPART, QUEBEC_PATH, VILLES_POINTS, VILLES_REPERES } from "./zones-carte";
import "./zones.css";

/** Côté de l'étiquette de chaque ville nommée (l = gauche, r = droite, t = dessus). */
const COTES: Record<string, "l" | "r" | "t"> = {
  montreal: "l",
  gatineau: "t",
  "trois-rivieres": "t",
  quebec: "t",
  sherbrooke: "r",
};

/** Zone de service teintée de vert : centre et rayon en unités de carte (Québec et Gatineau compris). */
const ZONE = { x: 246, y: 958, r: 120 };

/** Trajet Montréal → ville : courbe quadratique qui bombe vers le nord. */
function trajet(x: number, y: number): string {
  const dx = x - DEPART.x;
  const dy = y - DEPART.y;
  let nx = dy;
  let ny = -dx;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const k = 0.18;
  const cx = (DEPART.x + x) / 2 + nx * k;
  const cy = (DEPART.y + y) / 2 + ny * k;
  return `M${DEPART.x} ${DEPART.y}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x} ${y}`;
}

const posX = (x: number) => `${(((x - CADRE.x) / CADRE.w) * 100).toFixed(3)}%`;
const posY = (y: number) => `${(((y - CADRE.y) / CADRE.h) * 100).toFixed(3)}%`;
const delai = (s: number) => ({ "--zc-d": `${s.toFixed(2)}s` }) as CSSProperties;

/**
 * Petite carte du sud du Québec : la zone de service se teinte de vert depuis Montréal,
 * les trajets vers les grandes villes se dessinent, puis les autres villes apparaissent
 * (une seule fois, à l'entrée dans l'écran). Aucune animation liée au défilement.
 * Rendu serveur = état final (rien de caché si le JS échoue) ; mouvement réduit : état final.
 */
export function ZonesCarte({ locale }: { locale: Locale }) {
  const t = getContenuCarte(locale);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ref = useRef<HTMLElement>(null);
  const nom = (id: string, defaut: string) => t.names[id] ?? defaut;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Déjà à l'écran au chargement : rien n'est masqué
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.setAttribute("data-armed", "");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.setAttribute("data-in", "");
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const nommees = [DEPART, ...VILLES_REPERES];
  const toutes = [...nommees, ...VILLES_POINTS].sort((a, b) => a.km - b.km).map((v) => nom(v.id, v.nom));

  return (
    <figure ref={ref} className="zc m-0">
      <div className="zc-frame" style={{ aspectRatio: `${CADRE.w} / ${CADRE.h}` }}>
        <svg
          viewBox={`${CADRE.x} ${CADRE.y} ${CADRE.w} ${CADRE.h}`}
          className="zc-svg"
          role="img"
          aria-labelledby={`${uid}-t ${uid}-d`}
          preserveAspectRatio="xMidYMid meet"
        >
          <title id={`${uid}-t`}>{t.mapTitle}</title>
          <desc id={`${uid}-d`}>{t.mapDesc(toutes)}</desc>
          <defs>
            <clipPath id={`${uid}-clip`}>
              <path d={QUEBEC_PATH} />
            </clipPath>
            <radialGradient id={`${uid}-zone`}>
              <stop offset="0%" stopColor="#6bd63b" stopOpacity="0.55" />
              <stop offset="62%" stopColor="#6bd63b" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#6bd63b" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path d={QUEBEC_PATH} className="zc-land" />
          <g clipPath={`url(#${uid}-clip)`}>
            <circle cx={ZONE.x} cy={ZONE.y} r={ZONE.r} fill={`url(#${uid}-zone)`} className="zc-zone" />
          </g>
          <path d={QUEBEC_PATH} className="zc-outline" />

          {VILLES_REPERES.map((v, i) => (
            <path key={v.id} d={trajet(v.x, v.y)} pathLength={1} className="zc-route" style={delai(0.35 + i * 0.12)} />
          ))}
          {VILLES_POINTS.map((v, i) => (
            <circle key={v.id} cx={v.x} cy={v.y} r={1.5} className="zc-point" style={delai(0.75 + i * 0.05)}>
              <title>{nom(v.id, v.nom)}</title>
            </circle>
          ))}
        </svg>

        {/* Villes nommées : pastilles HTML (texte net à toutes les tailles), décrites par la carte */}
        <ul className="zc-villes" aria-hidden="true">
          {nommees.map((v, i) => (
            <li
              key={v.id}
              className="zc-ville"
              data-cote={COTES[v.id] ?? "r"}
              data-depart={v.id === DEPART.id ? "" : undefined}
              style={{ left: posX(v.x), top: posY(v.y), ...delai(v.id === DEPART.id ? 0.15 : 0.65 + i * 0.12) }}
            >
              <span className="zc-dot" />
              <span className="zc-lbl">{v.id === DEPART.id ? t.departLabel : nom(v.id, v.nom)}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
