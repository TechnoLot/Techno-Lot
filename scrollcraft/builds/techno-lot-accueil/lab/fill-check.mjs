// Aperçu de l'état « après » : le commutateur sans les portables, et la palette
// seule, posés sur la pièce, à l'échelle du pic (et agrandis pour l'inspection).
import sharp from "sharp";
const P = "/home/user/Techno-Lot/public/accueil/";
const OUT = "/home/user/Techno-Lot/scrollcraft/builds/techno-lot-accueil/out/";
const out = "/home/user/Techno-Lot/scrollcraft/builds/techno-lot-accueil/lab/view/";
const W = 848, H = 1388;
const band = async (file, y0, y1) => {
  const img = await sharp(OUT + file).raw().toBuffer({ resolveWithObject: true });
  const d = img.data;
  for (let y = 0; y < H; y++) if (y < y0 || y >= y1) for (let x = 0; x < W; x++) d[(y * W + x) * 4 + 3] = 0;
  return sharp(d, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
};
const room = await sharp("/home/user/Techno-Lot/scrollcraft/builds/techno-lot-accueil/out/g2-room-a.png").resize(W + 400, H + 200, { fit: "cover" }).toBuffer();
const sw = await band("lot-fill.png", Math.round(0.2226 * H), Math.round(0.3566 * H));
const srv = await band("lot.png", Math.round(0.3566 * H), Math.round(0.5555 * H));
const tow = await band("lot.png", Math.round(0.5555 * H), Math.round(0.8199 * H));
const pal = await band("lot-fill.png", Math.round(0.8199 * H), H);
// A : sans portables (réseau + serveurs + tours + palette d'origine)
const lotOrig = await band("lot.png", Math.round(0.3566 * H), H);
const a = await sharp(room).composite([{ input: lotOrig, left: 200, top: 100 }, { input: sw, left: 200, top: 100 }]).png().toBuffer();
await sharp(a).extract({ left: 150, top: 300, width: 950, height: 420 }).toFile(out + "fill-a.png");
// B : palette seule
const b = await sharp(room).composite([{ input: pal, left: 200, top: 100 }]).png().toBuffer();
await sharp(b).extract({ left: 150, top: 1150, width: 950, height: 360 }).toFile(out + "fill-b.png");
console.log("ok");
