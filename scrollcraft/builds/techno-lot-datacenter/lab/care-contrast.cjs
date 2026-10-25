// Contraste du titre et du sous-titre de « On s'occupe de tout » posés sur la
// vidéo (le banc du skill ne mesure que les repères du moteur) : on masque le
// texte, on photographie le fond, on prend la zone la plus claire sous chaque
// ligne, comme le banc. node care-contrast.cjs [largeur hauteur] [--url ...]
const { chromium } = require("playwright");
const args = process.argv.slice(2);
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const W = nums[0] || 1440, H = nums[1] || 900;
const ui = args.indexOf("--url");
const URL = ui >= 0 ? args[ui + 1] : "http://localhost:3000/";
(async () => {
  const b = await chromium.launch({ executablePath: process.env.SCROLLCRAFT_CHROME || undefined });
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: W < 800, isMobile: W < 800 });
  await page.goto(URL, { waitUntil: "networkidle" });
  const y = await page.evaluate(() => {
    const m = document.querySelector(".tl-care__stage").getBoundingClientRect();
    return Math.round(m.top + scrollY);
  });
  for (let k = 0; k < y; k += 300) { await page.evaluate((v) => scrollTo(0, v), k); await page.waitForTimeout(15); }
  for (const [label, wait] of [["arrivée", 1800], ["garé", 4500]]) {
    await page.evaluate((v) => scrollTo(0, v), y);
    await page.waitForTimeout(wait);
    // comme le banc : on masque le texte et la barre fixe du site (qui passe
    // devant), pas le reste (le bloc titre est lui-même un <header>)
    await page.evaluate(() => document.querySelectorAll("body *").forEach((el) => {
      if (getComputedStyle(el).position === "fixed") el.setAttribute("data-shot-fixed", "");
    }));
    await page.addStyleTag({ content: ".tl-care__head *,[data-shot-fixed]{visibility:hidden!important}" });
    const bare = (await page.screenshot({ type: "png" })).toString("base64");
    const res = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); const g = c.getContext("2d", { willReadFrequently: true });
      const lum = (r, gr, bl) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(gr) + 0.0722 * f(bl); };
      const out = [];
      for (const sel of [".tl-care__title", ".tl-care__sub"]) {
        const el = document.querySelector(sel); const r = el.getBoundingClientRect();
        c.width = 32; c.height = 16;
        g.drawImage(img, r.left * 2, r.top * 2, r.width * 2, r.height * 2, 0, 0, 32, 16);
        const d = g.getImageData(0, 0, 32, 16).data; let maxL = 0;
        for (let k = 0; k < d.length; k += 4) maxL = Math.max(maxL, lum(d[k], d[k + 1], d[k + 2]));
        const fg = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
        const fl = lum(fg[0], fg[1], fg[2]);
        out.push(`${sel} ${((Math.max(fl, maxL) + 0.05) / (Math.min(fl, maxL) + 0.05)).toFixed(2)}:1`);
      }
      document.querySelectorAll("style").forEach((s) => { if (s.textContent.includes("tl-care__head *")) s.remove(); });
      document.querySelectorAll("[data-shot-fixed]").forEach((el) => el.removeAttribute("data-shot-fixed"));
      return out;
    }, bare);
    console.log(W + "x" + H, label, res.join("  "));
  }
  await b.close();
})();
