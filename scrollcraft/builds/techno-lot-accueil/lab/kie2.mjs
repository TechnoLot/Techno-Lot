#!/usr/bin/env node
/**
 * Wrapper de génération qui ne perd jamais un résultat.
 *
 * Le kie.mjs du skill télécharge le résultat dans le même processus et ne
 * garde ni l'identifiant de tâche ni l'URL : si le téléchargement échoue (hôte
 * de fichiers bloqué par le réseau), l'image payée est perdue. Ici chaque
 * étape est journalisée dans lab/tasks.jsonl avant d'aller plus loin, et
 * `fetch` retélécharge plus tard à partir du journal.
 *
 *   node kie2.mjs still <nom> <ar> <scène...> [--ref fichier]...
 *   node kie2.mjs rmbg  <nom> <image-source>        (détourage recraft)
 *   node kie2.mjs fetch                             (retélécharge ce qui manque)
 *   node kie2.mjs status                            (état du journal)
 */
import fs from "node:fs";
import path from "node:path";

const B = "/home/user/Techno-Lot/scrollcraft/builds/techno-lot-accueil";
const OUT = path.join(B, "out");
const LOG = path.join(B, "lab", "tasks.jsonl");
const ENV = "/home/user/Techno-Lot/.claude/skills/scroll-craft/.env";
const API = "https://api.kie.ai";
const UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload";

const PRE =
  "Industrial still-life photography on a medium-format camera with a long 150mm lens from far away, so perspective is flat and frontal. One soft overhead key light directly above and slightly in front of the subject, a dim cool ambient fill, deep falloff into near-black shadow. Grade: graphite black, cold steel greys, a faint warm tungsten edge on the highlights, desaturated mid-tones. Texture: fine film grain, real dust on matte metal, small scuffs, honest wear. Photographic realism. NOT 3D render, NOT CGI, NOT illustration, NOT clay, no digital glow, no plastic sheen, no readable text, no stickers, no logos, no brand names.";

const key = (process.env.KIE_AI_API_KEY ||
  (fs.readFileSync(ENV, "utf8").match(/^\s*KIE_AI_API_KEY\s*=\s*(.+?)\s*$/m) || [])[1] || "").replace(/^["']|["']$/g, "");
if (!key) throw new Error("clé kie.ai introuvable");
const H = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(rec) {
  fs.appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...rec }) + "\n");
}
function readLog() {
  if (!fs.existsSync(LOG)) return [];
  return fs.readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

async function upload(file) {
  const abs = path.resolve(file);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
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

async function wait(taskId, label) {
  const t0 = Date.now();
  let delay = 4000;
  for (;;) {
    if (Date.now() - t0 > 15 * 60 * 1000) throw new Error(label + ": délai dépassé");
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

async function run(name, model, input) {
  const taskId = await create(model, input);
  log({ name, model, taskId, phase: "created" });
  const urls = await wait(taskId, name);
  log({ name, model, taskId, phase: "done", urls });
  const file = path.join(OUT, `${name}.png`);
  try {
    await download(urls[0], file);
    log({ name, taskId, phase: "saved", file });
    console.log("saved " + file);
  } catch (e) {
    console.log(`généré mais pas téléchargé (${e.message}) : ${name} → ${urls[0]}`);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
const flags = (n) => rest.flatMap((a, i) => (a === n && rest[i + 1] ? [rest[i + 1]] : []));

try {
  if (cmd === "still") {
    const [name, ar, ...words] = rest.filter((a, i) => a !== "--ref" && rest[i - 1] !== "--ref");
    const scene = words.join(" ");
    const refs = flags("--ref");
    const input = { prompt: `${PRE}\n\n${scene}`, aspect_ratio: ar, quality: "high", output_format: "png", nsfw_checker: false };
    let model = "seedream/5-pro-text-to-image";
    if (refs.length) { model = "seedream/5-pro-image-to-image"; input.image_urls = await Promise.all(refs.map(upload)); }
    await run(name, model, input);
  } else if (cmd === "rmbg") {
    const [name, src] = rest;
    await run(name, "recraft/remove-background", { image: await upload(src) });
  } else if (cmd === "fetch") {
    const recs = readLog();
    const done = new Map();
    recs.filter((r) => r.phase === "done").forEach((r) => done.set(r.name, r));
    const saved = new Set(recs.filter((r) => r.phase === "saved").map((r) => r.name));
    for (const [name, r] of done) {
      if (saved.has(name) && fs.existsSync(path.join(OUT, `${name}.png`))) continue;
      try {
        await download(r.urls[0], path.join(OUT, `${name}.png`));
        log({ name, taskId: r.taskId, phase: "saved" });
        console.log("saved " + name);
      } catch (e) { console.log(`toujours bloqué : ${name} (${e.message})`); }
    }
  } else if (cmd === "status") {
    for (const r of readLog()) console.log(r.ts, r.phase, r.name, r.taskId || "", (r.urls || [])[0] || "");
  } else {
    console.error("usage: still | rmbg | fetch | status");
    process.exit(1);
  }
} catch (e) {
  console.error("ERREUR:", e.message);
  process.exit(1);
}
