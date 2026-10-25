import sharp from "sharp";
const { data, info } = await sharp(process.argv[2]).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const hist = {};
let inner = 0;
for (let y = 0; y < H; y++) {
  let l = -1, r = -1;
  for (let x = 0; x < W; x++) if (data[(y * W + x) * C + 3] > 128) { l = x; break; }
  for (let x = W - 1; x >= 0; x--) if (data[(y * W + x) * C + 3] > 128) { r = x; break; }
  if (l < 0) continue;
  for (let x = l + 6; x <= r - 6; x++) {
    const a = data[(y * W + x) * C + 3];
    if (a < 255) { inner++; const k = a >> 4; hist[k] = (hist[k] || 0) + 1; }
  }
}
console.log({ W, H, C, innerNon255: inner, hist });
