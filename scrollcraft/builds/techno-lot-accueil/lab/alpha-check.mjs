// Vérifie le détourage : l'image sur fond clair, fond sombre et fond vert vif,
// plus le canal alpha seul, côte à côte.
import sharp from "sharp";
const [src, out] = process.argv.slice(2);
const img = sharp(src);
const { width, height } = await img.metadata();
const w = 560, h = Math.round((height / width) * w);
const small = await sharp(src).resize(w, h).png().toBuffer();
const bg = (c) => sharp({ create: { width: w, height: h, channels: 4, background: c } }).composite([{ input: small }]).png().toBuffer();
const alpha = await sharp(src).resize(w, h).extractChannel(3).toColourspace("b-w").png().toBuffer();
const tiles = [await bg("#e9e9e4"), await bg("#07090c"), await bg("#38ff3a"), alpha];
await sharp({ create: { width: w * 4, height: h, channels: 4, background: "#000" } })
  .composite(tiles.map((input, i) => ({ input, left: i * w, top: 0 })))
  .jpeg({ quality: 82 }).toFile(out);
console.log(width, height);
