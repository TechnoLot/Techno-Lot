const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) {
    await p.screenshot({ path: `look/tw-${i}.png`, clip: { x: 0, y: 80, width: 520, height: 700 } });
    await p.waitForTimeout(260);
  }
  // pointeur posé sur la baie de gauche
  await p.mouse.move(200, 420);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `look/tw-ptr.png`, clip: { x: 0, y: 80, width: 520, height: 700 } });
  await b.close();
})();
