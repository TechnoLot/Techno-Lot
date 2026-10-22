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
// Fin mesurée d'une réplique : dernier bloc au-dessus du seuil avant la réplique suivante
function offset(t0, t1) {
  let last = NaN;
  for (let i = Math.floor(t0 / 0.005); i < Math.floor(t1 / 0.005); i++) if (env[i] >= floor + 25) last = (i + 1) * 0.005;
  return last;
}
const CHECKS = [
  ["parc", "« Votre entreprise »", K.votre + 0.02, "« VOTRE PARC » roule en place"],
  ["lot", "« On rachète »", K.onRachete + 0.02, "« ON RACHÈTE » roule en place"],
  ["tout", "« Chez Technolot »", K.chez - 0.05, "« TECHNO LOT » se lève"],
  ["evaluation", "« Évaluation »", K.evaluation - 0.14, "le laser balaie et révèle « ÉVALUATION »"],
  ["offre", "« offre »", K.offre - 0.04, "« OFFRE » se lève"],
  ["cueillette", "« cueillette »", K.cueillette - 0.05, "« CUEILLETTE » se lève"],
  ["donnees", "« Et vos données? »", K.donnees, "les fichiers sortent du plateau"],
  ["detruit", "« On les détruit »", K.onLes + 0.02, "« VOS DONNÉES. » claque"],
  ["paiement", "« Paiement »", K.paiement - 0.03, "« PAIEMENT » se lève"],
  ["slogan", "« Technolot point C A »", K.slogan + 0.02, "la pilule technolot.ca éclot"],
];
console.log("réplique                    voix mesurée   animation   écart (ms)   image   ce qui se passe");
for (const [sid, w, tAnim, what] of CHECKS) {
  const s = timings.sentences.find((v) => v.id === sid);
  const m = onset(s.start);
  console.log(`${w.padEnd(27)} ${m.toFixed(3).padStart(8)}     ${tAnim.toFixed(3).padStart(7)}    ${((tAnim - m) * 1000).toFixed(0).padStart(6)}     ${String(Math.round(tAnim * 30)).padStart(4)}   ${what}`);
}
console.log("\nMots à l'intérieur des répliques (alignement Azure) :");
for (const [w, sid, word, tAnim, what] of [
  ["« en lot »", "lot", "en", K.enLot + 0.02, "« EN LOT. » roule en place, la sélection verte balaie le registre"],
  ["« neuf »", "lot", "neuf", K.neuf - 0.04, "pastille ✓ NEUF"],
  ["« usagé »", "lot", "usagé", K.usage - 0.04, "pastille ✓ USAGÉ"],
  ["« tout »", "tout", "tout", K.tout - 0.07, "« TOUT » vert se lève"],
  ["« informatique »", "tout", "informatique", K.informatique, "INFORMATIQUE passe au vert dans le mur"],
  ["« électronique »", "tout", "électronique", K.electronique, "ÉLECTRONIQUE passe au vert dans le mur"],
  ["« gratuite »", "evaluation", "gratuite", K.gratuite - 0.03, "« GRATUITE » claque"],
  ["« rapide »", "offre", "rapide", K.rapide - 0.04, "« RAPIDE » se lève"],
  ["« partout »", "cueillette", "partout", K.partout - 0.05, "« PARTOUT » se lève"],
  ["« au Québec »", "cueillette", "au", K.au - 0.08, "« AU QUÉBEC » se lève"],
  ["« détruit »", "detruit", "détruit", K.detruit, "« DÉTRUITES. » claque"],
  ["« gratuitement »", "detruit", "gratuitement", K.gratuitement, "« GRATUITEMENT. » claque (vert)"],
  ["« garanti »", "paiement", "garanti", K.check, "le crochet se dessine + ding"],
  ["« on s'occupe »", "slogan", "on", K.occupe, "« ON S'OCCUPE DE TOUT. » se tape"],
]) {
  const ww = timings.sentences.find((v) => v.id === sid).words.find((v) => v.text.normalize() === word.normalize());
  console.log(`${w.padEnd(18)} mot ${ww.start.toFixed(3)} → animation ${tAnim.toFixed(3)} (écart ${((tAnim - ww.start) * 1000).toFixed(0).padStart(4)} ms, image ${Math.round(tAnim * 30)}) ${what}`);
}
// Silence entre « Et vos données? » et « On les détruit » (demande : pas de longue pause)
const sD = timings.sentences.find((v) => v.id === "donnees");
const sX = timings.sentences.find((v) => v.id === "detruit");
const endD = offset(sD.start, sX.start - 0.02);
const onX = onset(sX.start);
console.log(`\nSilence mesuré après « Et vos données? » : ${((onX - endD) * 1000).toFixed(0)} ms (fin ${endD.toFixed(3)} s → reprise ${onX.toFixed(3)} s)`);
