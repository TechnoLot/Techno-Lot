// Reconstitue les deux surfaces que la photo ne montre pas, parce qu'une
// couche du dessus les cache : le dessus du commutateur sous les portables,
// et le plateau de la palette sous les tours. Ces pixels ne servent qu'aux
// bandes « réseau » et « palette » (lot-fill.png), placées SOUS la couche du
// dessus : ils n'apparaissent qu'une fois cette couche partie.
import sharp from "sharp";
const B = "/home/user/Techno-Lot/scrollcraft/builds/techno-lot-accueil/";
const { data: src, info } = await sharp(B + "out/g1-lot-filled.png").raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const out = Buffer.from(src);
const idx = (x, y) => (y * W + x) * 4;
const lum = (i, d = src) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// --- A. dessus du commutateur, sous le dernier portable -------------------
// Rangées 957 à 979, x 559 à 1164 : une surface de poussière uniforme, de la
// teinte moyenne des côtés visibles de chaque rangée, avec un grain de
// poussière (copier la bande visible juste devant répétait son arête claire
// et faisait des rayures).
{
  const y0 = 957, y1 = 980, x0 = 559, x1 = 1164;
  const sideMean = (y) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (const [a, z] of [[500, x0 - 3], [x1 + 3, 1235]]) {
      for (let x = a; x <= z; x++) {
        const i = idx(x, y);
        if (src[i + 3] > 230) { r += src[i]; g += src[i + 1]; b += src[i + 2]; n++; }
      }
    }
    return n > 4 ? [r / n, g / n, b / n] : null;
  };
  // moyenne de référence sur toute la hauteur, pour les rangées sans côté
  let ref = [0, 0, 0], m = 0;
  for (let y = y0; y < y1; y++) { const c = sideMean(y); if (c) { ref = ref.map((v, k) => v + c[k]); m++; } }
  ref = ref.map((v) => v / m);
  console.log("dessus du commutateur", ref.map(Math.round));
  for (let y = y0; y < y1; y++) {
    const c = sideMean(y) || ref;
    // lissage vers la moyenne : les côtés sont étroits et bruités
    const base = c.map((v, k) => 0.5 * v + 0.5 * ref[k]);
    let f = y - y0 < 2 ? 0.6 : 1; // l'arête du fond, un peu plus sombre
    for (let x = x0; x <= x1; x++) {
      let k = f * (0.93 + 0.1 * rnd());
      if (rnd() < 0.06) k *= 1.25 + 0.25 * rnd(); // grains de poussière
      const i = idx(x, y);
      out[i] = Math.min(255, base[0] * k);
      out[i + 1] = Math.min(255, base[1] * k);
      out[i + 2] = Math.min(255, base[2] * k);
      out[i + 3] = 255;
    }
  }
}

// --- B. plateau de la palette ----------------------------------------------
// Tout le dessus du plateau (rangées 1786 à 1871), dont la partie cachée
// sous les tours : les planches du dessus, dans le prolongement des bouts de
// planches visibles à l'avant (rangées 1872+), qui se resserrent légèrement
// vers le fond, avec leurs interstices. Une fois la pile partie, la lampe
// du dessus éclaire ce bois : la teinte vient des bouts de planches.
{
  const y0 = 1786, yNear = 1872, cx = 866, nearL = 451, nearR = 1281;
  const boards = [[454, 579], [641, 744], [804, 929], [996, 1096], [1154, 1281]];
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 1876; y < 1890; y++) {
    for (const [a, z] of boards) {
      for (let x = a + 6; x <= z - 6; x++) {
        const i = idx(x, y);
        if (src[i + 3] > 220) { r += src[i]; g += src[i + 1]; b += src[i + 2]; n++; }
      }
    }
  }
  r /= n; g /= n; b /= n;
  console.log("bois", Math.round(r), Math.round(g), Math.round(b), n);
  const grain = new Float32Array(2000).map(() => rnd());
  for (let y = y0; y < yNear; y++) {
    const t = (y - y0) / (yNear - y0); // 0 au fond, 1 à l'avant
    const s = 0.918 + 0.082 * t; // le fond est un peu plus étroit (perspective)
    const xl = cx + (nearL - cx) * s, xr = cx + (nearR - cx) * s;
    for (let x = Math.floor(xl) - 1; x <= Math.ceil(xr) + 1; x++) {
      const i = idx(x, y);
      // bords du trapèze adoucis sur un pixel
      const cover = Math.max(0, Math.min(1, Math.min(x - xl + 0.5, xr - x + 0.5)));
      if (cover <= 0) { out[i + 3] = 0; continue; }
      const xn = cx + (x - cx) / s;
      const onBoard = boards.some(([a, z]) => xn >= a + 2 && xn <= z - 2);
      const nearEdge = boards.some(([a, z]) => (xn >= a - 2 && xn < a + 2) || (xn > z - 2 && xn <= z + 2));
      let f = onBoard ? 1 : nearEdge ? 0.62 : 0.3;
      f *= 0.74 + 0.3 * t; // un peu plus sombre vers le fond
      if (y - y0 < 2) f *= 0.5; // arête du fond
      const gi = Math.floor(Math.abs(xn) * 0.9) % 2000;
      f *= 0.9 + 0.14 * grain[gi] + 0.06 * (rnd() - 0.5); // fil du bois
      out[i] = Math.min(255, r * f);
      out[i + 1] = Math.min(255, g * f);
      out[i + 2] = Math.min(255, b * f);
      out[i + 3] = Math.round(255 * cover);
    }
  }
}

// Seules les rangées des bandes « réseau » et « palette » servent : le reste
// devient transparent (fichier plus léger, et aucun usage par erreur).
for (let y = 0; y < H; y++) {
  const keep = (y >= 950 && y <= 1150) || y >= 1780;
  if (!keep) for (let x = 0; x < W; x++) out[idx(x, y) + 3] = 0;
}

const CROP = { left: 442, top: 648, width: 848, height: 1388 };
const cropped = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).extract(CROP).raw().toBuffer({ resolveWithObject: true });
// même assombrissement vertical que lot.png
const d = cropped.data, w = cropped.info.width, h = cropped.info.height;
for (let y = 0; y < h; y++) {
  const k = 0.95 - 0.17 * Math.pow(y / (h - 1), 1.4);
  for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
}
await sharp(d, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(B + "out/lot-fill.png");
console.log("ok");
