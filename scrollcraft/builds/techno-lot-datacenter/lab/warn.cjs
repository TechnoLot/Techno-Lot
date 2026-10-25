const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  for (const url of ["http://localhost:3000/", "http://localhost:3000/en"]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const logs = [];
    p.on("console", (m) => (m.type() === "warning" || m.type() === "error") && logs.push(m.type() + ": " + m.text()));
    p.on("pageerror", (e) => logs.push("pageerror: " + e));
    await p.goto(url, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    const st = await p.evaluate(() => [...document.querySelectorAll("[data-sc-stage]")].map((s) => getComputedStyle(s).position));
    // tabulation : les 12 premiers arrêts
    const stops = [];
    for (let i = 0; i < 14; i++) {
      await p.keyboard.press("Tab");
      await p.waitForTimeout(120);
      stops.push(await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return `${a.tagName}:${(a.textContent || a.getAttribute("aria-label") || "").trim().slice(0, 28)}@${Math.round(r.top)},vis=${r.bottom > 0 && r.top < innerHeight}`; }));
    }
    console.log(url, "stages:", st.join(","), "\n  logs:", logs.length ? JSON.stringify(logs) : "aucun", "\n  tab:", stops.join(" | "));
    await p.close();
  }
  await b.close();
})();
