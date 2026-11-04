import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { preparerPhoto } from "@/lib/acheteurs/photo";

/*
 * Photos remises à Claude, avec le VRAI sharp : réduites, en JPEG, et sans
 * aucune métadonnée (une photo de cellulaire porte souvent sa position GPS).
 */

const COPYRIGHT = "Compagnie Fictive";

function photoAvecExif(largeur: number, hauteur: number): Promise<Buffer> {
  return sharp({ create: { width: largeur, height: hauteur, channels: 3, background: "#336699" } })
    .withExif({
      IFD0: { Copyright: COPYRIGHT, Make: "Appareil Fictif" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "45/1 30/1 0/1" },
    })
    .jpeg()
    .toBuffer();
}

describe("preparerPhoto", () => {
  it("3000 × 2000 avec EXIF : 1568 px au plus, JPEG, aucune métadonnée", async () => {
    const original = await photoAvecExif(3000, 2000);
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const sortie = await preparerPhoto(original);
    const meta = await sharp(sortie).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1568);
    expect(meta.height).toBe(1045);
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(sortie.includes(COPYRIGHT)).toBe(false);
  });

  it("une petite photo n'est pas agrandie", async () => {
    const meta = await sharp(await preparerPhoto(await photoAvecExif(800, 600))).metadata();
    expect([meta.width, meta.height]).toEqual([800, 600]);
  });

  it("applique l'orientation EXIF avant de la retirer", async () => {
    const couchee = await sharp({ create: { width: 400, height: 200, channels: 3, background: "#336699" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const meta = await sharp(await preparerPhoto(couchee)).metadata();
    expect([meta.width, meta.height]).toEqual([200, 400]);
    expect(meta.orientation).toBeUndefined();
  });

  it("convertit un PNG en JPEG", async () => {
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#ffffff" } }).png().toBuffer();
    expect((await sharp(await preparerPhoto(png)).metadata()).format).toBe("jpeg");
  });

  it("rejette des octets invalides", async () => {
    await expect(preparerPhoto(new TextEncoder().encode("pas une image"))).rejects.toBeInstanceOf(Error);
  });
});
