const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  // 1. Clavier : chaque arrêt de tabulation doit être visible.
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForSelector("html.sc-ready");
  await p.waitForTimeout(1500);
  const stops = [];
  for (let i = 0; i < 18; i++) {
    await p.keyboard.press("Tab");
    await p.waitForTimeout(1400);
    stops.push(await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return "body";
      const r = el.getBoundingClientRect();
      let o = 1, n = el;
      while (n && n !== document.body) { o *= parseFloat(getComputedStyle(n).opacity || "1"); n = n.parentElement; }
      const inView = r.bottom > 0 && r.top < innerHeight && r.width > 0;
      const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 34);
      return `${el.tagName.toLowerCase()} "${label}" visible=${inView && o > 0.85 ? "oui" : "NON"} (op ${o.toFixed(2)}, y ${Math.round(r.top)})`;
    }));
  }
  console.log(stops.join("\n"));
  // 2. Sans JavaScript : tout le contenu doit être visible.
  const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const q = await ctx.newPage();
  await q.goto("http://localhost:3000/", { waitUntil: "load" });
  const nojs = await q.evaluate(() => {
    const hidden = [...document.querySelectorAll(".tl [data-sc-cue], .tl [data-sc-in], .tl .tl-line, .tl .tl-ledger__foot")]
      .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99).map((el) => el.className.toString().slice(0, 30));
    return { hidden, h1: document.querySelector("h1")?.textContent };
  });
  console.log("sans JS :", JSON.stringify(nojs));
  await q.screenshot({ path: "shots/nojs.png", fullPage: true });
  await b.close();
})();
