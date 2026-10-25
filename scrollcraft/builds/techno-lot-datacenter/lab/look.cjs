// Captures de contrôle de l'accueil v2 à des positions précises de chaque acte.
// node look.cjs [largeur hauteur] [--reduced] [--prefix nom] [--url http://localhost:3000/]
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const W = nums[0] || 1440;
const H = nums[1] || 900;
const reduced = args.includes("--reduced");
const pi = args.indexOf("--prefix");
const prefix = pi >= 0 ? args[pi + 1] : `${W}x${H}${reduced ? "-r" : ""}`;
const ui = args.indexOf("--url");
const URL = ui >= 0 ? args[ui + 1] : "http://localhost:3000/";
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7);
const OUT = path.join(__dirname, "look");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? "reduce" : "no-preference",
    hasTouch: W < 800,
    isMobile: W < 800,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  const acts = await page.evaluate(() => {
    const g = (s) => {
      const el = document.querySelector(s);
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, h: r.height };
    };
    return {
      vh: innerHeight,
      hero: g(".tl-hero"),
      range: g(".tl-range"),
      steps: g(".tl-steps"),
      list: g(".tl-steps__list"),
      care: g(".tl-care"),
      media: g(".tl-care__media"),
      promises: g(".tl-care__promises"),
      peak: g(".tl-peak"),
      close: g(".tl-close"),
    };
  });
  const pin = (a, p) => Math.round(a.top + p * Math.max(a.h - acts.vh, 1));
  // [nom, position, attente en ms après l'arrivée]
  const shots = [
    ["01-hero-0", 0, 900],
    ["02-hero-30", pin(acts.hero, 0.3), 900],
    ["03-hero-70", pin(acts.hero, 0.7), 900],
    ["04-hero-90", pin(acts.hero, 0.9), 900],
    ["05-hero-out", pin(acts.hero, 1) + Math.round(acts.vh * 0.5), 700],
    ["06-range-0", pin(acts.range, 0), 700],
    ["07-range-50", pin(acts.range, 0.5), 700],
    ["08-range-100", pin(acts.range, 1), 700],
    ["09-steps-head", Math.round(acts.steps.top - acts.vh * 0.15), 700],
    ["10-steps-mid", Math.round(acts.list.top - acts.vh * 0.55), 700],
    ["11-steps-full", Math.round(acts.list.top + acts.list.h - acts.vh * 0.55), 700],
    ["12-care-in", Math.round(acts.media.top - acts.vh * 0.6), 500],
    ["13-care-play", Math.round(acts.media.top + acts.media.h * 0.5 - acts.vh * 0.5), 1900],
    ["14-care-end", Math.round(acts.media.top + acts.media.h * 0.5 - acts.vh * 0.5), 4200],
    ["15-promises", Math.round(acts.promises.top - acts.vh * 0.2), 1600],
    ["16-peak-in", Math.round(acts.peak.top - acts.vh * 0.4), 700],
    ["17-peak-05", pin(acts.peak, 0.05), 700],
    ["18-peak-14", pin(acts.peak, 0.14), 700],
    ["19-peak-25", pin(acts.peak, 0.25), 700],
    ["20-peak-38", pin(acts.peak, 0.38), 700],
    ["21-peak-55", pin(acts.peak, 0.55), 700],
    ["22-peak-100", pin(acts.peak, 1), 700],
    ["23-close", Math.round(acts.close.top - acts.vh * 0.15), 700],
  ].filter(([n]) => !only || n.includes(only));

  // Défilement progressif jusqu'à chaque position (les états dans le temps,
  // comme l'allumage des néons, se déclenchent en passant).
  let y = 0;
  for (const [name, target, wait] of shots) {
    while (Math.abs(target - y) > 1) {
      const step = Math.sign(target - y) * Math.min(Math.abs(target - y), 220);
      y += step;
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(OUT, `${prefix}-${name}.jpg`), type: "jpeg", quality: 82 });
    const st = await page.evaluate(() => [...document.querySelectorAll("[data-sc-verify-state]")].map((e) => e.getAttribute("data-sc-verify-state")).join(" / "));
    const van = await page.evaluate(() => {
      const m = document.querySelector(".tl-care__media");
      const v = m && m.querySelector("video");
      return m ? `${m.dataset.state} t=${v ? v.currentTime.toFixed(2) : "-"}` : "-";
    });
    console.log(name, y, st, "| fourgon", van);
  }
  console.log("erreurs console :", errors.length ? errors : "aucune");
  await b.close();
})();
