// Les deux images du lot en WebP : couleur en qualité 92, alpha sans perte.
// Next les ré-encode de toute façon en AVIF à la taille affichée ; le WebP
// allège seulement le dépôt (les PNG pesaient 4,8 Mo).
import sharp from "sharp";
const OUT = "/home/user/Techno-Lot/scrollcraft/builds/techno-lot-accueil/out/";
const P = "/home/user/Techno-Lot/public/accueil/";
for (const n of ["lot", "lot-fill"]) {
  await sharp(OUT + n + ".png")
    .webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(P + n + ".webp");
  const a = await sharp(OUT + n + ".png").raw().toBuffer();
  const b = await sharp(P + n + ".webp").raw().toBuffer();
  let maxA = 0, sumC = 0, cnt = 0;
  for (let i = 0; i < a.length; i += 4) {
    maxA = Math.max(maxA, Math.abs(a[i + 3] - b[i + 3]));
    if (a[i + 3] > 0) {
      sumC += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      cnt += 3;
    }
  }
  console.log(n, "écart alpha max", maxA, "écart couleur moyen", (sumC / cnt).toFixed(2));
}
