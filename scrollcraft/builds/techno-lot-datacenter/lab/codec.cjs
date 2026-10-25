const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.scrollTo(0, 600));
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const v = document.querySelector("video[data-sc-scrub]");
    return { h264: v.canPlayType('video/mp4; codecs="avc1.640028"'), ready: v.readyState, t: v.currentTime, dur: v.duration, src: v.getAttribute("data-sc-src"), painted: v.classList.contains("sc-has-clip"), vw: v.videoWidth };
  });
  console.log(r, "exe:", b.version());
  await b.close();
})();
