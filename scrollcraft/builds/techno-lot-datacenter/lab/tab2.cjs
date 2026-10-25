const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  for (let i = 0; i < 13; i++) await p.keyboard.press("Tab");
  await p.waitForTimeout(200);
  await p.keyboard.press("Tab");
  for (const t of [150, 600, 1500, 2500]) {
    await p.waitForTimeout(t === 150 ? 150 : t - 150);
    console.log(t + "ms", await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); const box = a.closest("[data-sc-in]"); return `${a.tagName} top=${Math.round(r.top)} vis=${r.bottom > 0 && r.top < innerHeight} op=${box ? getComputedStyle(box).opacity : "-"} y=${scrollY}`; }));
  }
  await p.screenshot({ path: "look/tab-form.jpg", type: "jpeg", quality: 75 });
  await b.close();
})();
