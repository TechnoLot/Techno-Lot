// Prépare le lot détouré : remplit l'intérieur de l'alpha rangée par rangée
// (le lot est convexe sur chaque rangée), recadre au plus près et publie un
// profil par rangée pour mesurer les couches.
import sharp from "sharp";
import fs from "node:fs";
const B = "/home/user/Techno-Lot/scrollcraft/builds/techno-lot-accueil";
const src = `${B}/out/g1-lot-rmbg.png`;
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const A = (x, y) => data[(y * W + x) * 4 + 3];
let holes = 0, filled = 0;
const rows = [];
for (let y = 0; y < H; y++) {
  let l = -1, r = -1;
  for (let x = 0; x < W; x++) if (A(x, y) > 128) { l = x; break; }
  for (let x = W - 1; x >= 0; x--) if (A(x, y) > 128) { r = x; break; }
  rows.push([l, r]);
  if (l < 0) continue;
  // L'alpha du détourage vaut 240 à 254 dans tout le corps (le lot serait
  // légèrement transparent) : l'intérieur de la rangée devient opaque, et
  // l'adoucissement n'est gardé que sur les vrais bords (alpha < 200).
  for (let x = l; x <= r; x++) {
    const i = (y * W + x) * 4 + 3;
    if (data[i] === 255) continue;
    holes++;
    if ((x > l + 3 && x < r - 3) || data[i] >= 200) { data[i] = 255; filled++; }
  }
}
const ys = rows.map((r, y) => (r[0] >= 0 ? y : -1)).filter((y) => y >= 0);
const top = ys[0], bottom = ys[ys.length - 1];
const left = Math.min(...rows.filter((r) => r[0] >= 0).map((r) => r[0]));
const right = Math.max(...rows.filter((r) => r[0] >= 0).map((r) => r[1]));
console.log({ W, H, holes, filled, top, bottom, left, right });
// profil : par rangée, gauche/droite et luminance/saturation moyennes au centre
const prof = [];
for (let y = top; y <= bottom; y++) {
  const [l, r] = rows[y];
  const a = Math.round(l + (r - l) * 0.2), b = Math.round(l + (r - l) * 0.8);
  let L = 0, S = 0, n = 0;
  for (let x = a; x <= b; x++) {
    const i = (y * W + x) * 4;
    const R = data[i], G = data[i + 1], Bl = data[i + 2];
    const mx = Math.max(R, G, Bl), mn = Math.min(R, G, Bl);
    L += 0.2126 * R + 0.7152 * G + 0.0722 * Bl; S += mx ? (mx - mn) / mx : 0; n++;
  }
  prof.push({ y, l, r, w: r - l, L: Math.round(L / n), S: +(S / n).toFixed(2) });
}
fs.writeFileSync(`${B}/lab/lot-profile.json`, JSON.stringify({ W, H, top, bottom, left, right, prof }));
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${B}/out/g1-lot-filled.png`);
