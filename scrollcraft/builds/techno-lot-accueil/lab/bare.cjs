// Reproduit la mesure de contraste du harnais à une position : capture
// normale + capture « nue » (textes et éléments fixes masqués), et la boîte
// de chaque texte cherché.
const { chromium } = require("playwright");
const [url, y, out, ...needles] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForSelector("html.sc-ready");
  await p.waitForTimeout(2200);
  await p.evaluate((y) => scrollTo({ top: +y, behavior: "instant" }), y);
  await p.waitForTimeout(700);
  await p.screenshot({ path: out + "-n.png" });
  const boxes = await p.evaluate((needles) => needles.map((n) => {
    const el = [...document.querySelectorAll("[data-sc-cue]")].find((e) => e.textContent.trim().startsWith(n));
    if (!el) return n + ": introuvable";
    const r = el.getBoundingClientRect();
    return `${n.slice(0, 20)}: ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} op=${getComputedStyle(el).opacity}`;
  }), needles);
  console.log(boxes.join("\n"));
  await p.evaluate(() => document.querySelectorAll("body *").forEach((el) => { if (getComputedStyle(el).position === "fixed") el.setAttribute("data-sc-shot-fixed", ""); }));
  await p.addStyleTag({ content: "[data-sc-cue],[data-sc-cue] *,[data-sc-copy],[data-sc-copy] *,[data-sc-shot-fixed]{visibility:hidden!important}" });
  await p.waitForTimeout(150);
  await p.screenshot({ path: out + "-b.png" });
  await b.close();
})();
