// Planche contact tirée du MP4 livré (et non des images de travail) :
//   node tools/contact.mjs 16x9 [colonnes] [largeur]   → out/planche-contact-16x9.png
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FF = path.join(ROOT, "venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe");
const [fmt = "16x9", cols = fmt === "9x16" ? "8" : "4", width = fmt === "9x16" ? "270" : "480", srcArg, outArg] = process.argv.slice(2);
// Une image par temps fort + les transitions
const TIMES = [0.4, 1.3, 2.62, 3.0, 3.7, 4.25, 5.2, 6.3, 8.9, 9.85, 10.45, 11.1, 11.7, 12.2, 12.75, 13.5, 14.9, 15.95, 16.6, 17.1, 17.65, 18.7, 19.42, 20.5, 21.6, 22.95, 23.3, 24.25, 24.7, 25.3, 26.5, 29.0];
const SRC = srcArg ? path.resolve(ROOT, srcArg) : path.join(ROOT, "out", `technolot-30s-${fmt}.mp4`);
const dir = path.join(ROOT, "build", "contact");
fs.mkdirSync(dir, { recursive: true });
const files = TIMES.map((t) => {
  const f = path.join(dir, `${fmt}_${t.toFixed(2).padStart(5, "0")}.png`);
  // -ss après -i : positionnement à l'image près
  const r = spawnSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-i", SRC, "-ss", String(t), "-frames:v", "1", f]);
  if (r.status !== 0) throw new Error(String(r.stderr));
  return path.relative(ROOT, f);
});
const out = outArg || path.join("out", `planche-contact-${fmt}.png`);
const r = spawnSync(process.execPath, [path.join(ROOT, "tools/sheet.mjs"), out, cols, width, ...files], { cwd: ROOT, encoding: "utf8" });
process.stdout.write(r.stdout + r.stderr);
