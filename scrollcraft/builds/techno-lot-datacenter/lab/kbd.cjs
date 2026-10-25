// Parcours au clavier de l'accueil : chaque arrêt de tabulation, et s'il est
// vraiment visible (dans l'écran, opacité de son bloc). node kbd.cjs [url] [n]
const { chromium } = require("playwright");
const URL = process.argv[2] || "http://localhost:3000/";
const N = Number(process.argv[3] || 34);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  p.on("console", (m) => (m.type() === "warning" || m.type() === "error") && logs.push(m.type() + ": " + m.text()));
  p.on("pageerror", (e) => logs.push("pageerror: " + e));
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  for (let i = 0; i < N; i++) {
    await p.keyboard.press("Tab");
    await p.waitForTimeout(450);
    const s = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return "body";
      const r = a.getBoundingClientRect();
      let op = 1;
      for (let el = a; el && el !== document.body; el = el.parentElement) op *= parseFloat(getComputedStyle(el).opacity) || 0;
      const vis = getComputedStyle(a).visibility;
      const txt = (a.getAttribute("aria-label") || a.textContent || a.getAttribute("name") || a.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 34);
      const sec = a.closest("section");
      return `${a.tagName.toLowerCase()}${a.className && typeof a.className === "string" ? "." + a.className.split(" ")[0] : ""} « ${txt} » [${sec ? sec.className.split(" ")[0] : "-"}] dans l'écran=${r.bottom > 0 && r.top < innerHeight} opacité=${op.toFixed(2)} ${vis}`;
    });
    console.log(String(i + 1).padStart(2), s);
  }
  console.log("console :", logs.length ? logs : "rien");
  await b.close();
})();
