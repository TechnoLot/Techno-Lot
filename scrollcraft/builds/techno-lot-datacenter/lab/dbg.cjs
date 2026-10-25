const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { s, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), op: cs.opacity, tr: cs.transform, z: cs.zIndex, pos: cs.position }; };
    return [".tl-hero .sc-stage", ".tl-hero__layout", ".tl-hero__logo-zone", ".tl-hero__logo", ".tl-hero__line", ".tl-hero__copy", ".tl-hero__title", ".tl-hero__copy .tl-btn", ".tl-scrim--hero", "header"].map(box)
      .concat([{ scrolled: document.querySelector("header").className.slice(0, 200), y: scrollY }]);
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
