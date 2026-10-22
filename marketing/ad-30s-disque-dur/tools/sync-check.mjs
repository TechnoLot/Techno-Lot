// Contrôle de synchro voix / image : pour quelques mots-clés, mesure l'attaque réelle
// dans le son livré (enveloppe 5 ms de la piste voix) et la compare à l'instant où
// l'animation correspondante démarre (src/timeline.js).
//   node tools/sync-check.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeTimeline } from "../src/timeline.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const timings = JSON.parse(fs.readFileSync(path.join(ROOT, "voice/timings.json"), "utf8"));
const K = makeTimeline(timings);
const SR = 48000;
const b = fs.readFileSync(path.join(ROOT, "voice/vo.wav"));
const data = b.subarray(44);
const x = new Float32Array(data.length / 2);
for (let i = 0; i < x.length; i++) x[i] = data.readInt16LE(i * 2) / 32768;
const win = SR * 0.005;
const env = [];
for (let i = 0; i + win <= x.length; i += win) {
  let a = 0;
  for (let j = i; j < i + win; j++) a += x[j] * x[j];
  env.push(10 * Math.log10(a / win + 1e-12));
}
// Attaque mesurée d'une réplique : premier bloc de 5 ms qui dépasse le plancher de bruit
// de 25 dB après au moins 120 ms de silence (mesure non ambiguë, contrairement aux mots
// enchaînés). Les mots à l'intérieur d'une réplique gardent l'alignement du moteur Azure.
const floor = Math.min(...env.filter((v) => v > -200));
function onset(t) {
  for (let i = Math.max(24, Math.floor((t - 0.25) / 0.005)); i < Math.floor((t + 0.25) / 0.005); i++) {
    const quiet = env.slice(i - 24, i).every((v) => v < floor + 25);
    if (quiet && env[i] >= floor + 25) return i * 0.005;
  }
  return NaN;
}
const CHECKS = [
  ["« Vos vieux ordis »", K.ilsIn, "« ILS » se lève (puis DORMENT.)"],
  ["« Chez Techno Lot »", K.techno - 0.06, "« TECHNO LOT » se lève (sur « Techno »)"],
  ["« portables »", K.portables, "étiquette 01 PORTABLES (point + ligne verte)"],
  ["« Évaluation »", K.evaluation - 0.12, "le laser balaie et révèle « ÉVALUATION »"],
  ["« offre »", K.offre - 0.04, "« OFFRE » se lève"],
  ["« cueillette »", K.cueillette - 0.05, "« CUEILLETTE » se lève"],
  ["« Et vos données? »", K.donnees, "les fichiers sortent du plateau"],
  ["« On les détruit »", K.onLes + 0.02, "« VOS DONNÉES. » claque"],
  ["« Paiement »", K.paiement - 0.03, "« PAIEMENT » se lève"],
  ["« Techno Lot point C A »", K.slogan + 0.02, "la pilule technolot.ca éclot"],
];
const SENT = { "« Vos vieux ordis »": "placard", "« Chez Techno Lot »": "rachete", "« portables »": "liste", "« Évaluation »": "evaluation", "« offre »": "offre", "« cueillette »": "cueillette", "« Et vos données? »": "donnees", "« On les détruit »": "detruit", "« Paiement »": "paiement", "« Techno Lot point C A »": "slogan" };
console.log("réplique                    voix mesurée   animation   écart (ms)   image   ce qui se passe");
for (const [w, tAnim, what] of CHECKS) {
  const s = timings.sentences.find((x) => x.id === SENT[w]);
  const m = onset(s.start);
  console.log(`${w.padEnd(27)} ${m.toFixed(3).padStart(8)}     ${tAnim.toFixed(3).padStart(7)}    ${((tAnim - m) * 1000).toFixed(0).padStart(6)}     ${String(Math.round(tAnim * 30)).padStart(4)}   ${what}`);
}
console.log("\nMots à l'intérieur des répliques (alignement Azure, recalé sur l'attaque mesurée) :");
for (const [w, sid, word, tAnim, what] of [
  ["« valent »", "valent", "valent", K.valent - 0.08, "« DORMENT. » roule vers « VALENT $ »"],
  ["« tours »", "liste", "tours", K.tours, "étiquette 02 TOURS"],
  ["« rapide »", "offre", "rapide", K.rapide + 0.02, "le 1er rouleau s'arrête net"],
  ["« détruit »", "detruit", "détruit", K.detruit, "« DÉTRUITES. » claque"],
  ["« gratuitement »", "detruit", "gratuitement", K.gratuitement, "« GRATUITEMENT. » claque (vert)"],
  ["« garanti »", "paiement", "garanti", K.check, "le crochet se dessine + ding"],
]) {
  const ww = timings.sentences.find((x) => x.id === sid).words.find((x) => x.text.normalize() === word.normalize());
  console.log(`${w.padEnd(18)} mot ${ww.start.toFixed(3)} → animation ${tAnim.toFixed(3)} (écart ${((tAnim - ww.start) * 1000).toFixed(0)} ms, image ${Math.round(tAnim * 30)}) ${what}`);
}
