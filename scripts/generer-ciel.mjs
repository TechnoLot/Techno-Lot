/**
 * Génère components/accueil/hero/ciel.ts : les vraies étoiles du héros de l'accueil,
 * le ciel de nuit vu de Montréal vers le nord-nord-est (Grande Ourse, Cassiopée).
 *
 * Source : catalogue Yale Bright Star (BSC5), version courte de brettonw.
 * Usage : node scripts/generer-ciel.mjs [chemin/vers/bsc5-short.json]
 * Sans argument, le catalogue est téléchargé. Ne tourne PAS au build : ciel.ts est
 * versionné. Sortie déterministe (même catalogue → même fichier).
 *
 * Projection stéréographique centrée sur la visée (azimut, altitude), sur un cadre
 * de référence LARGEUR × HAUTEUR ; HeroFx.tsx le cadre ensuite en « cover ».
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://raw.githubusercontent.com/brettonw/YaleBrightStarCatalog/master/bsc5-short.json";
const SORTIE = join(dirname(fileURLToPath(import.meta.url)), "..", "components", "accueil", "hero", "ciel.ts");

/** Paramètres (repris tels quels dans ciel.ts) */
const CIEL = {
  latitude: 45.5, // Montréal, degrés nord
  tempsSideral: 19.8, // temps sidéral local, heures
  azimut: 10, // visée, degrés vers l'est depuis le nord
  altitude: 40, // visée, degrés au-dessus de l'horizon
  champ: 100, // champ horizontal, degrés
  largeur: 1600, // cadre de référence, px
  hauteur: 1000,
  magnitudeMax: 5.4, // magnitude V limite
  marge: 0.12, // étoiles gardées si x et y sont dans [-marge ; 1 + marge]
};

/** Figures : chaînes de numéros HR (Grande Ourse : casserole puis manche ; Cassiopée) */
const FIGURES_HR = [
  [4301, 4295, 4554, 4660, 4301],
  [4660, 4905, 5054, 5191],
  [21, 168, 264, 403, 542],
];
/** Constellations : index des chaînes de FIGURES qui en font partie */
const CONSTELLATIONS = [
  [0, 1], // Grande Ourse
  [2], // Cassiopée
];

async function lireCatalogue(chemin) {
  if (chemin) return JSON.parse(readFileSync(chemin, "utf8"));
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Téléchargement du catalogue impossible (${res.status})`);
  return res.json();
}

const D = Math.PI / 180;
const PHI = CIEL.latitude * D;
const LST = CIEL.tempsSideral * 15 * D;
const A0 = CIEL.altitude * D;
const AZ = CIEL.azimut * D;
const W = CIEL.largeur;
const H = CIEL.hauteur;
const K = W / 2 / (2 * Math.tan((CIEL.champ / 4) * D));

const parseRA = (s) => {
  const m = s.match(/(\d+)h (\d+)m ([\d.]+)s/);
  return (+m[1] + +m[2] / 60 + +m[3] / 3600) * 15 * D;
};
const parseDec = (s) => {
  const m = s.match(/([+-])(\d+)° (\d+)′ ([\d.]+)″/);
  const v = +m[2] + +m[3] / 60 + +m[4] / 3600;
  return (m[1] === "-" ? -v : v) * D;
};

// repère local (nord, est, zénith) ; caméra tournée vers l'azimut AZ, inclinée de A0
const f = [Math.cos(A0) * Math.cos(AZ), Math.cos(A0) * Math.sin(AZ), Math.sin(A0)];
const r = [-Math.sin(AZ), Math.cos(AZ), 0];
const u = [-Math.sin(A0) * Math.cos(AZ), -Math.sin(A0) * Math.sin(AZ), Math.cos(A0)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function dirOf(ra, dec) {
  const h = LST - ra;
  return [
    Math.sin(dec) * Math.cos(PHI) - Math.cos(dec) * Math.cos(h) * Math.sin(PHI),
    -Math.cos(dec) * Math.sin(h),
    Math.sin(dec) * Math.sin(PHI) + Math.cos(dec) * Math.cos(h) * Math.cos(PHI),
  ];
}
function project(s) {
  const c = dot(s, f);
  if (c < -0.2) return null;
  const x = (2 * dot(s, r)) / (1 + c);
  const y = (2 * dot(s, u)) / (1 + c);
  return [W / 2 + K * x, H / 2 - K * y, s[2]];
}

/** Classe de couleur selon la température (K) : 0 orangée … 4 bleutée */
const classe = (k) => (k < 4000 ? 0 : k < 5500 ? 1 : k < 7500 ? 2 : k < 10000 ? 3 : 4);

/** Nombre compact : arrondi, sans zéro final inutile (0.2500 → 0.25) */
const num = (v, d) => {
  const s = String(+v.toFixed(d));
  return s === "-0" ? "0" : s;
};

const catalogue = await lireCatalogue(process.argv[2]);
const hrFigures = new Set(FIGURES_HR.flat());
const etoiles = [];
const indexParHR = new Map();

for (const s of catalogue) {
  const hr = +s.HR;
  const v = parseFloat(s.V);
  const figure = hrFigures.has(hr);
  if (!Number.isFinite(v) || (v > CIEL.magnitudeMax && !figure)) continue;
  const p = project(dirOf(parseRA(s.RA), parseDec(s.Dec)));
  if (!p) continue;
  const [px, py, z] = p;
  if (z < 0.02) continue; // sous l'horizon (ou trop bas pour être vue)
  const x = px / W;
  const y = py / H;
  const m = CIEL.marge;
  if (!figure && (x < -m || x > 1 + m || y < -m || y > 1 + m)) continue;
  indexParHR.set(hr, etoiles.length);
  etoiles.push([x, y, v, classe(+s.K || 6000)]);
}

const figures = FIGURES_HR.map((chaine) =>
  chaine.map((hr) => {
    const i = indexParHR.get(hr);
    if (i === undefined) throw new Error(`Étoile HR ${hr} absente du champ`);
    return i;
  }),
);

const lignes = [];
for (let i = 0; i < etoiles.length; i += 6) {
  lignes.push(
    "  " +
      etoiles
        .slice(i, i + 6)
        .map(([x, y, m, c]) => `${num(x, 4)},${num(y, 4)},${num(m, 1)},${c},`)
        .join(""),
  );
}

const params = Object.entries(CIEL)
  .map(([k, v]) => `  ${k}: ${v},`)
  .join("\n");

const ts = `/**
 * Fichier généré par scripts/generer-ciel.mjs, ne pas modifier à la main.
 * Source : catalogue Yale Bright Star (BSC5), ${SOURCE}
 * Ciel de Montréal : latitude ${CIEL.latitude}° N, temps sidéral local ${CIEL.tempsSideral} h,
 * visée azimut ${CIEL.azimut}° (vers l'est depuis le nord), altitude ${CIEL.altitude}°,
 * champ horizontal ${CIEL.champ}° sur un cadre ${CIEL.largeur}×${CIEL.hauteur}, projection stéréographique.
 * ${etoiles.length} étoiles de magnitude V ≤ ${CIEL.magnitudeMax} (plus celles des figures).
 */

export const CIEL = {
${params}
} as const;

/** À plat, 4 valeurs par étoile : x (fraction de la largeur), y (fraction de la hauteur), magnitude V, classe de couleur (0 orangée … 4 bleutée). */
export const ETOILES: readonly number[] = [
${lignes.join("\n")}
];

/** Traits des figures : chaînes d'index d'étoiles (index dans ETOILES ÷ 4). */
export const FIGURES: readonly (readonly number[])[] = [
${figures.map((c) => `  [${c.join(", ")}],`).join("\n")}
];

/** Constellations : index des chaînes de FIGURES (Grande Ourse : casserole + manche ; Cassiopée). */
export const CONSTELLATIONS: readonly (readonly number[])[] = [
${CONSTELLATIONS.map((c) => `  [${c.join(", ")}],`).join("\n")}
];
`;

writeFileSync(SORTIE, ts);
console.log(JSON.stringify({ etoiles: etoiles.length, figures: figures.map((c) => c.length), octets: Buffer.byteLength(ts) }));
