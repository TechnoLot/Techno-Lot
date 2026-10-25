// Prépare la scène du fourgon (« On s'occupe de tout ») dans public/accueil.
// node scrollcraft/builds/techno-lot-datacenter/lab/publish-van.mjs  (depuis la racine du projet)
//
// - van.mp4   : la vidéo kling (out/van-a.mp4) réencodée pour le web, 1920 x 1080 ;
// - van-m.mp4 : le carré centré sur le fourgon garé, pour la mise en page empilée ;
// - leurs deux affiches, tirées des FICHIERS ENCODÉS : la première image (la
//   cour vide, sous la vidéo avant qu'elle ne joue) et la dernière (le
//   fourgon garé, pour le mouvement réduit et sans JavaScript).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const B = "scrollcraft/builds/techno-lot-datacenter";
const P = "public/accueil";
const SRC = `${B}/out/van-a.mp4`;
fs.mkdirSync(`${B}/assets`, { recursive: true });

const ff = (...args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args]);
const x264 = (crf) => ["-an", "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];

// Le fourgon s'arrête vers x = 1085 (sur 1920) : le carré de 1080 part de 545.
ff("-i", SRC, ...x264(22), `${B}/assets/van.mp4`);
ff("-i", SRC, "-vf", "crop=1080:1080:545:0,scale=864:864:flags=lanczos", ...x264(23), `${B}/assets/van-m.mp4`);

const tmp = `${B}/out/tmp-van.png`;
for (const [video, suffix] of [["van.mp4", ""], ["van-m.mp4", "-m"]]) {
  const file = `${B}/assets/${video}`;
  fs.copyFileSync(file, `${P}/${video}`);
  ff("-i", file, "-frames:v", "1", tmp);
  await sharp(tmp).webp({ quality: 86, effort: 6 }).toFile(`${P}/van-debut${suffix}.webp`);
  // -update 1 réécrit la même image à chaque trame : il reste la dernière
  ff("-sseof", "-0.5", "-i", file, "-update", "1", tmp);
  await sharp(tmp).webp({ quality: 86, effort: 6 }).toFile(`${P}/van-fin${suffix}.webp`);
}
fs.rmSync(tmp);

for (const f of fs.readdirSync(P).filter((f) => f.startsWith("van")).sort()) {
  console.log(f.padEnd(22), (fs.statSync(path.join(P, f)).size / 1024).toFixed(0) + " Ko");
}
