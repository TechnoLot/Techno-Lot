const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  for (const [w, h, n] of [[1440, 900, "d"], [1280, 720, "l"], [390, 844, "m"]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto("file://" + __dirname + "/hero.html", { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    await p.screenshot({ path: __dirname + `/hero-${n}.png` }); await p.close();
  }
  await b.close();
})();
