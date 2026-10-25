// Produit les visuels finaux de public/accueil à partir des sorties kie.ai
// (out/) et de la photo réelle du disque dur. Reproductible : relancer après
// tout changement de source, dans l'ordre lot-prep, assets-prep, lot-fill,
// to-webp. Le lot est préparé en PNG dans out/, puis converti en WebP.
import sharp from "sharp";
const B = "/home/user/Techno-Lot/scrollcraft/builds/techno-lot-accueil/out/";
const P = "/home/user/Techno-Lot/public/accueil/";

// Recadrage du lot (pixels de l'image source 1728x2304), mesuré sur l'alpha.
const CROP = { left: 442, top: 648, width: 848, height: 1388 };

// 1. Le lot : retire un grain de poussière isolé au-dessus de la pile,
//    recadre, et assombrit légèrement le bas (la lampe est au-dessus).
{
  const { data, info } = await sharp(B + "g1-lot-filled.png").raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < 656; y++) for (let x = 0; x < info.width; x++) data[(y * info.width + x) * 4 + 3] = 0;
  const cropped = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(CROP).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = cropped.info;
  const d = cropped.data;
  for (let y = 0; y < h; y++) {
    const k = 0.95 - 0.17 * Math.pow(y / (h - 1), 1.4); // 0,95 en haut, 0,78 en bas
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      d[i] = Math.round(d[i] * k); d[i + 1] = Math.round(d[i + 1] * k); d[i + 2] = Math.round(d[i + 2] * k);
    }
  }
  await sharp(d, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(B + "lot.png");
  console.log("lot", w, h);
}

// 2. La pièce vide.
await sharp(B + "g2-room-a.png").jpeg({ quality: 86, mozjpeg: true }).toFile(P + "piece.jpg");

// 3. Le faisceau (fusion « screen ») : noirs écrasés pour ne pas voiler.
await sharp(B + "g4-cone-a.png").resize(1296, 1728).linear(1.06, -9).jpeg({ quality: 84, mozjpeg: true }).toFile(P + "cone.jpg");

// 4. La poussière proche (fusion « screen ») : en miroir pour qu'elle encadre
//    le lot du côté du séparateur, noirs écrasés, bas effacé (pas de sol).
{
  const W = 1296, H = 1728;
  const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="0.72" stop-color="#fff"/><stop offset="0.86" stop-color="#000"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
  const base = await sharp(B + "g5-near-b.png").resize(W, H).flop().linear(1.35, -46).toBuffer();
  await sharp(base).composite([{ input: fade, blend: "multiply" }]).jpeg({ quality: 84, mozjpeg: true }).toFile(P + "poussiere.jpg");
}

// 5. Ligne 1 : le même lot, au fond de la pièce vide (composition).
{
  const roomTop = 600, W = 1728, H = 1296;
  const room = await sharp(B + "g2-room-a.png").extract({ left: 0, top: roomTop, width: W, height: H }).toBuffer();
  const lotH = 360, lotW = Math.round(lotH * (CROP.width / CROP.height));
  const lot = await sharp(B + "lot.png").resize(lotW, lotH).toBuffer();
  const baseY = 808, cx = W / 2;
  const sw = Math.round(lotW * 1.5), sh = 46;
  const shadow = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}"><defs><radialGradient id="s"><stop offset="0" stop-color="#000" stop-opacity="0.85"/><stop offset="0.55" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${sw / 2}" cy="${sh / 2}" rx="${sw / 2}" ry="${sh / 2}" fill="url(#s)"/></svg>`)).png().toBuffer();
  await sharp(room)
    .composite([
      { input: shadow, left: Math.round(cx - sw / 2), top: Math.round(baseY - sh * 0.62) },
      { input: lot, left: Math.round(cx - lotW / 2), top: baseY - lotH },
    ])
    .resize(1600, 1200)
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(P + "entrepot.jpg");
}

// (Ligne 3 : public/accueil/disque.jpg vient de la photo réelle du site,
//  recadrée et étalonnée une fois avec ffmpeg :
//  ffmpeg -i public/photos/datacenter.jpg -vf "crop=1422:1066:89:0,
//    eq=saturation=0.78:contrast=1.06:brightness=-0.02,
//    colorbalance=bs=0.04:bm=0.015:rh=0.02" -q:v 3 public/accueil/disque.jpg)

// 6. Ligne 2 : la trace de doigt dans la poussière, recadrée en 4:3.
await sharp(B + "g7-dust-a.png").extract({ left: 300, top: 0, width: 2040, height: 1530 }).resize(1600, 1200)
  .jpeg({ quality: 84, mozjpeg: true }).toFile(P + "poussiere-serveur.jpg");

console.log("ok");
