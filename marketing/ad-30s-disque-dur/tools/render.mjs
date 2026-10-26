// Capture image par image dans Chrome sans interface (GPU), encodage ffmpeg.
//   node tools/render.mjs frames 16x9 2.5,7.0,14.9 [--samples 8]   → out/frames/16x9_02.50.png …
//   node tools/render.mjs video 16x9 [--from 0 --to 30] [--samples 8] → build/16x9.mp4 (sans son)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FFMPEG = path.join(ROOT, "venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe");
const FPS = 30, DURATION = 30;

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 ? argv[i + 1] : def;
};
const [mode, fmt = "16x9", list] = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const [W, H] = fmt === "9x16" ? [1080, 1920] : [1920, 1080];
const samples = opt("samples") ? Number(opt("samples")) : undefined;

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".ttf": "font/ttf", ".wav": "audio/wav" };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  const file = path.join(ROOT, rel || "index.html");
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 600000,
  args: ["--hide-scrollbars", "--force-color-profile=srgb", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--disable-background-timer-throttling"],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
let errors = 0;
page.on("console", (m) => console.log("[page]", m.type(), m.text()));
page.on("pageerror", (e) => {
  errors++;
  console.error("[pageerror]", e.message);
});
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?fmt=${fmt}`, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__ready || window.__error, { timeout: 120000 });
const err = await page.evaluate(() => window.__error);
if (err) {
  console.error(err);
  process.exit(1);
}

async function shot(i) {
  await page.evaluate((i, s) => window.renderFrame(i, s), i, samples);
  return page.screenshot({ type: "png", optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H } });
}

const t0 = Date.now();
if (mode === "probe") {
  // node tools/render.mjs probe 16x9 <t> "<expression JS>" : évalue après director(t)
  const [, , tArg, expr] = argv;
  const res = await page.evaluate(
    (tt, src) => {
      const shot = window.film.director(tt);
      try {
        return JSON.stringify(Function("shot", "THREE", "return (" + src + ")")(shot, window.THREE), null, 1);
      } catch (e) {
        return "ERR " + e.message;
      }
    },
    Number(tArg),
    expr
  );
  console.log(res);
} else if (mode === "frames") {
  const out = path.join(ROOT, "build", "frames");
  fs.mkdirSync(out, { recursive: true });
  for (const t of list.split(",").map(Number)) {
    const buf = await shot(Math.round(t * FPS));
    const name = path.join(out, `${fmt}_${t.toFixed(2).padStart(5, "0")}.png`);
    fs.writeFileSync(name, buf);
    console.log("→", path.relative(ROOT, name));
  }
} else if (mode === "video") {
  const from = Math.round(Number(opt("from", 0)) * FPS), to = Math.round(Number(opt("to", DURATION)) * FPS);
  const outFile = path.join(ROOT, "build", opt("out", `${fmt}.mp4`));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const ff = spawn(FFMPEG, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
    // qualité maîtresse pour les plateformes (qui ré-encodent) sans débit démesuré
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-level", "4.2",
    "-x264-params", "aq-mode=3:aq-strength=0.8", "-maxrate", "28M", "-bufsize", "56M", "-g", "60",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-r", String(FPS), outFile,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = from; i < to; i++) {
    const buf = await shot(i);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if ((i - from) % 30 === 0) console.log(`image ${i}/${to} — ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log("vidéo :", path.relative(ROOT, outFile));
}
console.log(`terminé en ${((Date.now() - t0) / 1000).toFixed(1)} s — erreurs page : ${errors}`);
await browser.close();
server.close();
