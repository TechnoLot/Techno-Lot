"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChartCandlestick, ChartLine, Table2 } from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import { formatJour, libellePeriode, libellePrecedente, type PeriodeKey } from "@/lib/admin/periodes";
import {
  statsEvolution,
  type Granularite,
  type PointEvolution,
  type SerieEvolution,
} from "@/lib/admin/evolution";

type Vue = "courbe" | "chandelles" | "tableau";

const VUES: { key: Vue; label: string; Icon: typeof ChartLine }[] = [
  { key: "courbe", label: "Courbe", Icon: ChartLine },
  { key: "chandelles", label: "Chandelles", Icon: ChartCandlestick },
  { key: "tableau", label: "Tableau", Icon: Table2 },
];

/** Vue choisie, gardée dans ce navigateur. */
const CLE_VUE = "tl_chiffres_vue";

const HAUSSE = "rgb(var(--a-chart-up))";
const BAISSE = "rgb(var(--a-chart-down))";
const NEUTRE = "rgb(var(--a-line-strong))";
const PRECEDENTE = "rgb(var(--a-faint))";

/** Largeur de l'axe des montants, à droite comme en bourse. */
const AXE_Y = 62;
/** Hauteur de la bande des dates, en bas. */
const AXE_X = 24;
const MARGE_HAUT = 10;
/** Panneau des ventes (le « volume ») sous le profit. */
const H_VOLUME = 40;
const ECART = 12;

// Jours « YYYY-MM-DD » sans heure : formatés en UTC pour éviter tout décalage.
const jourLongFmt = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const jourAnneeFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const moisLongFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", month: "long", year: "numeric" });
const moisCourtFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", month: "short" });
const montantCourtFmt = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const UNITES: Record<
  Granularite,
  {
    meilleur: string;
    pire: string;
    hausses: string;
    moyenne: string;
    pluriel: string;
    feminin: boolean;
    aucuneBaisse: string;
    la: string;
    colonne: string;
  }
> = {
  jour: {
    meilleur: "Meilleur jour",
    pire: "Pire jour",
    hausses: "Jours en hausse",
    moyenne: "Moyenne par jour",
    pluriel: "jours",
    feminin: false,
    aucuneBaisse: "Aucun jour dans le rouge",
    la: "ce jour-là",
    colonne: "Jour",
  },
  semaine: {
    meilleur: "Meilleure semaine",
    pire: "Pire semaine",
    hausses: "Semaines en hausse",
    moyenne: "Moyenne par semaine",
    pluriel: "semaines",
    feminin: true,
    aucuneBaisse: "Aucune semaine dans le rouge",
    la: "cette semaine-là",
    colonne: "Semaine",
  },
  mois: {
    meilleur: "Meilleur mois",
    pire: "Pire mois",
    hausses: "Mois en hausse",
    moyenne: "Moyenne par mois",
    pluriel: "mois",
    feminin: false,
    aucuneBaisse: "Aucun mois dans le rouge",
    la: "ce mois-là",
    colonne: "Mois",
  },
};

function utc(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « +1 234 $ », « −1 234 $ » (vrai signe moins), « 0 $ ». */
function signe(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${formatMoney(Math.abs(r))}`;
}

/** « 48 k$ » sur les axes. */
function montantCourt(n: number): string {
  return montantCourtFmt.format(n);
}

/** Étiquette de l'axe des dates : « 16 oct. », « oct. 26 » pour un mois. */
function etiquette(p: PointEvolution, g: Granularite): string {
  return g === "mois" ? `${moisCourtFmt.format(utc(p.debut))} ${p.debut.slice(2, 4)}` : formatJour(p.debut);
}

/** « Jeudi 16 octobre 2026 », « Du 13 au 19 oct. », « Octobre 2026 » ; `court` : « 16 oct. 2026 ». */
function titre(p: PointEvolution, g: Granularite, court = false): string {
  if (g === "mois") return majuscule(moisLongFmt.format(utc(p.debut)));
  if (g === "jour" || p.debut === p.fin) return court ? formatJour(p.debut, jourAnneeFmt) : majuscule(formatJour(p.debut, jourLongFmt));
  const jour = Number(p.debut.slice(8, 10));
  const debut = p.debut.slice(0, 7) === p.fin.slice(0, 7) ? (jour === 1 ? "1er" : String(jour)) : formatJour(p.debut);
  return `Du ${debut} au ${formatJour(p.fin)}`;
}

/** Nom court de la courbe de comparaison. */
function nomPrecedente(periode: PeriodeKey): string {
  switch (periode) {
    case "annee":
      return "An dernier";
    case "mois":
    case "moisdernier":
      return "Mois d’avant";
    case "semaine":
      return "Semaine d’avant";
    case "7j":
      return "7 jours d’avant";
    case "30j":
      return "30 jours d’avant";
    case "90j":
      return "90 jours d’avant";
    default:
      return "Période d’avant";
  }
}

function aBouge(p: PointEvolution): boolean {
  return p.ventes !== 0 || p.achats !== 0 || p.frais !== 0;
}

/**
 * Échelle des montants : [lo, hi] avec un peu d'air, et des graduations
 * « rondes » (1, 2, 2,5 ou 5 × 10ⁿ) à l'intérieur, comme en bourse.
 */
function echelle(lo: number, hi: number): { min: number; max: number; ticks: number[] } {
  if (hi - lo < 1) {
    lo -= 50;
    hi += 50;
  }
  const marge = (hi - lo) * 0.08;
  const min = lo - marge;
  const max = hi + marge;
  const brut = (max - min) / 4;
  const puissance = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * puissance).find((s) => s >= brut) ?? brut;
  const ticks: number[] = [];
  // `|| 0` : pas de « -0 $ » sur l'axe.
  for (let v = Math.ceil(min / pas) * pas; v <= max; v += pas) ticks.push(Math.round(v * 100) / 100 || 0);
  return { min, max, ticks };
}

/**
 * Graphique « Évolution » des Chiffres, façon bourse : profit cumulé de la
 * période (courbe ou chandelles), ventes en volume, comparaison avec la
 * période d'avant, tableau et statistiques. Suit le sélecteur de période.
 */
export default function ChiffresGraphique({ periode, serie }: { periode: PeriodeKey; serie: SerieEvolution | null }) {
  const [vue, setVue] = useState<Vue>("courbe");
  const [actif, setActif] = useState<number | null>(null);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(CLE_VUE);
      if (v === "courbe" || v === "chandelles" || v === "tableau") setVue(v);
    } catch {
      // Stockage bloqué : on garde la courbe.
    }
  }, []);

  // Nouvelle période : l'ancien point survolé ne veut plus rien dire.
  useEffect(() => setActif(null), [serie]);

  function choisir(v: Vue) {
    setVue(v);
    setActif(null);
    try {
      window.localStorage.setItem(CLE_VUE, v);
    } catch {
      // Sans stockage, le choix vaut pour cette visite.
    }
  }

  const carte = "mt-3 rounded-2xl border border-admin-line bg-admin-card p-4 sm:mt-4 sm:p-5";

  if (!serie) {
    return (
      <div className={`${carte} flex min-h-[112px] items-center justify-center text-center`}>
        <p className="max-w-sm text-[13px] leading-relaxed text-admin-muted">
          {periode === "tout"
            ? "Le graphique apparaîtra dès les premiers achats ou ventes."
            : "Le graphique s’affiche sur au moins deux jours : choisissez « 7 jours » ou plus."}
        </p>
      </div>
    );
  }

  const { points, granularite, totalPrecedent } = serie;
  const unite = UNITES[granularite];
  const dernier = points[points.length - 1];
  const final = dernier.cloture;
  const couleur = final >= 0 ? HAUSSE : BAISSE;
  const point = actif != null ? (points[actif] ?? null) : null;
  const nomPrec = nomPrecedente(periode);
  const vs = libellePrecedente(periode);
  const avecPrecedente = totalPrecedent != null;
  const ecart = totalPrecedent != null ? final - totalPrecedent : null;
  const pct = totalPrecedent != null && totalPrecedent > 0 ? ((final - totalPrecedent) / totalPrecedent) * 100 : null;
  const resume =
    `Profit cumulé : ${formatMoney(final)} ${libellePeriode(periode)}` +
    (ecart != null && vs ? `, ${signe(ecart)} ${vs}.` : ".");

  return (
    <div className={carte}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0" aria-live="polite">
          <p className="text-[13px] font-medium text-admin-muted">{point ? titre(point, granularite) : "Profit cumulé"}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="font-display text-[24px] font-semibold leading-none tracking-tight text-admin-ink sm:text-[28px]">
              {formatMoney(point ? point.cloture : final)}
            </p>
            {point ? (
              <Variation montant={point.net} />
            ) : ecart != null ? (
              <Variation montant={ecart} pct={pct} />
            ) : null}
          </div>
        </div>
        <VueSelect vue={vue} onChange={choisir} />
      </div>

      <div className="mt-2.5 min-h-[36px] text-[12.5px] leading-[18px] text-admin-muted sm:min-h-[18px]">
        {point ? (
          <div className="flex flex-wrap gap-x-3.5 gap-y-0.5">
            <span>{majuscule(unite.la)} :</span>
            <Detail label="Ventes" valeur={formatMoney(point.ventes)} />
            <Detail label="Achats" valeur={formatMoney(point.achats)} />
            {point.frais !== 0 && <Detail label="Frais eBay" valeur={formatMoney(point.frais)} />}
            {point.precedent != null && <Detail label={nomPrec} valeur={formatMoney(point.precedent)} />}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
            {avecPrecedente && vs && <span>{vs}</span>}
            {avecPrecedente && vue !== "tableau" ? (
              <>
                <Cle couleur={couleur} label="Cette période" />
                <Cle couleur={PRECEDENTE} label={nomPrec} />
              </>
            ) : (
              vue !== "tableau" && <span>Survolez ou touchez le graphique pour le détail.</span>
            )}
          </div>
        )}
      </div>

      {vue === "tableau" ? (
        <Tableau points={points} granularite={granularite} nomPrec={nomPrec} />
      ) : (
        <Trace
          points={points}
          granularite={granularite}
          mode={vue}
          couleur={couleur}
          actif={actif}
          onActif={setActif}
          resume={resume}
        />
      )}

      <Stats points={points} granularite={granularite} />
    </div>
  );
}

function VueSelect({ vue, onChange }: { vue: Vue; onChange: (v: Vue) => void }) {
  const layoutId = `vue-${useId()}`;
  return (
    <div role="group" aria-label="Affichage du graphique" className="admin-segment">
      {VUES.map(({ key, label, Icon }) => {
        const active = key === vue;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={`admin-focus relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active ? "text-admin-ink" : "text-admin-muted hover:text-admin-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-full bg-[#6bd63b]"
              />
            )}
            <Icon className="relative h-3.5 w-3.5" aria-hidden />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Écart en pastille : flèche + signe (jamais la couleur seule). */
function Variation({ montant, pct }: { montant: number; pct?: number | null }) {
  const r = Math.round(montant);
  const ton =
    r > 0
      ? "bg-admin-tint-green text-admin-tint-green-ink"
      : r < 0
        ? "bg-admin-tint-red-strong text-admin-danger"
        : "bg-admin-tint-gray text-admin-muted";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-semibold tabular-nums ${ton}`}>
      {r !== 0 && (
        <span aria-hidden className="text-[9px]">
          {r > 0 ? "▲" : "▼"}
        </span>
      )}
      {signe(montant)}
      {pct != null && Number.isFinite(pct) && Math.round(pct) !== 0 && (
        <span className="font-medium opacity-80">
          · {pct > 0 ? "+" : "−"}
          {Math.round(Math.abs(pct)).toLocaleString("fr-CA")} %
        </span>
      )}
    </span>
  );
}

function Detail({ label, valeur }: { label: string; valeur: string }) {
  return (
    <span className="inline-flex gap-1.5">
      {label}
      <span className="font-semibold tabular-nums text-admin-ink">{valeur}</span>
    </span>
  );
}

/** Clé de légende : un trait de la couleur de la courbe. */
function Cle({ couleur, label }: { couleur: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="h-0.5 w-3.5 rounded-full" style={{ background: couleur }} />
      {label}
    </span>
  );
}

function Trace({
  points,
  granularite,
  mode,
  couleur,
  actif,
  onActif,
  resume,
}: {
  points: PointEvolution[];
  granularite: Granularite;
  mode: "courbe" | "chandelles";
  couleur: string;
  actif: number | null;
  onActif: (i: number | null) => void;
  resume: string;
}) {
  const boite = useRef<HTMLDivElement>(null);
  const [taille, setTaille] = useState({ l: 0, h: 0 });
  const degrade = `evolution-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const mesurer = () => setTaille({ l: el.clientWidth, h: el.clientHeight });
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const geo = useMemo(() => {
    const plotL = Math.max(0, taille.l - AXE_Y);
    const prixH = Math.max(0, taille.h - MARGE_HAUT - ECART - H_VOLUME - AXE_X);
    const prixBas = MARGE_HAUT + prixH;
    const volBas = prixBas + ECART + H_VOLUME;
    const pas = n > 0 ? plotL / n : 0;
    // La courbe n'a pas de mèches : son échelle ignore les plus bas et plus hauts.
    const valeurs = [0];
    for (const p of points) {
      valeurs.push(p.cloture);
      if (mode === "chandelles") valeurs.push(p.bas, p.haut);
      if (p.precedent != null) valeurs.push(p.precedent);
    }
    const { min, max, ticks } = echelle(Math.min(...valeurs), Math.max(...valeurs));
    return {
      plotL,
      prixBas,
      volBas,
      ticks,
      corps: Math.max(1.5, Math.min(16, pas * 0.62)),
      cx: (i: number) => (i + 0.5) * pas,
      y: (v: number) => prixBas - ((v - min) / (max - min)) * prixH,
      index: (x: number) => Math.min(n - 1, Math.max(0, Math.floor(x / (pas || 1)))),
    };
  }, [taille, points, mode, n]);

  const fond = useMemo(() => {
    if (taille.l === 0 || n === 0) return null;
    const { plotL, prixBas, volBas, ticks, corps, cx, y } = geo;
    const dernier = points[n - 1];

    // Dates : au plus une étiquette par ~76 px, en partant de la plus récente.
    const saut = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotL / 76))));
    const dates: number[] = [];
    for (let i = n - 1; i >= 0; i -= saut) dates.push(i);

    const maxVentes = Math.max(0, ...points.map((p) => p.ventes));
    const avecPrecedente = points.some((p) => p.precedent != null);
    const ligne = `M 0 ${y(0)} ${points.map((p, i) => `L ${cx(i)} ${y(p.cloture)}`).join(" ")}`;

    return (
      <>
        <defs>
          <linearGradient id={degrade} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: couleur, stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: couleur, stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* Grille et montants (axe de droite) */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={0}
              x2={plotL}
              y1={y(t)}
              y2={y(t)}
              className={t === 0 ? "stroke-admin-line-strong" : "stroke-admin-line-soft"}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <text x={plotL + 8} y={y(t)} dy="0.32em" className="fill-admin-muted tabular-nums" style={{ fontSize: 11 }}>
              {montantCourt(t)}
            </text>
          </g>
        ))}

        {/* Volume : les ventes de chaque jour, semaine ou mois */}
        <line x1={0} x2={plotL} y1={volBas} y2={volBas} className="stroke-admin-line" strokeWidth={1} shapeRendering="crispEdges" />
        <text x={plotL + 8} y={volBas - H_VOLUME / 2} dy="0.32em" className="fill-admin-faint" style={{ fontSize: 11 }}>
          Ventes
        </text>
        {maxVentes > 0 &&
          points.map((p, i) => {
            if (p.ventes <= 0) return null;
            const haut = Math.max(2, (p.ventes / maxVentes) * H_VOLUME);
            return (
              <rect
                key={p.debut}
                x={cx(i) - corps / 2}
                y={volBas - haut}
                width={corps}
                height={haut}
                rx={Math.min(2, corps / 2)}
                style={{ fill: p.net >= 0 ? HAUSSE : BAISSE, opacity: 0.45 }}
              />
            );
          })}

        {dates.map((i) => {
          const x = cx(i);
          const ancre = x < 28 ? "start" : "middle";
          return (
            <text
              key={points[i].debut}
              x={ancre === "start" ? Math.max(0, x - corps / 2) : x}
              y={volBas + 16}
              textAnchor={ancre}
              className="fill-admin-muted"
              style={{ fontSize: 11 }}
            >
              {etiquette(points[i], granularite)}
            </text>
          );
        })}

        {/* Période de comparaison, en gris */}
        {avecPrecedente && (
          <path
            d={`M 0 ${y(0)} ${points.map((p, i) => `L ${cx(i)} ${y(p.precedent ?? 0)}`).join(" ")}`}
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ stroke: PRECEDENTE, strokeOpacity: 0.7 }}
          />
        )}

        {mode === "courbe" ? (
          <>
            <path d={`${ligne} L ${cx(n - 1)} ${prixBas} L 0 ${prixBas} Z`} fill={`url(#${degrade})`} />
            <path
              d={ligne}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ stroke: couleur }}
            />
            <circle
              cx={cx(n - 1)}
              cy={y(dernier.cloture)}
              r={4}
              strokeWidth={2}
              style={{ fill: couleur, stroke: "rgb(var(--a-card))" }}
            />
          </>
        ) : (
          points.map((p, i) => {
            const x = cx(i);
            if (!aBouge(p)) {
              // Rien ce jour-là : un simple tiret, comme une séance sans échange.
              return (
                <line
                  key={p.debut}
                  x1={x - corps / 2}
                  x2={x + corps / 2}
                  y1={y(p.cloture)}
                  y2={y(p.cloture)}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                  style={{ stroke: NEUTRE }}
                />
              );
            }
            const teinte = p.cloture > p.ouverture ? HAUSSE : p.cloture < p.ouverture ? BAISSE : NEUTRE;
            const yo = y(p.ouverture);
            const yc = y(p.cloture);
            return (
              <g key={p.debut} style={{ stroke: teinte, fill: teinte }}>
                <line x1={x} x2={x} y1={y(p.haut)} y2={y(p.bas)} strokeWidth={1} />
                <rect
                  x={x - corps / 2}
                  y={Math.min(yo, yc)}
                  width={corps}
                  height={Math.max(1.5, Math.abs(yo - yc))}
                  rx={1}
                  strokeWidth={0}
                />
              </g>
            );
          })
        )}
      </>
    );
  }, [geo, taille.l, n, points, granularite, mode, couleur, degrade]);

  const p = actif != null ? points[actif] : undefined;
  const silence = points.every((q) => !aBouge(q));
  const yFinal = n > 0 ? geo.y(points[n - 1].cloture) : 0;
  // La pastille du réticule passe devant : on cache celle du dernier montant si elles se touchent.
  const pastilleFinale = !p || Math.abs(geo.y(p.cloture) - yFinal) >= 20;

  return (
    <div
      ref={boite}
      tabIndex={0}
      role="group"
      aria-roledescription="graphique"
      aria-label={`${resume} Flèches gauche et droite pour parcourir.`}
      onKeyDown={(e) => {
        const dernierIndex = n - 1;
        let suivant: number | null | undefined;
        if (e.key === "ArrowLeft") suivant = actif == null ? dernierIndex : Math.max(0, actif - 1);
        else if (e.key === "ArrowRight") suivant = actif == null ? dernierIndex : Math.min(dernierIndex, actif + 1);
        else if (e.key === "Home") suivant = 0;
        else if (e.key === "End") suivant = dernierIndex;
        else if (e.key === "Escape") suivant = null;
        if (suivant === undefined) return;
        e.preventDefault();
        onActif(suivant);
      }}
      onBlur={() => onActif(null)}
      className="admin-focus relative mt-3 h-[236px] select-none rounded-lg sm:h-[300px]"
      style={{ touchAction: "pan-y" }}
    >
      {taille.l > 0 && (
        <svg width={taille.l} height={taille.h} aria-hidden className="block overflow-visible">
          {fond}

          {/* Dernier montant, en pastille sur l'axe */}
          {pastilleFinale && (
            <g>
              <rect x={geo.plotL + 3} y={yFinal - 9} width={AXE_Y - 5} height={18} rx={4} style={{ fill: couleur }} />
              <text
                x={geo.plotL + 3 + (AXE_Y - 5) / 2}
                y={yFinal}
                dy="0.34em"
                textAnchor="middle"
                className="tabular-nums"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fill: couleur === HAUSSE ? "rgb(var(--a-chart-up-ink))" : "rgb(var(--a-chart-down-ink))",
                }}
              >
                {montantCourt(points[n - 1].cloture)}
              </text>
            </g>
          )}

          {p && actif != null && (
            <Reticule
              x={geo.cx(actif)}
              y={geo.y(p.cloture)}
              plotL={geo.plotL}
              bas={geo.volBas}
              montant={montantCourt(p.cloture)}
              date={etiquette(p, granularite)}
              couleur={
                mode === "courbe"
                  ? couleur
                  : p.cloture > p.ouverture
                    ? HAUSSE
                    : p.cloture < p.ouverture
                      ? BAISSE
                      : NEUTRE
              }
            />
          )}

          <rect
            x={0}
            y={0}
            width={geo.plotL}
            height={geo.volBas}
            fill="transparent"
            onPointerMove={(e) => onActif(geo.index(e.clientX - e.currentTarget.getBoundingClientRect().left))}
            onPointerDown={(e) => onActif(geo.index(e.clientX - e.currentTarget.getBoundingClientRect().left))}
            onPointerLeave={() => onActif(null)}
          />
        </svg>
      )}
      {silence && (
        <p className="pointer-events-none absolute inset-x-0 top-[34%] px-4 text-center text-[13px] text-admin-muted" style={{ paddingRight: AXE_Y }}>
          Aucun achat ni vente sur cette période.
        </p>
      )}
    </div>
  );
}

/** Réticule : lignes guides, point, montant sur l'axe et date en bas. */
function Reticule({
  x,
  y,
  plotL,
  bas,
  montant,
  date,
  couleur,
}: {
  x: number;
  y: number;
  plotL: number;
  bas: number;
  montant: string;
  date: string;
  couleur: string;
}) {
  const largeurDate = date.length * 6.6 + 16;
  const xDate = Math.min(plotL - largeurDate / 2, Math.max(largeurDate / 2, x));
  return (
    <g pointerEvents="none">
      <line x1={x} x2={x} y1={MARGE_HAUT} y2={bas} className="stroke-admin-ink" strokeOpacity={0.3} strokeWidth={1} shapeRendering="crispEdges" />
      <line x1={0} x2={plotL} y1={y} y2={y} className="stroke-admin-ink" strokeOpacity={0.3} strokeWidth={1} shapeRendering="crispEdges" />
      <circle cx={x} cy={y} r={4.5} strokeWidth={2} style={{ fill: couleur, stroke: "rgb(var(--a-card))" }} />
      <rect x={plotL + 3} y={y - 9} width={AXE_Y - 5} height={18} rx={4} className="fill-admin-ink" />
      <text
        x={plotL + 3 + (AXE_Y - 5) / 2}
        y={y}
        dy="0.34em"
        textAnchor="middle"
        className="fill-admin-card tabular-nums"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        {montant}
      </text>
      <rect x={xDate - largeurDate / 2} y={bas + 4} width={largeurDate} height={18} rx={4} className="fill-admin-ink" />
      <text x={xDate} y={bas + 13} dy="0.34em" textAnchor="middle" className="fill-admin-card" style={{ fontSize: 11, fontWeight: 600 }}>
        {date}
      </text>
    </g>
  );
}

/** Les mêmes chiffres en tableau (le plus récent en haut, jours sans mouvement masqués). */
function Tableau({ points, granularite, nomPrec }: { points: PointEvolution[]; granularite: Granularite; nomPrec: string }) {
  const lignes = points.filter(aBouge).reverse();
  const avecPrecedente = points.some((p) => p.precedent != null);
  const masques = points.length - lignes.length;
  const unite = UNITES[granularite];
  return (
    <div className="mt-3 flex h-[236px] flex-col sm:h-[300px]">
      {lignes.length === 0 ? (
        <p className="m-auto text-[13px] text-admin-muted">Aucun achat ni vente sur cette période.</p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-admin-line-soft">
            <table className="w-full min-w-[600px] text-left text-[13px]">
              <thead className="sticky top-0 z-[1] bg-admin-card text-xs text-admin-muted">
                <tr className="border-b border-admin-line-soft">
                  <th className="py-2 pl-3 pr-3 font-medium">{unite.colonne}</th>
                  <th className="py-2 pr-3 text-right font-medium">Ventes</th>
                  <th className="py-2 pr-3 text-right font-medium">Achats</th>
                  <th className="py-2 pr-3 text-right font-medium">Frais eBay</th>
                  <th className="py-2 pr-3 text-right font-medium">Net</th>
                  <th className="py-2 pr-3 text-right font-medium">Profit cumulé</th>
                  {avecPrecedente && <th className="py-2 pr-3 text-right font-medium">{nomPrec}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line-soft tabular-nums">
                {lignes.map((p) => (
                  <tr key={p.debut}>
                    <td className="whitespace-nowrap py-2 pl-3 pr-3 text-admin-ink">{titre(p, granularite, true)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right text-admin-ink">{formatMoney(p.ventes)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right text-admin-ink">{formatMoney(p.achats)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right text-admin-muted">{formatMoney(p.frais)}</td>
                    <td
                      className={`whitespace-nowrap py-2 pr-3 text-right font-semibold ${
                        p.net > 0 ? "text-admin-green" : p.net < 0 ? "text-admin-danger" : "text-admin-muted"
                      }`}
                    >
                      {signe(p.net)}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right font-medium text-admin-ink">{formatMoney(p.cloture)}</td>
                    {avecPrecedente && (
                      <td className="whitespace-nowrap py-2 pr-3 text-right text-admin-muted">
                        {p.precedent == null ? "—" : formatMoney(p.precedent)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {masques > 0 && (
            <p className="mt-2 text-xs text-admin-muted">
              {masques} {masques > 1 ? unite.pluriel : unite.colonne.toLowerCase()} sans achat ni vente masqué
              {unite.feminin ? "e" : ""}
              {masques > 1 ? "s" : ""}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Stats({ points, granularite }: { points: PointEvolution[]; granularite: Granularite }) {
  const s = statsEvolution(points);
  const u = UNITES[granularite];
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-admin-line-soft pt-4 lg:grid-cols-4">
      <Stat
        label={u.meilleur}
        valeur={s.meilleur ? signe(s.meilleur.net) : "—"}
        sous={s.meilleur ? titre(s.meilleur, granularite, true) : "Aucune hausse"}
        ton={s.meilleur ? "hausse" : undefined}
      />
      <Stat
        label={u.pire}
        valeur={s.pire ? signe(s.pire.net) : "—"}
        sous={s.pire ? titre(s.pire, granularite, true) : u.aucuneBaisse}
        ton={s.pire ? "baisse" : undefined}
      />
      <Stat label={u.hausses} valeur={`${s.hausses} sur ${points.length}`} sous={`${s.baisses} en baisse`} />
      <Stat label={u.moyenne} valeur={signe(s.moyenne)} sous={`sur ${points.length} ${u.pluriel}`} />
    </dl>
  );
}

function Stat({ label, valeur, sous, ton }: { label: string; valeur: string; sous: string; ton?: "hausse" | "baisse" }) {
  const couleur = ton === "hausse" ? "text-admin-green" : ton === "baisse" ? "text-admin-danger" : "text-admin-ink";
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-admin-muted">{label}</dt>
      <dd className={`mt-1 truncate font-display text-[17px] font-semibold tracking-tight ${couleur}`}>{valeur}</dd>
      <dd className="mt-0.5 text-xs leading-snug text-admin-muted">{sous}</dd>
    </div>
  );
}
