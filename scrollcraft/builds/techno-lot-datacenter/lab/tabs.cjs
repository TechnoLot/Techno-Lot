// Onglets « On s'occupe de tout » : clic, clavier (flèches), focus visible.
// node tabs.cjs [largeur hauteur] [--url http://localhost:3000/]
const { chromium } = require("playwright");
const path = require("path");
const args = process.argv.slice(2);
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const W = nums[0] || 1440;
const H = nums[1] || 900;
const ui = args.indexOf("--url");
const URL = ui >= 0 ? args[ui + 1] : "http://localhost:3000/";
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: "networkidle" });
  const top = await page.evaluate(() => document.querySelector(".tl-care__promises").getBoundingClientRect().top + scrollY);
  for (let y = 0; y < top - H * 0.15; y += 300) {
    await page.evaluate((yy) => scrollTo(0, yy), y);
    await page.waitForTimeout(20);
  }
  await page.evaluate((yy) => scrollTo(0, yy), Math.round(top - H * 0.15));
  await page.waitForTimeout(1500);
  const tabs = page.locator(".tl-care__tab");
  const state = () =>
    page.evaluate(() => ({
      selected: [...document.querySelectorAll(".tl-care__tab")].map((t) => t.getAttribute("aria-selected")).join(","),
      visible: [...document.querySelectorAll(".tl-care__panel")].map((p) => getComputedStyle(p).visibility).join(","),
      focus: document.activeElement && document.activeElement.textContent.trim().slice(0, 24),
      h: Math.round(document.querySelector(".tl-care__panels").getBoundingClientRect().height),
    }));
  console.log("départ", await state());
  await tabs.nth(1).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: path.join("look", `tabs-${W}-efficace.jpg`), type: "jpeg", quality: 82 });
  console.log("clic 2", await state());
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join("look", `tabs-${W}-paiement.jpg`), type: "jpeg", quality: 82 });
  console.log("flèche droite", await state());
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  console.log("flèche droite (boucle)", await state());
  await page.keyboard.press("End");
  await page.waitForTimeout(300);
  console.log("Fin", await state());
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  console.log("Tab (vers le panneau)", await page.evaluate(() => document.activeElement.className));
  console.log("erreurs console :", errors.length ? errors : "aucune");
  await b.close();
})();
