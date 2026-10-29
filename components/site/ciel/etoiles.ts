import { CIEL, ETOILES } from "./ciel";

/**
 * Ciel de nuit de Montréal en étoiles vertes : code commun au héros de l'accueil
 * (components/accueil/hero/HeroFx.tsx) et à celui des pages intérieures
 * (components/site/CielEtoiles.tsx). Module ordinaire (pas "use client") :
 * constantes, cadrage, poussière d'étoiles et dessin des étoiles. Les fonctions qui
 * créent des canvas (haloSprite, creerEtoiles) ne s'appellent que côté client,
 * dans un effet.
 */

export const TAU = Math.PI * 2;
/** cadre de référence de ciel.ts (px) */
export const REF_W = CIEL.largeur;
export const REF_H = CIEL.hauteur;
/** nombre d'étoiles */
export const N = ETOILES.length / 4;

/** Couleurs des étoiles : les verts de la marque, selon la classe de température du catalogue (froide … chaude) */
export const STAR_RGB = [
  [52, 211, 153],
  [94, 203, 51],
  [94, 203, 51],
  [139, 233, 95],
  [170, 245, 130],
] as const;
export const CLASSES = STAR_RGB.length;
/** vert de la marque */
export const GREEN = [94, 203, 51] as const;

/** Paliers d'opacité des étoiles : un seul fill par couleur et par palier */
export const TIERS = 32;
export const BUCKETS = CLASSES * (TIERS + 1);
export const FILLS = STAR_RGB.map(([r, g, b]) =>
  Array.from({ length: TIERS + 1 }, (_, t) => `rgba(${r}, ${g}, ${b}, ${(t / TIERS).toFixed(3)})`),
);

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Pointeur : poussée douce autour du curseur, ressort de retour, frottement par image */
export const PUSH = 0.25;
export const SPRING = 0.005;
export const FRICTION = 0.9;
/** Étoiles avec halo : magnitude inférieure à ce seuil */
export const HALO_MAG = 2.4;
/** Poussière d'étoiles faibles : nombre de points pour un écran 1440×900 */
export const DUST_REF = 1100;
export const DUST_TIERS = 8;
/** Mode allégé : part de la poussière conservée */
export const LITE_SHARE = 0.5;

/** marque « étoile hors cadre » dans Etoiles.bucket */
const SKIP = 0xffff;

export type Pointeur = { x: number; y: number; on: boolean };

/** Sprite de halo (dégradé radial pré-rendu) pour une couleur d'étoile */
export function haloSprite([r, g, b]: readonly [number, number, number]) {
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

/** Étoiles : tableaux alloués une fois (positions, vitesses, apparence, tri par couleur et palier) */
export type Etoiles = {
  homeX: Float32Array;
  homeY: Float32Array;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  rad: Float32Array;
  base: Float32Array;
  fade: Float32Array;
  phase: Float32Array;
  freq: Float32Array;
  /** amplitude de la scintillation (plus forte près de l'horizon) */
  tau: Float32Array;
  /** scintillation courante (1 = aucune) */
  tw: Float32Array;
  cls: Uint8Array;
  halo: Uint8Array;
  bucket: Uint16Array;
  order: Uint16Array;
  counts: Uint16Array;
  starts: Uint16Array;
  sprites: HTMLCanvasElement[];
};

export function creerEtoiles(): Etoiles {
  const e: Etoiles = {
    homeX: new Float32Array(N),
    homeY: new Float32Array(N),
    px: new Float32Array(N),
    py: new Float32Array(N),
    vx: new Float32Array(N),
    vy: new Float32Array(N),
    rad: new Float32Array(N),
    base: new Float32Array(N),
    fade: new Float32Array(N).fill(1),
    phase: new Float32Array(N),
    freq: new Float32Array(N),
    tau: new Float32Array(N),
    tw: new Float32Array(N).fill(1),
    cls: new Uint8Array(N),
    halo: new Uint8Array(N),
    bucket: new Uint16Array(N),
    order: new Uint16Array(N),
    counts: new Uint16Array(BUCKETS),
    starts: new Uint16Array(BUCKETS + 1),
    sprites: STAR_RGB.map(haloSprite),
  };
  for (let i = 0; i < N; i++) {
    const mag = ETOILES[i * 4 + 2];
    const fl = Math.pow(10, -0.4 * (mag - 6));
    // le vert est moins lumineux que le blanc : étoiles un peu plus grosses et plus opaques
    e.rad[i] = 0.45 + 0.3 * Math.pow(fl, 0.38);
    e.base[i] = Math.min(1, 0.4 + 0.14 * Math.sqrt(fl));
    e.cls[i] = clamp(ETOILES[i * 4 + 3], 0, CLASSES - 1);
    e.halo[i] = mag < HALO_MAG ? 1 : 0;
    e.phase[i] = Math.random() * TAU;
    e.freq[i] = 0.5 + Math.random() * 1.1;
  }
  return e;
}

/** Cadrage « cover » du cadre de référence ; en portrait, centré sur x = 0,30 (Grande Ourse) */
export function cadrer(w: number, h: number) {
  const S = Math.max(w / REF_W, h / REF_H);
  // portrait : centré sur x = 0,30 du cadre, sans jamais montrer de vide
  const ox = w < h ? clamp(w / 2 - 0.3 * REF_W * S, w - REF_W * S, 0) : (w - REF_W * S) / 2;
  const oy = (h - REF_H * S) / 2;
  return { S, ox, oy };
}

/** Rayons d'action du pointeur (px) : poussée des étoiles et grossissement */
export function rayonsPointeur(w: number, h: number) {
  const linkDist = clamp(Math.min(w, h) * 0.15, 90, 150);
  return { pushR: Math.max(110, linkDist * 1.05), growR: linkDist * 1.45 };
}

/** Remet chaque étoile chez elle pour une boîte w × h (au redimensionnement) */
export function placerEtoiles(e: Etoiles, w: number, h: number) {
  const { S, ox, oy } = cadrer(w, h);
  const { homeX, homeY, px, py, vx, vy, tau } = e;
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

/**
 * Poussière d'étoiles faibles, répartie uniformément (graine fixe : même ciel à chaque
 * visite), sur un canevas statique de w × h px CSS. Part réduite en mode allégé.
 */
export function peindrePoussiere(
  fc: CanvasRenderingContext2D,
  fond: HTMLCanvasElement,
  dpr: number,
  w: number,
  h: number,
  lite: boolean,
) {
  if (!w) return;
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.clearRect(0, 0, fond.width, fond.height);
  fc.setTransform(dpr, 0, 0, dpr, 0, 0);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const count = Math.round(DUST_REF * ((w * h) / (1440 * 900)) * (lite ? LITE_SHARE : 1));
  const dust = new Float32Array(count * 4);
  for (let p = 0; p < count; p++) {
    const a = 0.1 + rnd() * 0.22;
    dust[p * 4] = rnd() * w;
    dust[p * 4 + 1] = rnd() * h;
    dust[p * 4 + 2] = 0.35 + rnd() * 0.3;
    dust[p * 4 + 3] = Math.min(DUST_TIERS - 1, Math.floor(((a - 0.1) / 0.22) * DUST_TIERS));
  }
  for (let t = 0; t < DUST_TIERS; t++) {
    fc.beginPath();
    for (let p = 0; p < count; p++) {
      if (dust[p * 4 + 3] !== t) continue;
      const x = dust[p * 4];
      const y = dust[p * 4 + 1];
      const r = dust[p * 4 + 2];
      fc.moveTo(x + r, y);
      fc.arc(x, y, r, 0, TAU);
    }
    fc.fillStyle = `rgba(94, 203, 51, ${(0.12 + ((t + 0.5) / DUST_TIERS) * 0.24).toFixed(3)})`;
    fc.fill();
  }
}

/** léger grossissement près du curseur (×1,5 au plus) */
function grow(x: number, y: number, pointer: Pointeur, G: number, G2: number) {
  if (!pointer.on) return 1;
  const dx = x - pointer.x;
  const dy = y - pointer.y;
  const d2 = dx * dx + dy * dy;
  return d2 < G2 ? 1 + 0.5 * (1 - Math.sqrt(d2) / G) : 1;
}

/* ───────────── Peintre : mêmes tracés, préparés une seule fois ───────────── */

/** Ce que l'accueil dessine sous les étoiles (traits des constellations, traînées de l'hyperespace) */
export type Dessous = {
  /** diffère de ce que montre le canevas : l'image doit être redessinée */
  change: boolean;
  /** dessin, juste après l'effacement du canevas */
  dessiner(c2: CanvasRenderingContext2D): void;
};

/**
 * Mémoire du dessin des étoiles d'une image à l'autre. Chaque image garde exactement les
 * tracés d'origine (effacement, halos, puis un fill par groupe de couleur × palier avec les
 * mêmes disques dans le même ordre), mais le chemin de chaque groupe est un Path2D gardé tant
 * que ses disques ne changent pas : seuls les groupes qu'une étoile quitte ou rejoint sont
 * reconstruits (Path2D donne les mêmes pixels que le chemin du contexte). Quand rien ne change
 * (scintillation sous le palier suivant, halos et dessous identiques), l'image n'est pas
 * redessinée : le canevas montre déjà exactement ce dessin.
 */
export type Peintre = {
  /** faux : canevas effacé ou redimensionné, tous les chemins sont à refaire */
  pret: boolean;
  w: number;
  h: number;
  /** dessin affiché, par étoile : groupe, position, rayon du disque, alpha du halo */
  bucket: Uint16Array;
  x: Float32Array;
  y: Float32Array;
  r: Float64Array;
  a: Float64Array;
  /** image en cours : rayon du disque (grossissement compris), alpha du halo */
  rayon: Float64Array;
  alpha: Float64Array;
  /** chemin de chaque groupe, groupes à reconstruire */
  groupe: (Path2D | null)[];
  sale: Uint8Array;
};

export function creerPeintre(): Peintre {
  return {
    pret: false,
    w: 0,
    h: 0,
    bucket: new Uint16Array(N),
    x: new Float32Array(N),
    y: new Float32Array(N),
    r: new Float64Array(N),
    a: new Float64Array(N),
    rayon: new Float64Array(N),
    alpha: new Float64Array(N),
    groupe: new Array<Path2D | null>(BUCKETS).fill(null),
    sale: new Uint8Array(BUCKETS),
  };
}

/**
 * Groupes par couleur et palier d'opacité (tri par dénombrement, sans allocation : un seul
 * fill par groupe), rayon du disque et alpha du halo de chaque étoile pour l'image en cours.
 */
function grouper(e: Etoiles, p: Peintre, w: number, h: number, pointer: Pointeur, growR: number) {
  const { px, py, rad, base, tw, fade, cls, halo, bucket, order, counts, starts } = e;
  const { rayon, alpha } = p;
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
    rayon[i] = rad[i] * grow(x, y, pointer, G, G2);
    alpha[i] = halo[i] ? 0.22 * tw[i] * fade[i] : 0;
  }
  starts[0] = 0;
  for (let b = 0; b < BUCKETS; b++) starts[b + 1] = starts[b] + counts[b];
  for (let i = 0; i < N; i++) {
    const b = bucket[i];
    if (b !== SKIP) order[starts[b] + --counts[b]] = i;
  }
}

/** Compare l'image en cours au dessin affiché et marque les groupes à reconstruire ; vrai si l'image change */
function comparer(e: Etoiles, p: Peintre, w: number, h: number) {
  const { px, py, halo, bucket } = e;
  const { rayon, alpha, sale } = p;
  if (!p.pret || p.w !== w || p.h !== h) {
    sale.fill(1);
    return true;
  }
  sale.fill(0);
  let change = false;
  for (let i = 0; i < N; i++) {
    const nb = bucket[i];
    const ob = p.bucket[i];
    if (nb !== ob) {
      // l'étoile quitte un groupe et en rejoint un autre : les deux chemins changent
      if (ob !== SKIP) sale[ob] = 1;
      if (nb !== SKIP) sale[nb] = 1;
      change = true;
    } else if (nb !== SKIP) {
      if (px[i] !== p.x[i] || py[i] !== p.y[i] || rayon[i] !== p.r[i]) {
        sale[nb] = 1;
        change = true;
      } else if (halo[i] && alpha[i] !== p.a[i]) change = true;
    }
  }
  return change;
}

/**
 * Peint les étoiles (et le dessous de l'accueil) dans un contexte déjà à l'échelle dpr :
 * halos des plus brillantes, puis disques groupés par couleur et palier d'opacité. Mettre
 * p.pret à faux quand le canevas est effacé (redimensionnement). Rend vrai si l'image a été
 * redessinée, faux si elle était déjà à l'écran.
 */
export function peindreEtoiles(
  c2: CanvasRenderingContext2D,
  p: Peintre,
  e: Etoiles,
  w: number,
  h: number,
  pointer: Pointeur,
  growR: number,
  dessous?: Dessous,
) {
  grouper(e, p, w, h, pointer, growR);
  if (!comparer(e, p, w, h) && !dessous?.change) return false;

  const { px, py, cls, halo, bucket, order, starts, sprites } = e;
  const { rayon, alpha, groupe, sale } = p;
  // chemins des groupes modifiés : mêmes disques, même ordre que le tri
  for (let b = 1; b < BUCKETS; b++) {
    if (!sale[b]) continue;
    const from = starts[b];
    const to = starts[b + 1];
    if (from === to) {
      groupe[b] = null;
      continue;
    }
    const g = new Path2D();
    for (let o = from; o < to; o++) {
      const i = order[o];
      const r = rayon[i];
      g.moveTo(px[i] + r, py[i]);
      g.arc(px[i], py[i], r, 0, TAU);
    }
    groupe[b] = g;
  }

  c2.clearRect(0, 0, w, h);
  dessous?.dessiner(c2);

  // halos doux des étoiles brillantes (sprite pré-rendu)
  for (let i = 0; i < N; i++) {
    if (!halo[i] || bucket[i] === SKIP) continue;
    const r = rayon[i] * 6;
    c2.globalAlpha = alpha[i];
    c2.drawImage(sprites[cls[i]], px[i] - r, py[i] - r, r * 2, r * 2);
  }
  c2.globalAlpha = 1;

  for (let b = 1; b < BUCKETS; b++) {
    if (starts[b] === starts[b + 1]) continue;
    c2.fillStyle = FILLS[(b / (TIERS + 1)) | 0][b % (TIERS + 1)];
    c2.fill(groupe[b]!);
  }

  // ce dessin devient la référence de l'image suivante
  p.bucket.set(bucket);
  p.x.set(px);
  p.y.set(py);
  p.r.set(rayon);
  p.a.set(alpha);
  p.w = w;
  p.h = h;
  p.pret = true;
  return true;
}
