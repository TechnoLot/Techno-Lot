// Maquettes de direction : 3 directions x 2 images (au départ, en défilant),
// rendues en HTML réel (vraies polices, vrai texte) puis capturées.
// node maquettes.cjs  ->  lab/maq/*.png et lab/maq/planche-*.png
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const DIR = path.join(__dirname, "maq");

const head = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Inter:wght@400;500;600&display=block" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1440px;height:900px;overflow:hidden;background:#05070a;color:#f2f5f1;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .bg{position:absolute;inset:0;background-size:cover;background-position:center}
  .bar{position:absolute;inset:0 0 auto 0;height:80px;display:flex;align-items:center;justify-content:space-between;padding:0 56px;z-index:5}
  .bar img{height:46px}
  .nav{display:flex;gap:34px;font-size:15px;color:#d6dcd8;align-items:center}
  .nav .on{color:#7ee05a}
  .pill{background:#5ECB33;color:#07120a;font:600 12px Inter;letter-spacing:.14em;text-transform:uppercase;padding:12px 20px;border-radius:999px}
  .tel{border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:10px 18px;font-size:14px;color:#e8ece9}
  .d{font-family:Archivo,sans-serif;font-stretch:72%;font-weight:760;letter-spacing:-.02em;line-height:.92}
  .g{color:#5ECB33}
  .sub{font-size:19px;line-height:1.55;color:#c3cbc6;max-width:30em}
  .btn{display:inline-block;background:#5ECB33;color:#07120a;font:600 13px Inter;letter-spacing:.16em;text-transform:uppercase;padding:18px 26px;border-radius:6px}
  .lab{font:600 11px Inter;letter-spacing:.22em;text-transform:uppercase;color:#9fb0a6}
  .scrim-l{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,10,.92) 0%,rgba(5,7,10,.65) 34%,rgba(5,7,10,0) 62%)}
  .scrim-b{position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,7,10,.94) 0%,rgba(5,7,10,.6) 30%,rgba(5,7,10,0) 58%)}
  .tag{position:absolute;display:flex;align-items:center;gap:12px;font:500 15px Inter;color:#eaf0ec;white-space:nowrap}
  .tag i{display:block;height:1px;background:rgba(126,224,90,.75)}
  .tag b{font:600 10px Inter;letter-spacing:.2em;text-transform:uppercase;color:#7ee05a}
  .chip{position:absolute;left:56px;bottom:40px;font:600 11px Inter;letter-spacing:.22em;text-transform:uppercase;color:#7c8a82}
</style>`;

const bar = `<div class="bar"><img src="logo.png"><div class="nav"><span class="on">Accueil</span><span>À Propos</span><span>Contact</span><span>Blog</span><span>FAQ</span><span class="pill">Soumission</span></div><div style="display:flex;gap:12px;align-items:center"><span class="tel">514-944-3939</span><span class="tel">FR · EN</span></div></div>`;

const frames = {
  // A. Circuit vivant : vidéo plein écran sur la carte mère
  a1: `<div class="bg" style="background-image:url(a1.jpg)"></div><div class="scrim-l"></div>${bar}
    <div style="position:absolute;left:56px;top:190px;width:760px">
      <h1 class="d" style="font-size:112px">Vos lots informatiques ont <span class="g">de la valeur</span></h1>
      <p class="sub" style="margin-top:30px">On donne une seconde vie à votre matériel, et on vous paie pour ça. Réponse en 24 heures.</p>
      <div style="margin-top:36px"><span class="btn">Faire une soumission</span></div>
    </div>`,
  a2: `<div class="bg" style="background-image:url(a2.jpg)"></div><div class="scrim-l"></div>${bar}
    <div style="position:absolute;left:56px;top:230px;width:640px">
      <p class="lab">Ce que nous rachetons</p>
      <h2 class="d" style="font-size:88px;margin-top:22px">Tout ce qui a <span class="g">un circuit.</span></h2>
      <p class="sub" style="margin-top:26px">Ordinateurs, serveurs, réseau, stockage, téléphonie, écrans. Neuf ou usagé, en lot ou en parc complet.</p>
    </div>`,
  // B. Éclaté 3D : le portable se démonte au défilement
  b1: `<div class="bg" style="background-image:url(b1.jpg)"></div><div class="scrim-l"></div>${bar}
    <div style="position:absolute;left:56px;top:210px;width:620px">
      <h1 class="d" style="font-size:108px">Vos lots informatiques ont <span class="g">de la valeur</span></h1>
      <p class="sub" style="margin-top:30px">On donne une seconde vie à votre matériel, et on vous paie pour ça.</p>
      <div style="margin-top:36px"><span class="btn">Faire une soumission</span></div>
    </div>`,
  b2: `<div class="bg" style="background-image:url(b2.jpg)"></div><div class="scrim-l" style="opacity:.8"></div>${bar}
    <div style="position:absolute;left:56px;top:150px;width:520px">
      <h2 class="d" style="font-size:80px">Chaque pièce <span class="g">compte.</span></h2>
      <p class="sub" style="margin-top:22px">Écran, carte mère, stockage : on évalue tout, pièce par pièce.</p>
    </div>
    <div class="tag" style="left:520px;top:235px"><span>Écran</span><i style="width:200px"></i></div>
    <div class="tag" style="left:500px;top:438px"><span>Clavier</span><i style="width:290px"></i></div>
    <div class="tag" style="left:470px;top:560px"><span>Carte mère</span><i style="width:300px"></i></div>
    <div class="tag" style="left:330px;top:658px"><span>Stockage <b>&nbsp;données détruites, certificat remis</b></span><i style="width:150px"></i></div>
    <div class="tag" style="left:560px;top:780px"><span>Boîtier</span><i style="width:240px"></i></div>`,
  // C. Le centre de données : l'allée se vide au défilement
  c1: `<div class="bg" style="background-image:url(c1.jpg)"></div><div class="scrim-b"></div>${bar}
    <div style="position:absolute;left:0;right:0;bottom:96px;text-align:center">
      <h1 class="d" style="font-size:124px">Vos lots informatiques ont <span class="g">de la valeur</span></h1>
      <p class="sub" style="margin:26px auto 0">On donne une seconde vie à votre matériel, et on vous paie pour ça.</p>
      <div style="margin-top:32px"><span class="btn">Faire une soumission</span></div>
    </div>`,
  c2: `<div class="bg" style="background-image:url(c2.jpg)"></div><div class="scrim-b"></div>${bar}
    <div style="position:absolute;left:0;right:0;bottom:110px;text-align:center">
      <h2 class="d" style="font-size:132px">Votre espace est <span class="g">libre.</span></h2>
      <p class="sub" style="margin:24px auto 0">Ramassage gratuit, paiement rapide et garanti, données détruites avec certificat.</p>
      <div style="margin-top:30px"><span class="btn">Faire une soumission</span></div>
    </div>`,
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  for (const [k, body] of Object.entries(frames)) {
    const file = path.join(DIR, `${k}.html`);
    fs.writeFileSync(file, `<!doctype html><html lang="fr"><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`);
    await p.goto("file://" + file, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(DIR, `${k}.png`) });
    console.log("ok", k);
  }
  await b.close();
})();
