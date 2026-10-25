// Pleine page sans JavaScript, et en mouvement réduit, pour vérifier que
// tout le contenu reste présent et lisible.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of [["nojs", { javaScriptEnabled: false }], ["reduced", { reducedMotion: "reduce" }]]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 }, ...opts });
    await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    if (name === "reduced") {
      // défile jusqu'au bas puis remonte, pour déclencher les apparitions
      const h = await p.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < h; y += 400) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(40); }
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
    }
    await p.screenshot({ path: `look/full-${name}.jpg`, type: "jpeg", quality: 70, fullPage: true });
    const info = await p.evaluate(() => ({ h: document.body.scrollHeight, rail: (() => { const r = document.querySelector('.tl-rail'); return r ? getComputedStyle(r).display : null; })() }));
    console.log(name, info);
    await p.close();
  }
  await b.close();
})();
