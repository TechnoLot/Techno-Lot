// Courbes d'animation. Tout est fonction pure du temps : l'image t ne dépend
// d'aucun état précédent (indispensable pour le flou de bougé par sous-images).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const remap = (x, a, b, c, d) => lerp(c, d, invLerp(a, b, x));
export const smooth = (a, b, x) => {
  const t = invLerp(a, b, x);
  return t * t * (3 - 2 * t);
};
export const smoother = (a, b, x) => {
  const t = invLerp(a, b, x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export const expoOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const expoIn = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, 10 * t - 10));
export const expoInOut = (t) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
export const cubicOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const cubicIn = (t) => Math.pow(clamp(t), 3);
export const cubicInOut = (t) => ((t = clamp(t)) < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const quartOut = (t) => 1 - Math.pow(1 - clamp(t), 4);
export const quintOut = (t) => 1 - Math.pow(1 - clamp(t), 5);
export const quintInOut = (t) => ((t = clamp(t)) < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
export const sineInOut = (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
export const backOut = (t, s = 1.70158) => {
  t = clamp(t) - 1;
  return t * t * ((s + 1) * t + s) + 1;
};

// Ressort amorti : réponse 0 → 1 d'un oscillateur (f en Hz, z = amortissement).
// z ≈ 0,5 donne le léger dépassement « à l'arrivée » ; t en secondes depuis le départ.
export function spring(t, f = 2.4, z = 0.55) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f;
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

// Arrivée en ressort entre deux valeurs, déclenchée à t0
export const springTo = (t, t0, a, b, f, z) => lerp(a, b, spring(t - t0, f, z));

// Hachage et bruit déterministes
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
export const hash2 = (a, b) => hash(a * 12.9898 + b * 78.233);
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
}
// Bruit fractal lisse (dérive de caméra « à l'épaule » très légère)
export const fbm1 = (x, seed = 0) => noise1(x, seed) * 0.6 + noise1(x * 2.13, seed + 7) * 0.28 + noise1(x * 4.37, seed + 13) * 0.12;

// Séquences à faible discrépance pour les sous-images
export function halton(i, b) {
  let f = 1, r = 0;
  while (i > 0) {
    f /= b;
    r += f * (i % b);
    i = Math.floor(i / b);
  }
  return r;
}

// Rampe de vitesse : temps remappé (lent → très rapide → lent) entre a et b
export const ramp = (t, a, b, k = expoInOut) => k(invLerp(a, b, t));

// Fenêtre d'activité d'un élément : 0 avant a, 1 entre a+fi et b-fo, 0 après b
export const win = (t, a, b, fi = 0.2, fo = 0.2) => Math.min(smooth(a, a + fi, t), 1 - smooth(b - fo, b, t));
