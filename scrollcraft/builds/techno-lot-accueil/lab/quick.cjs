// Captures rapides : node quick.cjs <url> <outdir> <w> <h> [reduce] — positions en fractions du document.
const { chromium } = require("playwright");
const [url, out, w = "1440", h = "900", reduce] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, reducedMotion: reduce ? "reduce" : "no-preference" });
  const errs = [];
  p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + ": " + m.text()); });
  p.on("pageerror", (e) => errs.push("pageerror: " + e));
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForSelector("html.sc-ready", { timeout: 20000 }).catch(() => errs.push("no sc-ready"));
  await p.waitForTimeout(2500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const acts = await p.evaluate(() => [...document.querySelectorAll("[data-sc-act]")].map((a) => ({ act: a.dataset.scAct, cls: a.className, top: Math.round(a.getBoundingClientRect().top + scrollY), h: a.offsetHeight })));
  console.log(JSON.stringify({ H, vh: +h, acts }));
  const ys = (process.env.YS || "").split(",").filter(Boolean).map(Number);
  const list = ys.length ? ys : [0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88, 0.96, 1];
  let i = 0;
  for (const f of list) {
    const y = f <= 1 ? Math.round(f * H) : f;
    await p.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
    await p.waitForTimeout(450);
    const st = await p.evaluate(() => ({ x: getComputedStyle(document.querySelector(".tl")).getPropertyValue("--tl-x"), v: document.querySelector("[data-tl-peak]")?.getAttribute("data-sc-verify-state") }));
    await p.screenshot({ path: `${out}/${String(i).padStart(2, "0")}.png` });
    console.log(i, y, JSON.stringify(st));
    i++;
  }
  console.log(errs.slice(0, 20).join("\n"));
  await b.close();
})();
