// Assemble image + son, puis contrôle qualité.
//   node tools/finalize.mjs 16x9 [build/16x9.mp4]   → out/technolot-30s-16x9.mp4
//   node tools/finalize.mjs 9x16                    → out/technolot-30s-9x16.mp4
// Contrôles : ffprobe (durée, résolution, i/s, pistes), loudness EBU R128, images clés.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FF = path.join(ROOT, "venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe");
const FFPROBE = createRequire(import.meta.url)("ffprobe-static").path;
const [fmt = "16x9", src = `build/${fmt}.mp4`] = process.argv.slice(2);
const OUT = path.join(ROOT, "out", `technolot-30s-${fmt}.mp4`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const run = (exe, args) => {
  const r = spawnSync(exe, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout + r.stderr;
};

// 1) multiplexage : la vidéo est copiée telle quelle, le son encodé en AAC 48 kHz
run(FF, ["-hide_banner", "-loglevel", "error", "-y", "-i", src, "-i", "audio/mix.wav",
  "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
  "-t", "30", "-movflags", "+faststart", "-metadata", "title=Techno Lot — Le voyage d'un disque dur (30 s)", OUT]);

// 2) ffprobe
const probe = JSON.parse(run(FFPROBE, ["-v", "error", "-show_format", "-show_streams", "-count_frames", "-of", "json", OUT]));
const v = probe.streams.find((s) => s.codec_type === "video");
const a = probe.streams.find((s) => s.codec_type === "audio");
const fps = v.r_frame_rate.split("/").reduce((p, q) => p / q);
const report = {
  fichier: path.relative(ROOT, OUT),
  taille_Mo: +(probe.format.size / 1e6).toFixed(1),
  duree_conteneur_s: +(+probe.format.duration).toFixed(3),
  video: `${v.codec_name} ${v.profile} ${v.width}x${v.height} ${fps} i/s ${v.pix_fmt}, ${v.nb_read_frames} images (= ${(v.nb_read_frames / fps).toFixed(3)} s), ${(v.bit_rate / 1e6).toFixed(1)} Mb/s`,
  audio: a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels} canaux, ${(+a.duration).toFixed(3)} s, ${(a.bit_rate / 1000).toFixed(0)} kb/s` : "ABSENT",
};
// 3) loudness du fichier livré
const lo = run(FF, ["-hide_banner", "-nostats", "-i", OUT, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"]);
// le résumé final (et non les lignes de progression) : dernière occurrence de chaque mesure
const last = (re) => [...lo.matchAll(re)].pop()[1];
report.loudness = `${last(/I:\s+(-?[\d.]+) LUFS/g)} LUFS intégrés, crête vraie ${last(/Peak:\s+(-?[\d.]+) dBFS/g)} dBTP`;
const ok = v.nb_read_frames >= 899 && v.nb_read_frames <= 901 && Math.abs(fps - 30) < 1e-6 && a && Math.abs(+probe.format.duration - 30) <= 1 / 30 + 0.025;
report.verdict = ok ? "OK : 30,0 s ±1 image, 30 i/s, piste audio présente" : "À VÉRIFIER";
console.log(JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(ROOT, "out", `controle-${fmt}.json`), JSON.stringify(report, null, 2));
