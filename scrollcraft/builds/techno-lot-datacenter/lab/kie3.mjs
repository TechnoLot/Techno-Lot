#!/usr/bin/env node
/**
 * Génération kie.ai pour l'accueil v2 (« le centre de données »).
 *
 * Même principe que le kie2.mjs de la v1 : chaque tâche est journalisée dans
 * lab/tasks.jsonl avant le téléchargement, pour qu'un résultat payé ne soit
 * jamais perdu, et `fetch` retélécharge ce qui manque.
 *
 *   node kie3.mjs still <nom> <ar> <scène...> [--ref fichier]... [--no-pre]
 *   node kie3.mjs shot  <nom> <tête.jpg> <mouvement...> [--tail fichier] [--dur 5]
 *   node kie3.mjs rmbg  <nom> <image-source>
 *   node kie3.mjs fetch | status
 */
import fs from "node:fs";
import path from "node:path";

const B = "/home/user/Techno-Lot/scrollcraft/builds/techno-lot-datacenter";
const OUT = path.join(B, "out");
const LOG = path.join(B, "lab", "tasks.jsonl");
const ENV = "/home/user/Techno-Lot/.claude/skills/scroll-craft/.env";
const API = "https://api.kie.ai";
const UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload";

// Préambule des objets (rail « Ce que nous rachetons »), réutilisé tel quel.
const PRE =
  "Studio product photograph of a single piece of used business computer equipment floating in a pure black seamless void. One soft white key light from above and slightly in front, low intensity, and one thin cool green rim light (#5ECB33) grazing the far edges from behind, so the silhouette separates from the black. Shot on a medium-format camera with a 120mm lens, three-quarter view, slightly from above, the whole object in frame with generous empty margins on every side. Grade: deep blacks, graphite and charcoal plastics, brushed aluminium, honest light wear and tiny scuffs, fine film grain. Photographic realism. NOT 3D render, NOT CGI, NOT illustration, no glow, no neon, no reflections of a floor, no readable text, no stickers, no logos, no brand names.";

const key = (process.env.KIE_AI_API_KEY ||
  (fs.readFileSync(ENV, "utf8").match(/^\s*KIE_AI_API_KEY\s*=\s*(.+?)\s*$/m) || [])[1] || "").replace(/^["']|["']$/g, "");
if (!key) throw new Error("clé kie.ai introuvable");
const H = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = (rec) => fs.appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...rec }) + "\n");
const readLog = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

async function upload(file) {
  const abs = path.resolve(file);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  const res = await fetch(UPLOAD, {
    method: "POST", headers: H,
    body: JSON.stringify({
      base64Data: `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`,
      uploadPath: "scrollcraft", fileName: path.basename(abs),
    }),
  });
  const j = await res.json();
  const url = j?.data?.downloadUrl || j?.data?.fileUrl || j?.data?.url;
  if (!url) throw new Error("upload: " + JSON.stringify(j));
  return url;
}

async function create(model, input) {
  const res = await fetch(`${API}/api/v1/jobs/createTask`, { method: "POST", headers: H, body: JSON.stringify({ model, input }) });
  const j = await res.json();
  if (j.code !== 200 || !j?.data?.taskId) throw new Error(`createTask ${model}: ${JSON.stringify(j)}`);
  return j.data.taskId;
}

async function wait(taskId, label, maxMin = 15) {
  const t0 = Date.now();
  let delay = 4000;
  for (;;) {
    if (Date.now() - t0 > maxMin * 60 * 1000) throw new Error(label + ": délai dépassé");
    const j = await (await fetch(`${API}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { headers: H })).json();
    const d = j?.data || {};
    const state = d.state || d.status;
    if (state === "success") {
      let o = d.resultJson;
      if (typeof o === "string") { try { o = JSON.parse(o); } catch {} }
      const urls = o?.resultUrls || o?.result_urls || o?.urls || [];
      if (!urls.length) throw new Error(label + ": succès sans URL " + JSON.stringify(d));
      return urls;
    }
    if (state === "fail" || state === "failed") throw new Error(`${label}: échec ${d.failMsg || d.failCode || ""}`);
    process.stderr.write(`  ${label}: ${state || "en file"} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
    await sleep(delay);
    delay = Math.min(delay * 1.25, 15000);
  }
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`téléchargement ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function run(name, model, input, ext = "png", maxMin = 15) {
  const taskId = await create(model, input);
  log({ name, model, taskId, phase: "created", ext });
  const urls = await wait(taskId, name, maxMin);
  log({ name, model, taskId, phase: "done", urls, ext });
  const file = path.join(OUT, `${name}.${ext}`);
  try {
    await download(urls[0], file);
    log({ name, taskId, phase: "saved", file });
    console.log("saved " + file);
  } catch (e) {
    console.log(`généré mais pas téléchargé (${e.message}) : ${name} → ${urls[0]}`);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
const flag = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
const flags = (n) => rest.flatMap((a, i) => (a === n && rest[i + 1] ? [rest[i + 1]] : []));
const positional = (valued, bare) => rest.filter((a, i) => !valued.includes(a) && !valued.includes(rest[i - 1]) && !bare.includes(a));

try {
  if (cmd === "still") {
    const noPre = rest.includes("--no-pre");
    const [name, ar, ...words] = positional(["--ref"], ["--no-pre"]);
    const scene = words.join(" ");
    const refs = flags("--ref");
    const input = { prompt: noPre ? scene : `${PRE}\n\n${scene}`, aspect_ratio: ar, quality: "high", output_format: "png", nsfw_checker: false };
    let model = "seedream/5-pro-text-to-image";
    if (refs.length) { model = "seedream/5-pro-image-to-image"; input.image_urls = await Promise.all(refs.map(upload)); }
    await run(name, model, input);
  } else if (cmd === "shot") {
    const [name, head, ...words] = positional(["--tail", "--dur"], []);
    const input = {
      prompt: words.join(" "),
      image_url: await upload(head),
      duration: String(flag("--dur") || "5"),
      // Pas de « flicker » ici : les voyants doivent clignoter. On interdit le
      // papillotement de l'exposition, pas celui des petites lumières.
      negative_prompt: "blur, distortion, low quality, warping, morphing, jitter, camera shake, exposure flicker, brightness pumping, text, watermark, cut, scene change, people",
      cfg_scale: 0.5,
    };
    if (flag("--tail")) input.tail_image_url = await upload(flag("--tail"));
    await run(name, "kling/v2-1-pro", input, "mp4", 25);
  } else if (cmd === "rmbg") {
    const [name, src] = rest;
    await run(name, "recraft/remove-background", { image: await upload(src) });
  } else if (cmd === "fetch") {
    const recs = readLog();
    const done = new Map();
    recs.filter((r) => r.phase === "done").forEach((r) => done.set(r.name, r));
    for (const [name, r] of done) {
      const file = path.join(OUT, `${name}.${r.ext || "png"}`);
      if (fs.existsSync(file)) continue;
      try { await download(r.urls[0], file); log({ name, taskId: r.taskId, phase: "saved", file }); console.log("saved " + name); }
      catch (e) { console.log(`toujours bloqué : ${name} (${e.message})`); }
    }
  } else if (cmd === "status") {
    for (const r of readLog()) console.log(r.ts, r.phase, r.name, r.taskId || "", (r.urls || [])[0] || "");
  } else {
    console.error("usage: still | shot | rmbg | fetch | status");
    process.exit(1);
  }
} catch (e) {
  console.error("ERREUR:", e.message);
  process.exit(1);
}
