// Bande-son complète, synthétisée de zéro (aucun échantillon, aucun droit) :
// musique électronique minimaliste à 110 BPM (ré mineur → fa majeur), bruitages
// calés sur les instants de l'image (src/timeline.js), voix fr-CA, ducking −8 dB,
// limiteur, normalisation −14 LUFS.  →  audio/mix.wav (+ audio/voix.wav traitée)
// Boîte à outils (filtres RBJ, oscillateurs, batterie, réverbération, mesure
// BS.1770) reprise de la vidéo 15 s (marketing/video-src/audio.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeTimeline, BEAT, invRowTimes } from "../src/timeline.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SR = 48000, DUR = 30, N = SR * DUR;
const timings = JSON.parse(fs.readFileSync(path.join(ROOT, "voice/timings.json"), "utf8"));
const K = makeTimeline(timings);

// ------------------------------------------------------------ utilitaires
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(30);
const nz = () => R() * 2 - 1;
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const db = (d) => Math.pow(10, d / 20);
const S = (t) => Math.round(t * SR);
const stereo = () => [new Float32Array(N), new Float32Array(N)];
const NOTE = (name) => {
  const m = name.match(/^([A-G])(#|b)?(-?\d)$/);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return 440 * Math.pow(2, (base + (+m[3] + 1) * 12 - 69) / 12);
};
function put(bus, sig, t0, gain = 1, pan = 0) {
  const i0 = S(t0);
  const panAt = typeof pan === "function" ? pan : () => pan;
  for (let i = 0; i < sig.length; i++) {
    const j = i0 + i;
    if (j < 0 || j >= N) continue;
    const p = clamp(panAt(i / SR), -1, 1), a = ((p + 1) * Math.PI) / 4;
    bus[0][j] += sig[i] * gain * Math.cos(a);
    bus[1][j] += sig[i] * gain * Math.sin(a);
  }
}
function putST(bus, L, Rr, t0, gain = 1) {
  const i0 = S(t0);
  for (let i = 0; i < L.length; i++) {
    const j = i0 + i;
    if (j < 0 || j >= N) continue;
    bus[0][j] += L[i] * gain;
    bus[1][j] += Rr[i] * gain;
  }
}

// ------------------------------------------------------------ filtres (RBJ)
function coefs(type, f, Q, g = 0) {
  f = clamp(f, 12, SR * 0.45);
  const w = (TAU * f) / SR, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q), A = Math.pow(10, g / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") [b0, b1, b2, a0, a1, a2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2, 1 + al, -2 * cs, 1 - al];
  else if (type === "hp") [b0, b1, b2, a0, a1, a2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2, 1 + al, -2 * cs, 1 - al];
  else if (type === "bp") [b0, b1, b2, a0, a1, a2] = [al, 0, -al, 1 + al, -2 * cs, 1 - al];
  else if (type === "pk") [b0, b1, b2, a0, a1, a2] = [1 + al * A, -2 * cs, 1 - al * A, 1 + al / A, -2 * cs, 1 - al / A];
  else if (type === "hs") {
    const q = 2 * Math.sqrt(A) * al;
    [b0, b1, b2, a0, a1, a2] = [A * (A + 1 + (A - 1) * cs + q), -2 * A * (A - 1 + (A + 1) * cs), A * (A + 1 + (A - 1) * cs - q),
      A + 1 - (A - 1) * cs + q, 2 * (A - 1 - (A + 1) * cs), A + 1 - (A - 1) * cs - q];
  } else if (type === "ls") {
    const q = 2 * Math.sqrt(A) * al;
    [b0, b1, b2, a0, a1, a2] = [A * (A + 1 - (A - 1) * cs + q), 2 * A * (A - 1 - (A + 1) * cs), A * (A + 1 - (A - 1) * cs - q),
      A + 1 + (A - 1) * cs + q, -2 * (A - 1 + (A + 1) * cs), A + 1 + (A - 1) * cs - q];
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(x, type, f, Q = 0.707, g = 0) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, c = null;
  const dyn = typeof f === "function";
  for (let i = 0; i < x.length; i++) {
    if (c === null || (dyn && (i & 15) === 0)) c = coefs(type, dyn ? f(i / SR) : f, Q, g);
    const v = c[0] * x[i] + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const expLerp = (a, b, k) => a * Math.pow(b / a, clamp(k));

// ------------------------------------------------------------ générateurs
function noise(d) {
  const n = S(d), o = new Float32Array(n);
  for (let i = 0; i < n; i++) o[i] = nz();
  return o;
}
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
function osc(type, d, f, ph0 = 0) {
  const n = S(d), o = new Float32Array(n);
  let ph = ph0;
  const dyn = typeof f === "function";
  for (let i = 0; i < n; i++) {
    const fr = dyn ? f(i / SR) : f, dt = fr / SR;
    ph += dt;
    ph -= Math.floor(ph);
    if (type === "sine") o[i] = Math.sin(TAU * ph);
    else if (type === "saw") o[i] = 2 * ph - 1 - blep(ph, dt);
    else if (type === "square") o[i] = (ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep((ph + 0.5) % 1, dt);
    else if (type === "tri") o[i] = 1 - 4 * Math.abs(ph - 0.5);
  }
  return o;
}
function env(sig, fn) {
  for (let i = 0; i < sig.length; i++) sig[i] *= fn(i / SR);
  return sig;
}
const mixInto = (a, b, g = 1) => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) a[i] += b[i] * g;
  return a;
};
const att = (t, a) => (t < a ? t / a : 1);
const sat = (x, k) => Math.tanh(k * x) / Math.tanh(k);

// ------------------------------------------------------------ batterie
function kick(gain = 1, f0 = 150, f1 = 44, decay = 0.32) {
  const d = 0.6, n = S(d), o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / 0.03);
    ph += f / SR;
    let v = Math.sin(TAU * ph) * Math.exp(-t / decay) * att(t, 0.0015);
    v += nz() * Math.exp(-t / 0.002) * 0.3;
    o[i] = sat(v, 1.7) * gain;
  }
  return filt(o, "hp", 26, 0.7);
}
function clap(gain = 1) {
  const src = noise(0.4);
  env(src, (t) => {
    let e = 0;
    for (const o of [0, 0.011, 0.022]) if (t >= o) e += Math.exp(-(t - o) / 0.0045);
    if (t >= 0.03) e += 0.8 * Math.exp(-(t - 0.03) / 0.12);
    return e * 0.6;
  });
  let o = filt(src, "bp", 1300, 1.1);
  o = filt(o, "hp", 700, 0.7);
  return env(o, () => gain * 1.8);
}
function hat(open = false, gain = 1) {
  const d = open ? 0.3 : 0.06;
  const fr = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 1.7);
  const o = new Float32Array(S(d));
  for (const f of fr) mixInto(o, osc("square", d, f, R()), 1 / 6);
  mixInto(o, noise(d), 0.35);
  let y = filt(o, "bp", 10500, 0.9);
  y = filt(y, "hp", 7500, 0.7);
  return env(y, (t) => Math.exp(-t / (open ? 0.1 : 0.018)) * att(t, 0.0008) * gain * 1.6);
}

// ------------------------------------------------------------ instruments
function bassNote(f, d, gain = 1) {
  const sub = osc("sine", d, f);
  mixInto(sub, filt(osc("saw", d, f * 2), "lp", (t) => 300 + 900 * Math.exp(-t / 0.09), 1.2), 0.32);
  return env(sub, (t) => att(t, 0.004) * (t > d - 0.03 ? Math.max(0, (d - t) / 0.03) : 1) * (0.7 + 0.3 * Math.exp(-t / 0.25)) * gain);
}
function padChord(freqs, d, cutoff, gain = 1, atk = 0.35, rel = 0.6) {
  const L = new Float32Array(S(d)), Rr = new Float32Array(S(d));
  for (const f of freqs) {
    for (const [cents, side] of [[-9, -1], [8, 1], [0, 0]]) {
      const v = osc("saw", d, f * Math.pow(2, cents / 1200), R());
      const p = side * 0.65, a = ((p + 1) * Math.PI) / 4;
      mixInto(L, v, Math.cos(a) / freqs.length);
      mixInto(Rr, v, Math.sin(a) / freqs.length);
    }
  }
  const cf = typeof cutoff === "function" ? cutoff : () => cutoff;
  const fl = filt(L, "lp", cf, 0.75), fr = filt(Rr, "lp", cf, 0.75);
  const e = (t) => att(t, atk) * (t > d - rel ? Math.max(0, (d - t) / rel) : 1) * gain;
  return [env(fl, e), env(fr, e)];
}
function pluck(f, gain = 1, bright = 4200) {
  const d = 0.42;
  const a = osc("saw", d, f, R());
  mixInto(a, osc("square", d, f * 2.003, R()), 0.22);
  const y = filt(a, "lp", (t) => 700 + bright * Math.exp(-t / 0.045), 1.5);
  return env(y, (t) => att(t, 0.002) * Math.exp(-t / 0.11) * gain);
}
function bell(f, d, gain = 1) {
  const o = new Float32Array(S(d));
  [[1, 1, 1], [2.0, 0.42, 0.6], [3.01, 0.22, 0.4], [4.17, 0.12, 0.25], [5.43, 0.06, 0.18]].forEach(([m, a, dk]) => {
    mixInto(o, env(osc("sine", d, f * m, R()), (t) => Math.exp(-t / (d * 0.33 * dk))), a);
  });
  return env(o, (t) => att(t, 0.0015) * gain);
}

// ------------------------------------------------------------ bruitages
function whoosh(d, f0, f1, peak = 0.6, gain = 1, q = 1.4) {
  const y = filt(noise(d), "bp", (t) => expLerp(f0, f1, t / d), q);
  mixInto(y, filt(y, "bp", (t) => expLerp(f0, f1, t / d) * 1.6, q * 0.8), 0.5);
  return env(y, (t) => {
    const k = t / d;
    const e = k < peak ? Math.pow(k / peak, 2.2) : Math.pow(Math.max(0, 1 - (k - peak) / (1 - peak)), 1.6);
    return e * gain * 2.2;
  });
}
function riser(d, f0, f1, gain = 1) {
  const w = whoosh(d, f0, f1, 0.985, 1, 1.1);
  const s = env(osc("saw", d, (t) => expLerp(f0 / 2, f1 / 3, t / d)), (t) => Math.pow(t / d, 2.5) * 0.12);
  mixInto(w, filt(s, "lp", 3200, 0.7));
  return env(w, () => gain);
}
function impact(gain = 1, sub0 = 70, sub1 = 30, len = 1.8) {
  const boom = env(osc("sine", len, (t) => sub1 + (sub0 - sub1) * Math.exp(-t / 0.11)), (t) => att(t, 0.002) * Math.exp(-t / (len * 0.34)));
  mixInto(boom, env(filt(noise(0.3), "lp", 6000, 0.7), (t) => Math.exp(-t / 0.03) * 0.9));
  mixInto(boom, env(filt(noise(0.7), "lp", 380, 0.9), (t) => Math.exp(-t / 0.13) * 1.4));
  return env(boom.map((v) => sat(v, 1.4)), () => gain);
}
function crash(d = 2.0, gain = 1) {
  const y = filt(filt(noise(d), "hp", 5000, 0.7), "pk", 9000, 0.8, 4);
  return env(y, (t) => att(t, 0.003) * Math.exp(-t / (d * 0.28)) * gain);
}
function click(gain = 1, f = 3500, dk = 0.004) {
  return env(filt(noise(0.03), "bp", f, 1.2), (t) => Math.exp(-t / dk) * gain * 3);
}
function clack(gain = 1) {
  // arrêt d'un rouleau : claquement mécanique (bois + métal)
  const a = env(filt(noise(0.08), "bp", 2400, 2.5), (t) => Math.exp(-t / 0.012) * 2.2);
  mixInto(a, env(osc("sine", 0.08, (t) => 900 * Math.exp(-t / 0.02) + 300), (t) => Math.exp(-t / 0.018) * 0.5));
  return env(a, () => gain);
}
function blip(f0, f1, d, gain = 1, type = "sine") {
  return env(osc(type, d, (t) => expLerp(f0, f1, t / d)), (t) => att(t, 0.002) * Math.exp(-t / (d * 0.4)) * gain);
}
function glitch(d, gain = 1, seed = 1) {
  const rr = rng(seed), o = new Float32Array(S(d));
  const step = S(0.016);
  for (let i0 = 0; i0 < o.length; i0 += step) {
    if (rr() < 0.3) continue;
    const seg = osc(rr() > 0.5 ? "square" : "saw", 0.016, 500 + rr() * 2800);
    for (let i = 0; i < seg.length && i0 + i < o.length; i++) o[i0 + i] += (Math.round(seg[i] * 4) / 4) * 0.5 * Math.min(1, i / 40) * Math.min(1, (seg.length - i) / 40);
  }
  return env(filt(o, "hp", 400, 0.7), () => gain);
}
function creak(d, gain = 1) {
  // grincement de porte : friction (impulsions à fréquence glissante) + corps résonant
  const n = S(d), o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 38 + 30 * Math.sin(t * 7) + 25 * (t / d);
    ph += f / SR;
    if (ph >= 1) {
      ph -= 1;
      o[i] = 1;
    }
  }
  let y = filt(o, "bp", 900, 6);
  mixInto(y, filt(o, "bp", 1850, 8), 0.6);
  mixInto(y, filt(o, "bp", 420, 5), 0.5);
  return env(y, (t) => Math.sin(Math.PI * clamp(t / d)) * gain * 3);
}
function hum(d, f, gain = 1) {
  // moteur du disque : fondamental + harmoniques, léger battement
  const o = new Float32Array(S(d));
  [[1, 1], [2, 0.35], [3, 0.18], [5.02, 0.06]].forEach(([m, a]) => mixInto(o, osc("sine", d, (t) => f * m * (1 + 0.002 * Math.sin(t * 5)), R()), a));
  mixInto(o, filt(noise(d), "bp", 2400, 0.6), 0.04);
  return env(o, () => gain);
}

// ------------------------------------------------------------ bus
const music = stereo(), sfx = stereo(), rvb = stereo();
const B = (n) => K.beat(n); // temps de la grille (0 = impact)

// ============================================================ MUSIQUE
// Accords (ré mineur → fa majeur)
const CH = {
  Dm: ["D3", "F3", "A3", "E4"], Bb: ["Bb2", "D3", "F3", "C4"], F: ["F3", "A3", "C4", "G4"], C: ["C3", "E3", "G3", "D4"],
  Gm: ["G2", "Bb2", "D3", "A3"], Fmaj: ["F3", "A3", "C4", "E4", "G4"],
};
const freqs = (c) => CH[c].map(NOTE);

// A · inventaire (noir) : pouls grave, tic de données, montée vers « en lot »
{
  const d = K.toutIn + 0.2;
  const drone = osc("sine", d, NOTE("D1"));
  mixInto(drone, osc("sine", d, NOTE("D2") * 1.002), 0.4);
  env(drone, (t) => att(t, 0.5) * (0.6 + 0.4 * clamp(t / d)));
  put(music, filt(drone, "lp", 170, 0.7), 0, db(-11));
  const [pl, pr] = padChord(freqs("Dm"), d, (t) => 260 + 900 * clamp(t / d), 1, 0.8, 0.25);
  putST(music, pl, pr, 0.1, db(-18));
  for (let n = -40; B(n) < K.toutIn - 0.1; n++) {
    const t0 = B(n);
    if (t0 < 0.15) continue;
    // grosse caisse étouffée, de plus en plus présente
    const k = clamp((t0 - 2.5) / 3);
    put(music, filt(kick(1, 110, 42, 0.26), "lp", 300 + 2400 * k, 0.7), t0, db(-15 + 4 * k));
    put(music, hat(false, 0.5), t0 + BEAT / 2, db(-33), 0.3);
    if (t0 > K.onRachete - 0.3) put(music, bassNote(NOTE("D2"), BEAT * 0.4, 1), t0, db(-15));
  }
  // arpège qui s'installe sur « On rachète … en lot »
  const arp = freqs("Dm").map((f) => f * 2);
  for (let k = 0; ; k++) {
    const t0 = K.onRachete - 0.05 + (k * BEAT) / 2;
    if (t0 > K.toutIn - 0.25) break;
    put(music, pluck(arp[[0, 2, 1, 3][k % 4]], 1, 3200), t0, db(-23 - (k % 2) * 3), k % 2 ? 0.35 : -0.35);
  }
}
// B · « tout » (blanc) : nappe aérienne, arpège pincé en croches, charleston
{
  const t0 = K.toutIn, t1 = K.scanIn;
  for (const [a, b, c] of [[t0, K.tout - 0.05, "Bb"], [K.tout - 0.05, t1, "F"]]) {
    const [pl, pr] = padChord(freqs(c).map((f) => f * 2), b - a + 0.4, (t) => 1900 + 900 * Math.sin(t * 1.3), 1, 0.12, 0.4);
    putST(music, pl, pr, a, db(-21));
    const arp = freqs(c).map((f) => f * 2);
    for (let k = 0; a + (k * BEAT) / 2 < b; k++) {
      const f = arp[[0, 2, 1, 3, 2, 0, 3, 1][k % 8]] * (k % 4 === 3 ? 2 : 1);
      put(music, pluck(f, 1, 4200), a + (k * BEAT) / 2, db(-21 - (k % 2) * 3), k % 2 ? 0.35 : -0.35);
      put(rvb, pluck(f, 1, 4200), a + (k * BEAT) / 2, db(-25));
      put(music, hat(false, 0.7), a + (k * BEAT) / 2 + BEAT / 4, db(-30), 0.4);
    }
  }
  put(music, kick(1.0), K.tout - 0.02, db(-10)); // « TOUT » tombe
  put(music, bassNote(NOTE("F1"), 0.5, 1), K.tout - 0.02, db(-12));
}
// C/D/E · trois temps : la pulsation s'installe (grosse caisse, basse, charleston)
{
  const seg = [[K.scanIn, K.counterIn, "Dm"], [K.counterIn, K.irisMap, "Bb"], [K.irisMap, K.irisDisk - 0.1, "F"]];
  for (const [a, b, c] of seg) {
    for (let n = Math.ceil((a - K.impact) / BEAT); B(n) < b; n++) {
      const t0 = B(n);
      put(music, kick(1.0), t0, db(c === "F" ? -12 : -10));
      put(music, bassNote(freqs(c)[0] / 2, BEAT * 0.48, 1), t0 + BEAT / 2, db(-13));
      put(music, hat(false, 1), t0 + BEAT / 2, db(-25), 0.3);
      put(music, hat(false, 0.6), t0 + BEAT / 4, db(-31), -0.3);
      put(music, hat(false, 0.6), t0 + (3 * BEAT) / 4, db(-31), -0.3);
    }
    const [pl, pr] = padChord(freqs(c), b - a + 0.3, 1400, 1, 0.08, 0.4);
    putST(music, pl, pr, a, db(-22));
  }
}
// F · données (court) : drone + montée vers le drop
{
  const t0 = K.irisDisk - 0.2, d = K.impact - t0;
  const dr = osc("sine", d, NOTE("D1"));
  mixInto(dr, osc("sine", d, NOTE("A1")), 0.3);
  env(dr, (t) => att(t, 0.2) * (0.35 + 0.65 * Math.pow(t / d, 2)));
  put(music, filt(dr, "lp", 200, 0.7), t0, db(-14));
  const [pl, pr] = padChord(["D2", "A2", "D3", "F3"].map(NOTE), d, (t) => 200 + 1600 * Math.pow(t / d, 2), 1, 0.4, 0.05);
  putST(music, pl, pr, t0, db(-19));
}
// G · le drop (impact → éclair) : beat complet, basse, nappe ; ré mineur puis fa
{
  const nEnd = Math.floor((K.flash - K.impact) / BEAT);
  for (let n = 0; n <= nEnd; n++) {
    const t0 = B(n);
    const c = n < 4 ? "Dm" : n < 8 ? "Bb" : "F";
    put(music, kick(1.1), t0, db(-8));
    if (n % 2 === 1) put(music, clap(1), t0, db(-16));
    for (let k = 0; k < 4; k++) put(music, hat(k === 2, k === 2 ? 0.8 : 1), t0 + (k * BEAT) / 4, db(k === 2 ? -27 : -29), k % 2 ? 0.3 : -0.3);
    const root = freqs(c)[0] / 2;
    put(music, bassNote(root, BEAT * 0.45, 1), t0, db(-11));
    put(music, bassNote(root * (n % 2 ? 1.5 : 2), BEAT * 0.3, 1), t0 + BEAT * 0.5, db(-15));
  }
  for (const [n, c, len] of [[0, "Dm", 4], [4, "Bb", 4], [8, "F", Math.max(1, nEnd - 7)]]) {
    const [pl, pr] = padChord(freqs(c), len * BEAT + 0.3, 1800, 1, 0.05, 0.3);
    putST(music, pl, pr, B(n), db(-20));
  }
  // paiement (fond blanc) : arpège lumineux
  const arp = freqs("F").map((f) => f * 2);
  for (let k = 0; K.white2 + (k * BEAT) / 2 < K.flash - 0.1; k++) put(music, pluck(arp[k % 4] * (k > 3 ? 2 : 1), 1, 5200), K.white2 + (k * BEAT) / 2, db(-22), k % 2 ? 0.4 : -0.4);
}
// H · carton de fin : résolution en fa majeur, pulsation retenue, dernier temps à la coupe
{
  const t0 = K.end;
  const d = K.cut - t0 + 0.6;
  const [pl, pr] = padChord(freqs("Fmaj"), d, (t) => 900 + 1600 * clamp(t / 1.5), 1, 0.25, 0.25);
  putST(music, pl, pr, t0, db(-18));
  put(music, env(osc("sine", d, NOTE("F1")), (t) => att(t, 0.05) * Math.exp(-t / 3)), t0, db(-12));
  const n0 = Math.ceil((t0 - K.impact) / BEAT), nCut = Math.round((K.cut - K.impact) / BEAT);
  for (let n = n0; n < nCut; n++) {
    put(music, kick(0.8, 120, 42, 0.25), B(n), db(n % 2 ? -18 : -13));
    put(music, hat(false, 0.6), B(n) + BEAT / 2, db(-30), 0.3);
  }
  const arp = ["F4", "A4", "C5", "G5", "A5", "C6"].map(NOTE);
  arp.forEach((f, k) => put(music, pluck(f, 1, 5600), K.slogan + k * BEAT * 0.5, db(-23), (k % 3) * 0.3 - 0.3));
  // dernier temps : coup final, puis on coupe avec l'image
  put(music, kick(1.2, 160, 38, 0.4), K.cut, db(-7));
  put(music, impact(1, 80, 34, 0.9), K.cut, db(-12));
  put(music, bassNote(NOTE("F1"), 0.24, 1), K.cut, db(-10));
}

// ============================================================ BRUITAGES
// Inventaire : un tic par ligne qui s'écrit (colonne de droite), puis « tout le lot » se sélectionne
invRowTimes().forEach((t, k) => put(sfx, click(0.45, 4200 + (k % 5) * 300, 0.0018), t, db(-34), 0.15 + (k % 4) * 0.1));
put(sfx, whoosh(0.5, 300, 2600, 0.7, 1), Math.max(0, K.votre - 0.3), db(-28)); // le titre se lève
for (let i = 0; i < 10; i++) put(sfx, click(0.9, 2400 + i * 110, 0.005), K.onRachete - 0.06 + i * 0.04, db(-23), -0.4 + i * 0.08); // roulement
for (let i = 0; i < 7; i++) put(sfx, click(0.9, 2000 + i * 140, 0.005), K.enLot - 0.06 + i * 0.05, db(-23), -0.3 + i * 0.1);
put(sfx, whoosh(0.9, 400, 6000, 0.85, 1, 1.2), K.enLot - 0.05, db(-27), (t) => -0.6 + t * 1.3); // sélection de tout le lot
put(sfx, bell(NOTE("A5"), 1.2, 1), K.lot + 0.02, db(-25), 0.2);
put(rvb, bell(NOTE("A5"), 1.2, 1), K.lot + 0.02, db(-23));
put(sfx, blip(NOTE("D6"), NOTE("D6"), 0.12, 1), K.neuf - 0.04, db(-25), -0.2); // ✓ NEUF
put(sfx, blip(NOTE("F6"), NOTE("F6"), 0.12, 1), K.usage - 0.04, db(-25), 0.2); // ✓ USAGÉ
put(sfx, riser(K.toutIn - 5.62, 200, 6000, 1), 5.62, db(-21)); // plongée dans le « O »
put(sfx, whoosh(0.5, 5000, 700, 0.15, 1, 0.9), K.hookOut - 0.02, db(-20));
put(sfx, crash(2.0, 1), K.toutIn, db(-31));
// Tout
put(sfx, whoosh(0.5, 400, 2400, 0.7, 1), K.technolot - 0.3, db(-28), -0.3);
for (let i = 0; i < 10; i++) put(sfx, click(0.7, 2200 + i * 90, 0.004), K.achete - 0.06 + i * 0.03, db(-26), -0.5 + i * 0.1);
put(sfx, impact(1, 100, 48, 0.4), K.tout - 0.02, db(-21)); // « TOUT » claque
for (let k = 0; k < 24; k++) put(sfx, click(0.55, 3200 + (k % 6) * 260, 0.0025), K.tout + 0.12 + k * 0.045, db(-31), (k % 5) / 2.5 - 0.8); // le mur
put(sfx, bell(NOTE("C6"), 0.9, 1), K.informatique + 0.02, db(-28), -0.3);
put(sfx, bell(NOTE("E6"), 0.9, 1), K.electronique + 0.02, db(-28), 0.3);
put(sfx, riser(K.scanIn - (K.toutOut - 0.42), 220, 5800, 1), K.toutOut - 0.42, db(-21)); // plongée dans le « O »
put(sfx, whoosh(0.45, 5000, 600, 0.15, 1, 0.9), K.toutOut - 0.02, db(-21));
// Évaluation : laser, « GRATUITE », relevé, convergence en « $ »
put(sfx, env(filt(osc("saw", 0.82, (t) => 180 + 60 * Math.sin(t * 30)), "bp", (t) => expLerp(800, 3000, t / 0.82), 3), (t) => att(t, 0.04) * (1 - clamp((t - 0.7) / 0.12)) * 1.2), K.evaluation - 0.14, db(-26), (t) => -0.7 + t * 1.6);
put(sfx, env(osc("sine", 0.82, 3520), (t) => att(t, 0.03) * (1 - clamp((t - 0.7) / 0.12)) * 0.25), K.evaluation - 0.14, db(-36));
put(sfx, impact(1, 90, 45, 0.5), K.gratuite, db(-24));
for (let k = 0; k < 18; k++) put(sfx, click(0.5, 4200, 0.002), K.evaluation + 0.2 + k * 0.03, db(-36), 0.4);
for (let k = 0; k < 14; k++) put(sfx, blip(2400 + k * 90, 3800 + k * 60, 0.05, 1), K.evaluationEnd - 0.05 + k * 0.016, db(-36), (k % 4) / 2 - 0.75);
put(sfx, whoosh(0.32, 600, 6000, 0.9, 1, 1.1), K.dollarZoom - 0.02, db(-20)); // plongée dans le « $ »
put(sfx, glitch(0.12, 1, 3), K.counterIn - 0.04, db(-26));
// Compteur : défilement puis arrêts nets
{
  for (let i = 0; i < 4; i++) {
    const stop = K.rapide + 0.02 + i * 0.065;
    let t = K.counterIn - 0.05, dt = 0.028;
    while (t < stop - 0.02) {
      put(sfx, click(0.6, 3000 + i * 300, 0.0025), t, db(-31 - i), -0.3 + i * 0.2);
      dt *= t > stop - 0.4 ? 1.12 : 1.0;
      t += dt;
    }
    put(sfx, clack(1), stop, db(-17), -0.3 + i * 0.2);
  }
  put(sfx, impact(1, 75, 38, 0.6), K.rapide + 0.21, db(-22));
}
put(sfx, blip(1200, 300, 0.25, 1, "sine"), K.irisMap - 0.24, db(-26)); // le « $ » se rétracte
put(sfx, whoosh(0.32, 400, 5000, 0.85, 1), K.irisMap - 0.02, db(-20)); // iris
// Carte du Grand Montréal : rivières, villes, tracés
put(sfx, filt(noise(0.7), "bp", 5000, 1.5).map((v, i) => v * Math.sin((Math.PI * i) / S(0.7)) * 0.4), K.mapIn, db(-34), 0.2);
for (let i = 0; i < 15; i++) {
  const t = K.mapIn + 0.16 + i * 0.035;
  put(sfx, blip(NOTE(["D6", "F6", "A6", "C7"][i % 4]), NOTE(["D6", "F6", "A6", "C7"][i % 4]), 0.08, 1), t + 0.06, db(-34), (i % 5) / 2.5 - 0.8);
}
put(sfx, whoosh(0.6, 1500, 5000, 0.5, 1, 1.4), K.partout - 0.15, db(-33), 0.5); // le Québec entier (médaillon)
put(sfx, riser(K.diskIn - (K.irisDisk - 0.42), 200, 3600, 1), K.irisDisk - 0.42, db(-22));
put(sfx, whoosh(0.3, 5000, 300, 0.2, 1), K.irisDisk, db(-22));
// Données : moteur, fichiers, dissolution, éclatement, aspiration
put(sfx, hum(K.impact - K.irisDisk, 118, 1).map((v, i) => v * clamp(i / S(0.15)) * (1 - clamp((i - S(K.impact - K.irisDisk - 0.3)) / S(0.25)))), K.irisDisk, db(-33));
["E6", "A6", "C7"].forEach((n, i) => {
  put(sfx, bell(NOTE(n), 1.2, 1), K.donnees + i * 0.06, db(-30), -0.4 + i * 0.4);
  put(rvb, bell(NOTE(n), 1.2, 1), K.donnees + i * 0.06, db(-26));
});
for (let i = 0; i < 3; i++) put(sfx, glitch(0.45, 1, 11 + i), K.donnees + 0.38 + i * 0.05, db(-29), -0.4 + i * 0.4);
put(sfx, filt(noise(0.7), "hp", 6000, 0.7).map((v, i) => v * Math.exp(-i / S(0.3)) * 0.6), K.donnees + 0.45, db(-32)); // particules
put(sfx, whoosh(0.35, 300, 2500, 0.6, 1), K.crush - 0.15, db(-24)); // recul éclair
put(sfx, env(filt(noise(0.2), "lp", 1200, 0.8), (t) => Math.pow(t / 0.2, 2)), K.crush, db(-24)); // éclatement
put(sfx, whoosh(0.2, 300, 7000, 0.98, 1, 0.9), K.impact - 0.2, db(-16)); // aspiration
// IMPACT (le drop)
put(sfx, impact(1, 72, 28, 2.2), K.impact, db(-6));
put(sfx, crash(2.6, 1), K.impact, db(-20));
put(sfx, glitch(0.25, 1, 21), K.impact + 0.02, db(-26));
put(rvb, impact(1, 72, 28, 1.0), K.impact, db(-14));
// Mots qui claquent
[K.onLes + 0.02, K.detruit, K.gratuitement].forEach((t, i) => put(sfx, impact(1, 110 - i * 10, 50, 0.35), t, db(-21)));
for (let k = 0; k < 46; k++) put(sfx, click(0.4, 4500, 0.0018), K.securisee + k * 0.014, db(-38), 0.3);
// Pivot du cube, passage au blanc
put(sfx, whoosh(0.5, 500, 4000, 0.7, 1), K.pivot - 0.05, db(-22), (t) => 0.2 - t);
put(sfx, whoosh(0.4, 2000, 9000, 0.9, 1, 0.8), K.white2 - 0.12, db(-28));
// Paiement : « ding » et ondes
put(sfx, bell(NOTE("C6"), 2.4, 1), K.check, db(-17), 0.25);
put(sfx, bell(NOTE("F6"), 2.4, 1), K.check + 0.06, db(-20), 0.3);
put(rvb, bell(NOTE("F6"), 2.4, 1), K.check + 0.06, db(-16));
[0, 1, 2].forEach((i) => put(sfx, blip(NOTE("A6") * (1 + i * 0.5), NOTE("A6") * (1 + i * 0.5) * 1.02, 0.5, 1), K.check + 0.08 + i * 0.16, db(-32), 0.3));
// Éclair blanc
put(sfx, riser(0.5, 800, 9000, 1), K.flash - 0.45, db(-22));
put(sfx, impact(1, 60, 30, 1.2), K.end, db(-16));
put(sfx, crash(2.2, 1), K.end, db(-24));
// Carton de fin
put(sfx, whoosh(0.75, 600, 5200, 0.55, 1, 1.6), K.end + 0.05, db(-27), (t) => -0.5 + t * 1.3); // la boucle se trace
put(sfx, blip(NOTE("F5"), NOTE("F6"), 0.18, 1), K.end + 0.42, db(-27)); // « $ »
put(sfx, glitch(0.42, 1, 31), K.end + 0.55, db(-30)); // mot-symbole
put(sfx, pluck(NOTE("C6"), 1, 6000), K.slogan + 0.02, db(-24), 0.2); // pilule
put(sfx, pluck(NOTE("F6"), 1, 6000), K.slogan + 0.08, db(-27), 0.25);
for (let k = 0; k < 50; k++) put(sfx, click(0.35, 4800, 0.0016), K.occupe + k * ((K.endBuilt - 0.05 - K.occupe) / 51), db(-40), (k % 5) / 10 - 0.2);

// ------------------------------------------------------------ réverbération
function freeverb([L, Rr], room = 0.84, damp = 0.35) {
  const sc = SR / 44100, sp = Math.round(23 * sc);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * sc));
  const aps = [556, 441, 341, 225].map((x) => Math.round(x * sc));
  const fb = room * 0.28 + 0.7, dm = damp * 0.4;
  const run = (inp, off) => {
    const out = new Float32Array(N);
    const cb = combs.map((c) => ({ buf: new Float32Array(c + off), i: 0, st: 0 }));
    const ab = aps.map((c) => ({ buf: new Float32Array(c + off), i: 0 }));
    for (let n = 0; n < N; n++) {
      const x = inp[n] * 0.015;
      let s = 0;
      for (const c of cb) {
        const y = c.buf[c.i];
        c.st = y * (1 - dm) + c.st * dm;
        c.buf[c.i] = x + c.st * fb;
        if (++c.i >= c.buf.length) c.i = 0;
        s += y;
      }
      for (const a of ab) {
        const y = a.buf[a.i];
        const o = -s + y;
        a.buf[a.i] = s + y * 0.5;
        if (++a.i >= a.buf.length) a.i = 0;
        s = o;
      }
      out[n] = s * 3;
    }
    return out;
  };
  return [run(L, 0), run(Rr, sp)];
}
// envoi réverbération : une part de la musique et des effets
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) rvb[c][i] += music[c][i] * 0.22 + sfx[c][i] * 0.12;
const rOut = freeverb([filt(rvb[0], "hp", 280, 0.7), filt(rvb[1], "hp", 280, 0.7)], 0.86, 0.4);

// ------------------------------------------------------------ voix
function readWav(file) {
  const b = fs.readFileSync(file);
  let o = 12, fmt = null, data = null;
  while (o < b.length) {
    const id = b.toString("ascii", o, o + 4), sz = b.readUInt32LE(o + 4);
    if (id === "fmt ") fmt = { ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) };
    if (id === "data") data = b.subarray(o + 8, o + 8 + sz);
    o += 8 + sz + (sz & 1);
  }
  if (fmt.sr !== SR || fmt.bits !== 16) throw new Error("voix : 48 kHz / 16 bits attendus");
  const n = data.length / 2 / fmt.ch, x = new Float32Array(N);
  for (let i = 0; i < Math.min(n, N); i++) x[i] = data.readInt16LE(i * 2 * fmt.ch) / 32768;
  return x;
}
let vo = readWav(path.join(ROOT, "voice/vo.wav"));
// traitement : coupe-bas, présence, compression douce
vo = filt(vo, "hp", 80, 0.7);
vo = filt(vo, "pk", 250, 1.0, -1.5);
vo = filt(vo, "pk", 3200, 0.9, 2.5);
vo = filt(vo, "hs", 9500, 0.7, 1.5);
{
  let e = 0;
  const thr = db(-20), ratio = 3, atk = Math.exp(-1 / (0.005 * SR)), rel = Math.exp(-1 / (0.12 * SR));
  for (let i = 0; i < N; i++) {
    const a = Math.abs(vo[i]);
    e = a > e ? atk * e + (1 - atk) * a : rel * e + (1 - rel) * a;
    vo[i] *= e > thr ? Math.pow(e / thr, 1 / ratio - 1) : 1;
  }
}
let vpk = 0;
for (let i = 0; i < N; i++) vpk = Math.max(vpk, Math.abs(vo[i]));
for (let i = 0; i < N; i++) vo[i] *= db(-4) / vpk;

// ------------------------------------------------------------ ducking : −8 dB sous la voix
const duck = new Float32Array(N);
{
  const act = new Float32Array(N);
  for (const s of timings.sentences) for (let i = Math.max(0, S(s.start - 0.06)); i < Math.min(N, S(s.end + 0.1)); i++) act[i] = 1;
  let st = 0;
  const up = Math.exp(-1 / (0.04 * SR)), down = Math.exp(-1 / (0.22 * SR));
  for (let i = 0; i < N; i++) {
    st = act[i] > st ? up * st + (1 - up) * act[i] : down * st + (1 - down) * act[i];
    duck[i] = st;
  }
}

// ------------------------------------------------------------ mesure de loudness (BS.1770-4)
function kfilter(x) {
  const run = (inp, b, a) => {
    const y = new Float32Array(inp.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < inp.length; i++) {
      const v = b[0] * inp[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
      x2 = x1; x1 = inp[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  };
  return run(run(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, 0.73248077421585]), [1, -2, 1], [-1.99004745483398, 0.99007225036621]);
}
function lufs(chs) {
  const ks = chs.map(kfilter);
  const blk = S(0.4), hop = S(0.1), z = [];
  for (let s = 0; s + blk <= ks[0].length; s += hop) {
    let a = 0;
    for (const k of ks) for (let i = s; i < s + blk; i++) a += k[i] * k[i];
    z.push(a / blk);
  }
  const L0 = (ms) => -0.691 + 10 * Math.log10(ms);
  const mean = (arr) => arr.reduce((p, q) => p + q, 0) / arr.length;
  const abs = z.filter((m) => L0(m) > -70);
  const rel = L0(mean(abs)) - 10;
  return L0(mean(abs.filter((m) => L0(m) > rel)));
}
const speechWins = timings.sentences.map((s) => [s.start, s.end]);
function levelIn(x, wins) {
  const k = kfilter(x);
  let s = 0, n = 0;
  for (const [a, b] of wins) for (let i = S(a); i < Math.min(N, S(b)); i++) { s += k[i] * k[i]; n++; }
  return -0.691 + 10 * Math.log10(s / Math.max(1, n) + 1e-12);
}

// ------------------------------------------------------------ mixage
const musicBus = stereo();
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) musicBus[c][i] = music[c][i] + rOut[c][i] * 0.8;
const mono = (bus, g) => {
  const m = new Float32Array(N);
  for (let i = 0; i < N; i++) m[i] = ((bus[0][i] + bus[1][i]) / 2) * (g ? g[i] : 1);
  return m;
};
const gDuckM = new Float32Array(N), gDuckS = new Float32Array(N);
for (let i = 0; i < N; i++) {
  gDuckM[i] = db(-8 * duck[i]); // ducking demandé : −8 dB sous la voix
  gDuckS[i] = db(-4 * duck[i]);
}
// Équilibre : musique 12 LU sous la voix pendant la parole (après ducking)
const V = levelIn(vo, speechWins);
const M = levelIn(mono(musicBus, gDuckM), speechWins);
const gMusic = db(V - 12 - M);
const mix = stereo();
for (let i = 0; i < N; i++)
  for (let c = 0; c < 2; c++) mix[c][i] = musicBus[c][i] * gDuckM[i] * gMusic + sfx[c][i] * gDuckS[i] * gMusic * db(2) + vo[i];
for (let c = 0; c < 2; c++) mix[c] = filt(filt(mix[c], "hp", 30, 0.7), "hp", 30, 0.7);
// après la coupe au noir : la queue s'éteint avant 30,0 s
for (let i = S(K.cut + 0.05); i < N; i++) {
  const k = 1 - (i - S(K.cut + 0.05)) / (N - S(K.cut + 0.05));
  mix[0][i] *= k * k;
  mix[1][i] *= k * k;
}

// ------------------------------------------------------------ normalisation −14 LUFS + limiteur
function limit([L, Rr], ceilDb = -1.5) {
  const ceil = db(ceilDb), la = S(0.003), rel = Math.exp(-1 / (0.08 * SR));
  const tg = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = Math.max(Math.abs(L[i]), Math.abs(Rr[i]));
    tg[i] = p > ceil ? ceil / p : 1;
  }
  const mn = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let m = 1;
    for (let j = i; j < Math.min(N, i + la); j++) if (tg[j] < m) m = tg[j];
    mn[i] = m;
  }
  let g = 1, red = 1;
  const out = [new Float32Array(N), new Float32Array(N)];
  for (let i = 0; i < N; i++) {
    g = mn[i] < g ? mn[i] : rel * g + (1 - rel) * mn[i];
    red = Math.min(red, g);
    out[0][i] = L[i] * g;
    out[1][i] = Rr[i] * g;
  }
  return { out, red };
}
let final = mix, before = lufs(mix), red = 1;
for (let pass = 0; pass < 4; pass++) {
  // le limiteur fait perdre un peu de loudness : on itère jusqu'à −14,0 ± 0,1
  const cur = lufs(final);
  const g = db(-14 - cur);
  const scaled = [final[0].map((v) => v * g), final[1].map((v) => v * g)];
  const r = limit(scaled);
  final = r.out;
  red = Math.min(red, r.red);
  if (Math.abs(lufs(final) + 14) < 0.1) break;
}
const after = lufs(final);
let peak = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(final[c][i]));

// ------------------------------------------------------------ écriture WAV 24 bits
function writeWav(file, chs) {
  const bytes = 3, nc = chs.length, data = Buffer.alloc(N * nc * bytes);
  let o = 0;
  for (let i = 0; i < N; i++)
    for (const ch of chs) {
      data.writeIntLE(Math.round(clamp(ch[i], -1, 1) * 8388607), o, 3);
      o += 3;
    }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(nc, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * nc * bytes, 28); h.writeUInt16LE(nc * bytes, 32); h.writeUInt16LE(24, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
fs.mkdirSync(path.join(ROOT, "audio"), { recursive: true });
writeWav(path.join(ROOT, "audio/mix.wav"), final);
writeWav(path.join(ROOT, "audio/voix.wav"), [vo]);

console.log(`LUFS avant : ${before.toFixed(2)} | final : ${after.toFixed(2)} LUFS | crête ${(20 * Math.log10(peak)).toFixed(2)} dBFS | limiteur max ${(20 * Math.log10(red)).toFixed(2)} dB`);
console.log(`musique : gain ${(20 * Math.log10(gMusic)).toFixed(1)} dB, ducking −8 dB sous la voix`);
console.log(`impact (drop) ${K.impact.toFixed(3)} s · coupe ${K.cut.toFixed(3)} s · temps : ${BEAT.toFixed(4)} s`);
