// Planche contact : assemble des images (PNG) en grille, avec l'instant en légende.
//   node tools/sheet.mjs sortie.png colonnes largeur img1.png img2.png …
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FF = path.join(ROOT, "venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe");
const [out, colsArg, widthArg, ...imgs] = process.argv.slice(2);
const cols = Number(colsArg), w = Number(widthArg);
const rows = Math.ceil(imgs.length / cols);
const font = "assets/fonts/JetBrainsMono-Bold.ttf".replace(/:/g, "\\:");
const args = ["-hide_banner", "-loglevel", "error", "-y"];
for (const f of imgs) args.push("-i", f);
const chains = imgs.map((f, i) => {
  const label = path.basename(f, ".png").replace(/^(16x9|9x16)_/, "").replace(/^0/, "") + " s";
  return `[${i}:v]scale=${w}:-2,drawtext=fontfile=${font}:text='${label}':x=12:y=10:fontsize=${Math.round(w / 22)}:fontcolor=0x5ECB33:box=1:boxcolor=0x050505@0.75:boxborderw=6[v${i}]`;
});
// cases vides pour compléter la grille
const pad = rows * cols - imgs.length;
let inputs = imgs.map((_, i) => `[v${i}]`).join("");
if (pad > 0) {
  chains.push(`[v0]drawbox=c=0x050505:t=fill,split=${pad}${Array.from({ length: pad }, (_, k) => `[p${k}]`).join("")}`);
  // [v0] est consommé : on le reconstruit
  chains[0] = chains[0].replace(`[v0]`, `[v0a]`);
  chains.splice(1, 0, `[v0a]split=2[v0][v0b]`);
  chains[chains.length - 1] = chains[chains.length - 1].replace("[v0]drawbox", "[v0b]drawbox");
  inputs += Array.from({ length: pad }, (_, k) => `[p${k}]`).join("");
}
const layout = Array.from({ length: rows * cols }, (_, i) => {
  const c = i % cols, r = Math.floor(i / cols);
  return `${c === 0 ? "0" : Array.from({ length: c }, () => "w0").join("+")}_${r === 0 ? "0" : Array.from({ length: r }, () => "h0").join("+")}`;
}).join("|");
const filter = chains.join(";") + `;${inputs}xstack=inputs=${rows * cols}:layout=${layout}:fill=0x050505`;
const r = spawnSync(FF, [...args, "-filter_complex", filter, "-frames:v", "1", out], { cwd: ROOT, encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(1);
}
console.log("planche :", out);
