/**
 * Les voyants de l'allée, redessinés un par un sur un canevas.
 *
 * Les données viennent de la photo elle-même (scrollcraft/builds/
 * techno-lot-datacenter/lab/leds.py) : pour chaque voyant, son centre, son
 * rayon et la boîte de sa lumière propre dans allee-voyants.webp (la photo
 * moins la plaque « voyants effacés »). Redessiner cette lumière par-dessus la
 * plaque, en fusion additive, redonne exactement la photo ; en changer
 * l'intensité fait vivre chaque voyant.
 *
 * Deux usages :
 *  - « flash » (hero) : la vidéo est dessous, on ne peut qu'ajouter de la
 *    lumière. Les voyants d'activité s'emballent par rafales, les voyants de
 *    veille battent lentement.
 *  - « full » (le pic) : la plaque sombre est dessous, chaque voyant a son
 *    intensité complète, et la progression de l'acte les éteint baie par baie
 *    (dernier clignotement, puis noir). En remontant, ils se rallument.
 */

export type LedRaw = [number, number, number, number, number, number, number];
export type LedJson = { w: number; h: number; l: LedRaw[] };

/** Image -> écran : x écran = ox + X * k (pixels CSS du canevas). */
export type Mapping = { ox: number; oy: number; k: number };

export type Band = { x0: number; x1: number; start: number };

type Led = {
  x: number;
  y: number;
  bx: number;
  by: number;
  bw: number;
  bh: number;
  kind: 0 | 1 | 2; // 0 stable, 1 activité, 2 veille (clignote lentement)
  ph: number;
  f: number;
  b0: number;
  b1: number;
  off: number; // seuil de mise hors tension (progression de l'acte)
  u: number; // aléa propre au voyant, pour son rang dans sa baie
  bi: number; // sa baie
  dead: boolean;
  tc: number; // dernier changement d'état (ms)
};

// Générateur déterministe : le même aléa à chaque chargement, donc les mêmes
// captures d'écran d'une vérification à l'autre.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dernier clignotement d'un voyant qu'on éteint : 8 pas de 35 ms.
const DEATH = [1, 0.05, 0.9, 0, 0.55, 0, 0.22, 0];
const DEATH_MS = DEATH.length * 35;
const REVIVE_MS = 140;

export class LedField {
  readonly canvas: HTMLCanvasElement;
  readonly mode: "flash" | "full";
  reduced = false;
  private ctx: CanvasRenderingContext2D | null;
  private sprite: CanvasImageSource | null = null;
  private leds: Led[] = [];
  private map: Mapping = { ox: 0, oy: 0, k: 1 };
  private dpr = 1;
  private cw = 0;
  private ch = 0;
  private px = -1e6;
  private py = -1e6;
  private pointerOn = false;
  /** Nombre de voyants encore allumés (pour la vérification). */
  alive = 0;

  constructor(canvas: HTMLCanvasElement, mode: "flash" | "full") {
    this.canvas = canvas;
    this.mode = mode;
    this.ctx = canvas.getContext("2d", { alpha: true });
  }

  get ready() {
    return !!this.sprite && this.leds.length > 0;
  }

  private spread = 0.035;

  setData(json: LedJson, sprite: CanvasImageSource, bands: Band[] | null, spread = 0.035) {
    const rnd = mulberry32(this.mode === "full" ? 7 : 3);
    this.sprite = sprite;
    this.spread = spread;
    this.leds = json.l.map(([x, y, , bx, by, bw, bh]) => {
      const k = rnd();
      // Au repos (hero), plus de voyants d'activité : c'est le premier écran,
      // il doit vivre avant tout défilement.
      const steady = this.mode === "flash" ? 0.52 : 0.62;
      const kind: 0 | 1 | 2 = k < steady ? 0 : k < 0.9 ? 1 : 2;
      let bi = -1;
      if (bands) {
        bi = bands.findIndex((b) => x >= b.x0 && x < b.x1);
        if (bi < 0) {
          // hors de toute baie : rattaché à la plus proche
          let bestD = Infinity;
          bands.forEach((b, i) => {
            const d = Math.min(Math.abs(x - b.x0), Math.abs(x - b.x1));
            if (d < bestD) {
              bestD = d;
              bi = i;
            }
          });
        }
      }
      const u = rnd();
      return {
        x,
        y,
        bx,
        by,
        bw,
        bh,
        kind,
        ph: rnd(),
        f: kind === 1 ? 4 + rnd() * 5 : 1.1 + rnd() * 1.6,
        b0: rnd() * 6,
        b1: 0,
        off: bands && bi >= 0 ? bands[bi].start + u * spread : 2,
        u,
        bi,
        dead: false,
        tc: -1e9,
      };
    });
    this.leds.forEach((l) => (l.b1 = l.b0 + 0.12 + rnd() * 0.6));
  }

  /** Nouveaux départs des baies (même découpage) : sur un écran étroit, la
   *  vague est recalée sur les baies réellement visibles. */
  setBands(bands: Band[]) {
    for (const l of this.leds) if (l.bi >= 0 && bands[l.bi]) l.off = bands[l.bi].start + l.u * this.spread;
  }

  /** Taille du canevas = sa boîte CSS, densité plafonnée (les voyants sont doux). */
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.cw = Math.max(1, Math.round(r.width));
    this.ch = Math.max(1, Math.round(r.height));
    const w = Math.round(this.cw * this.dpr);
    const h = Math.round(this.ch * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  setMapping(m: Mapping) {
    this.map = m;
  }

  setPointer(x: number | null, y = 0) {
    if (x === null) {
      this.pointerOn = false;
      return;
    }
    this.pointerOn = true;
    this.px = x;
    this.py = y;
  }

  /** Met à jour l'état allumé / éteint d'après la progression de l'acte. */
  power(p: number, now: number) {
    let alive = 0;
    for (const l of this.leds) {
      const dead = p >= l.off;
      if (dead !== l.dead) {
        l.dead = dead;
        l.tc = now;
      }
      if (!dead) alive++;
    }
    this.alive = alive;
  }

  /** Intensité « vivante » d'un voyant (1 = comme sur la photo). */
  private level(l: Led, t: number): number {
    if (this.reduced) return 1;
    let v = 1;
    if (l.kind === 1) {
      if (t > l.b1) {
        // prochaine rafale : la cadence varie d'un voyant à l'autre
        const gap = 0.4 + ((l.ph * 9.7 + t * 0.37) % 1) * 3.8;
        l.b0 = t + gap;
        l.b1 = l.b0 + 0.15 + ((l.ph * 5.3 + t * 0.11) % 1) * 0.7;
      }
      if (t >= l.b0 && t <= l.b1) {
        const on = Math.sin((t * l.f + l.ph) * Math.PI * 2) > 0;
        // en « flash » on ne peut qu'ajouter de la lumière : l'éclat est plus fort
        v = this.mode === "flash" ? (on ? 1.95 : 1) : on ? 1.35 : 0.25;
      }
    } else if (l.kind === 2) {
      const s = Math.sin((t / l.f + l.ph) * Math.PI * 2);
      v = this.mode === "full" ? (s > 0 ? 1 : 0.15) : s > 0.86 ? 2 : 1;
    }
    if (this.pointerOn) {
      const sx = this.map.ox + l.x * this.map.k;
      const sy = this.map.oy + l.y * this.map.k;
      const d = Math.hypot(sx - this.px, sy - this.py);
      const R = 150;
      if (d < R) {
        // sous le pointeur, les voyants s'emballent comme un disque qu'on lit
        const w = 1 - d / R;
        const on = Math.sin((t * (6 + l.ph * 6) + l.ph) * Math.PI * 2) > -0.2;
        const hi = this.mode === "flash" ? 2.3 : 1.7;
        const lo = this.mode === "flash" ? 1 : 0.3;
        v = v * (1 - w) + (on ? hi : lo) * w;
      }
    }
    return v;
  }

  /** Coefficient d'alimentation (mode full) : 1 allumé, 0 éteint, avec le dernier clignotement. */
  private powerAlpha(l: Led, now: number): number {
    const dt = now - l.tc;
    if (l.dead) {
      if (this.reduced || dt >= DEATH_MS) return 0;
      return DEATH[Math.min(DEATH.length - 1, Math.floor(dt / 35))];
    }
    if (!this.reduced && dt < REVIVE_MS) return dt / REVIVE_MS;
    return 1;
  }

  render(now: number, opacity = 1) {
    const ctx = this.ctx;
    if (!ctx || !this.sprite) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (opacity <= 0.002) return;
    const { ox, oy, k } = this.map;
    const d = this.dpr;
    const t = now / 1000;
    ctx.globalCompositeOperation = "lighter";
    const W = this.cw;
    const H = this.ch;
    for (const l of this.leds) {
      const sx = ox + l.bx * k;
      const sy = oy + l.by * k;
      const sw = l.bw * k;
      const sh = l.bh * k;
      if (sx > W || sy > H || sx + sw < 0 || sy + sh < 0) continue;
      let a: number;
      if (this.mode === "full") {
        const pa = this.powerAlpha(l, now);
        if (pa <= 0.002) continue;
        a = this.level(l, t) * pa;
      } else {
        a = (this.level(l, t) - 1) * 0.9;
      }
      a *= opacity;
      if (a <= 0.01) continue;
      // au-delà de 1, on redessine la même lumière : un voyant plus fort
      while (a > 0.002) {
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(this.sprite, l.bx, l.by, l.bw, l.bh, sx * d, sy * d, sw * d, sh * d);
        a -= 1;
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  clear() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

/** Charge la liste et la lumière des voyants une seule fois pour toute la page. */
let shared: Promise<{ json: LedJson; sprite: CanvasImageSource }> | null = null;
export function loadLeds(): Promise<{ json: LedJson; sprite: CanvasImageSource }> {
  if (!shared) {
    shared = Promise.all([
      fetch("/accueil/allee-voyants.json").then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<LedJson>;
      }),
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = "/accueil/allee-voyants.webp";
      }).then(async (img) => {
        // Un ImageBitmap se dessine sans redécoder à chaque image.
        try {
          return await createImageBitmap(img);
        } catch {
          return img;
        }
      }),
    ]).then(([json, sprite]) => ({ json, sprite }));
    shared.catch(() => {
      shared = null;
    });
  }
  return shared;
}
