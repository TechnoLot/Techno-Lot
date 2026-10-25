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
    return { vh: innerHeight, hero: g(".tl-hero"), range: g(".tl-range"), steps: g(".tl-steps"), peak: g(".tl-peak"), close: g(".tl-close") };
  });
  const pin = (a, p) => Math.round(a.top + p * Math.max(a.h - acts.vh, 1));
  const shots = [
    ["01-hero-0", 0],
    ["02-hero-30", pin(acts.hero, 0.3)],
    ["03-hero-70", pin(acts.hero, 0.7)],
    ["04-hero-out", pin(acts.hero, 1) + Math.round(acts.vh * 0.5)],
    ["05-range-0", pin(acts.range, 0)],
    ["06-range-35", pin(acts.range, 0.35)],
    ["07-range-70", pin(acts.range, 0.7)],
    ["08-range-100", pin(acts.range, 1)],
    ["09-steps", Math.round(acts.steps.top - acts.vh * 0.1)],
    ["10-steps-b", Math.round(acts.steps.top + acts.steps.h - acts.vh)],
    ["11-peak-in", Math.round(acts.peak.top - acts.vh * 0.5)],
    ["12-peak-05", pin(acts.peak, 0.05)],
    ["13-peak-20", pin(acts.peak, 0.2)],
    ["14-peak-32", pin(acts.peak, 0.32)],
    ["15-peak-45", pin(acts.peak, 0.45)],
    ["16-peak-57", pin(acts.peak, 0.57)],
    ["17-peak-64", pin(acts.peak, 0.64)],
    ["18-peak-71", pin(acts.peak, 0.71)],
    ["19-peak-79", pin(acts.peak, 0.79)],
    ["20-peak-90", pin(acts.peak, 0.9)],
    ["21-peak-100", pin(acts.peak, 1)],
    ["22-close", Math.round(acts.close.top - acts.vh * 0.15)],
  ].filter(([n]) => !only || n.includes(only));

  // Défilement progressif jusqu'à chaque position (les états dans le temps,
  // comme l'extinction des voyants, se déclenchent en passant).
  let y = 0;
  for (const [name, target] of shots) {
    while (Math.abs(target - y) > 1) {
      const step = Math.sign(target - y) * Math.min(Math.abs(target - y), 220);
      y += step;
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(name.includes("hero") ? 900 : 700);
    await page.screenshot({ path: path.join(OUT, `${prefix}-${name}.jpg`), type: "jpeg", quality: 82 });
    const st = await page.evaluate(() => [...document.querySelectorAll("[data-sc-verify-state]")].map((e) => e.getAttribute("data-sc-verify-state")).join(" / "));
    console.log(name, y, st);
  }
  console.log("erreurs console :", errors.length ? errors : "aucune");
  await b.close();
})();
