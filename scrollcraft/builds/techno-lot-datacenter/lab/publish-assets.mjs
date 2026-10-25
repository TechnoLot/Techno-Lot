// Prépare les fichiers de l'accueil v2 dans public/accueil.
// node scrollcraft/builds/techno-lot-datacenter/lab/publish-assets.mjs  (depuis la racine du projet)
//
// - la vidéo du hero (bureau 16:9, téléphone 9:16) et leurs affiches, tirées
//   de la PREMIÈRE IMAGE DES FICHIERS ENCODÉS (pas d'une autre génération) ;
// - la lumière des voyants du hero et leur liste (la plaque « voyants
//   effacés » servait au pic de la v2, retiré : elle n'est plus publiée) ;
// - la salle vide ;
// - les six objets du rail, recadrés au carré autour de l'objet ;
// - la marque et le mot-symbole du logo, séparés.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const B = "scrollcraft/builds/techno-lot-datacenter";
const P = "public/accueil";
fs.mkdirSync(P, { recursive: true });

const frame0 = (video, out) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-frames:v", "1", out]);

// --- vidéo + affiches ------------------------------------------------------
for (const [src, dst] of [["allee.mp4", "allee.mp4"], ["allee-m.mp4", "allee-m.mp4"]]) {
  fs.copyFileSync(`${B}/assets/${src}`, `${P}/${dst}`);
}
const tmp = `${B}/out/tmp-poster.png`;
frame0(`${B}/assets/allee.mp4`, tmp);
await sharp(tmp).webp({ quality: 86, effort: 6 }).toFile(`${P}/allee.webp`);
frame0(`${B}/assets/allee-m.mp4`, tmp);
await sharp(tmp).webp({ quality: 86, effort: 6 }).toFile(`${P}/allee-m.webp`);
fs.rmSync(tmp);

// --- les voyants du hero et la salle vide du pic ------------------------------
await sharp(`${B}/out/leds/c1g-leds.png`).webp({ quality: 90, effort: 6 }).toFile(`${P}/allee-voyants.webp`);
const leds = JSON.parse(fs.readFileSync(`${B}/out/leds/c1g-leds.json`, "utf8"));
// Format compact : [x, y, r, bx, by, bw, bh] en pixels de l'image 2720 x 1530.
const compact = {
  w: leds.w,
  h: leds.h,
  l: leds.leds.map((l) => [Math.round(l.x), Math.round(l.y), Math.round(l.r * 10) / 10, l.bx, l.by, l.bw, l.bh]),
};
fs.writeFileSync(`${P}/allee-voyants.json`, JSON.stringify(compact));
await sharp(`${B}/out/vide-a.png`).webp({ quality: 90, effort: 6 }).toFile(`${P}/salle-vide.webp`);

// --- les objets ----------------------------------------------------------------
const objets = {
  serveur: "rachat-serveurs",
  portable: "rachat-portables",
  reseau: "rachat-reseau",
  stockage: "rachat-stockage",
  ecran: "rachat-ecrans",
  poste: "rachat-postes",
};
for (const [n, out] of Object.entries(objets)) {
  const img = sharp(`${B}/out/obj-${n}.png`);
  const { data, info } = await img.clone().greyscale().blur(3).raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] > 18) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let side = Math.round(Math.max(x1 - x0, y1 - y0) * 1.2);
  side = Math.min(side, info.width, info.height);
  const left = Math.max(0, Math.min(info.width - side, Math.round(cx - side / 2)));
  const top = Math.max(0, Math.min(info.height - side, Math.round(cy - side / 2)));
  // Le noir du studio est remonté au fond exact de la page (#050806, fusion
  // « éclaircir ») : plus aucun bord ni halo autour de l'objet.
  const cropped = await sharp(`${B}/out/obj-${n}.png`)
    .extract({ left, top, width: side, height: side })
    .resize(1100, 1100, { kernel: "lanczos3" })
    .toBuffer();
  await sharp(cropped)
    .composite([{ input: { create: { width: 1100, height: 1100, channels: 3, background: { r: 5, g: 8, b: 6 } } }, blend: "lighten" }])
    .webp({ quality: 88, effort: 6 })
    .toFile(`${P}/${out}.webp`);
  console.log(out, { bbox: [x0, y0, x1, y1], side, left, top });
}

// --- le logo, en deux morceaux -------------------------------------------------
await sharp("public/logo.png").extract({ left: 595, top: 51, width: 728, height: 677 }).png({ compressionLevel: 9 }).toFile(`${P}/logo-marque.png`);
await sharp("public/logo.png").extract({ left: 51, top: 829, width: 1816, height: 277 }).png({ compressionLevel: 9 }).toFile(`${P}/logo-mot.png`);

for (const f of fs.readdirSync(P).sort()) console.log(f.padEnd(28), (fs.statSync(path.join(P, f)).size / 1024).toFixed(0) + " Ko");
