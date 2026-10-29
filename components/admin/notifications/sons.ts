/**
 * Sons des notifications, synthétisés avec Web Audio (aucun fichier).
 * Les navigateurs n'autorisent le son qu'après un geste de l'utilisateur :
 * `debloquerAudio()` est appelé au premier clic ou à la première touche.
 */

import type { TypeSon } from "@/lib/admin/notifications-regles";

export type { TypeSon };

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
/** Instant (performance.now) du dernier déblocage demandé : le contexte démarre dans la foulée. */
let dernierDeblocage = -Infinity;
const DEBLOCAGE_MS = 1000;

function contexte(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** À appeler pendant un geste de l'utilisateur (clic, touche). */
export function debloquerAudio(): void {
  const c = contexte();
  if (!c) return;
  if (c.state === "suspended") {
    dernierDeblocage = performance.now();
    c.resume().catch(() => {});
  }
}

/** Enveloppe : 0 → crête en `attaque` s, puis décroissance exponentielle jusqu'à `fin` à t + `duree`. */
function enveloppe(g: GainNode, t: number, crete: number, attaque: number, duree: number, fin: number) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(crete, t + attaque);
  g.gain.exponentialRampToValueAtTime(fin, t + duree);
}

function oscillateur(
  c: AudioContext,
  sortie: AudioNode,
  type: OscillatorType,
  freq: number,
  t: number,
  crete: number,
  attaque: number,
  duree: number,
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  enveloppe(g, t, crete, attaque, duree, 0.0001);
  osc.connect(g).connect(sortie);
  osc.start(t);
  osc.stop(t + duree + 0.02);
}

const PARTIELS = [2093, 2637, 3136, 4186];
const CRETES = [0.16, 0.1, 0.08, 0.05];
const DUREES = [1.0, 0.85, 0.7, 0.5];

/** Cha-ching : frottement de bruit puis deux tintements de caisse (~1,2 s). */
function vente(c: AudioContext, t0: number) {
  const maitre = c.createGain();
  maitre.gain.value = 0.6;
  maitre.connect(c.destination);

  // « cha » : bruit blanc filtré
  const n = Math.floor(c.sampleRate * 0.09);
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const bruit = c.createBufferSource();
  bruit.buffer = buffer;
  const filtre = c.createBiquadFilter();
  filtre.type = "bandpass";
  filtre.frequency.value = 3500;
  filtre.Q.value = 0.8;
  const gBruit = c.createGain();
  enveloppe(gBruit, t0, 0.5, 0.004, 0.08, 0.001);
  bruit.connect(filtre).connect(gBruit).connect(maitre);
  bruit.start(t0);
  bruit.stop(t0 + 0.09);

  // « ching », puis un second tintement plus léger, un demi-ton plus haut
  const tintement = (t: number, ratio: number, gain: number, duree: number) => {
    PARTIELS.forEach((f, i) =>
      oscillateur(c, maitre, "sine", f * ratio, t, CRETES[i] * gain, 0.004, DUREES[i] * duree),
    );
  };
  tintement(t0 + 0.07, 1, 1, 1);
  tintement(t0 + 0.19, 1.0595, 0.55, 0.8);
}

/** Ding-dong montant (~0,8 s). */
function soumission(c: AudioContext, t0: number) {
  const maitre = c.createGain();
  maitre.gain.value = 0.5;
  maitre.connect(c.destination);
  for (const [f, t] of [
    [880, t0],
    [1318.5, t0 + 0.14],
  ]) {
    oscillateur(c, maitre, "sine", f, t, 0.18, 0.008, 0.6);
    oscillateur(c, maitre, "triangle", f, t, 0.05, 0.008, 0.6);
  }
}

/**
 * Joue un son. Contexte encore suspendu (aucun geste de l'utilisateur) :
 * rien, sans erreur — sauf juste après un déblocage, le temps qu'il démarre.
 */
export function jouerSon(type: TypeSon): void {
  // Le contexte n'est créé que par debloquerAudio (pendant un geste) : le créer
  // ici, hors geste, ferait afficher un avertissement par le navigateur.
  const c = ctx;
  if (!c) return;
  if (c.state !== "running" && performance.now() - dernierDeblocage > DEBLOCAGE_MS) return;
  try {
    const t0 = c.currentTime + 0.02;
    if (type === "vente") vente(c, t0);
    else soumission(c, t0);
  } catch {
    /* audio indisponible : on se passe du son */
  }
}
