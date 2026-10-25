import sharp from "sharp";
const out = "/home/user/Techno-Lot/public/accueil/";
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
// pièce : mur sombre, sol, flaque de lumière
await sharp(svg(1500, 2000, `
  <defs><radialGradient id="p" cx="50%" cy="66%" r="45%"><stop offset="0" stop-color="#3a3d40"/><stop offset="1" stop-color="#08090a"/></radialGradient></defs>
  <rect width="1500" height="2000" fill="url(#p)"/><rect y="1200" width="1500" height="800" fill="#141618" opacity=".6"/>
  <line x1="0" y1="1200" x2="1500" y2="1200" stroke="#2a2d30" stroke-width="3"/>`)).jpeg({ quality: 80 }).toFile(out + "piece.jpg");
// lot : 5 bandes empilées (portables, réseau, serveurs, tours, palette)
const bands = [[0,0.2,0.1,0.9,"#2b2f33"],[0.2,0.4,0.05,0.95,"#3a3f44"],[0.4,0.6,0.05,0.95,"#1d2024"],[0.6,0.8,0.05,0.95,"#2a2d31"],[0.8,1,0,1,"#8a6b45"]];
await sharp(svg(900, 1200, bands.map(([t,b,l,r,c]) => `<rect x="${l*900}" y="${t*1200+4}" width="${(r-l)*900}" height="${(b-t)*1200-8}" fill="${c}" stroke="#5a6066" stroke-width="3"/>`).join(""))).png().toFile(out + "lot.png");
// cône de lumière
await sharp(svg(1500, 2000, `<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a9488"/><stop offset="1" stop-color="#000"/></linearGradient></defs>
  <rect width="1500" height="2000" fill="#000"/><polygon points="650,0 850,0 1150,1500 350,1500" fill="url(#c)" opacity=".5"/>`)).blur(30).jpeg({ quality: 80 }).toFile(out + "cone.jpg");
// poussière proche
await sharp(svg(1500, 2000, `<rect width="1500" height="2000" fill="#000"/>` + [[120,1500,40],[300,1800,25],[90,900,18],[1380,1700,30]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#d8cdbb" opacity=".7"/>`).join(""))).blur(12).jpeg({ quality: 80 }).toFile(out + "poussiere.jpg");
for (const n of ["entrepot", "poussiere-serveur"]) {
  await sharp(svg(1600, 1200, `<rect width="1600" height="1200" fill="#1a1d20"/><text x="800" y="620" font-size="80" fill="#555" text-anchor="middle" font-family="sans-serif">${n}</text>`)).jpeg({ quality: 80 }).toFile(out + n + ".jpg");
}
console.log("ok");
