// Fil de travail des aperçus : réduit une photo à la taille de sa vignette, hors du fil principal.
// Une photo de téléphone (12 Mpx) occupe ≈ 48 Mo une fois décodée ; l'aperçu n'en garde que ≈ 1 Mo.

type Demande = { id: number; file: File; cote: number };

// Une photo à la fois : une seule image pleine résolution en mémoire.
let file: Promise<void> = Promise.resolve();

const OPTIONS = { resizeQuality: "high", imageOrientation: "from-image" } as const;

self.onmessage = (e: MessageEvent<Demande>) => {
  const { id, file: photo, cote } = e.data;
  file = file.then(async () => {
    let blob: Blob | null = null;
    try {
      // Décodage déjà réduit (largeur 2 × cote, proportions gardées, orientation EXIF appliquée).
      let bmp = await createImageBitmap(photo, { ...OPTIONS, resizeWidth: 2 * cote });
      if (bmp.height < cote) {
        // Image très large (panorama) : c'est la hauteur qui fixe le petit côté.
        bmp.close();
        bmp = await createImageBitmap(photo, { ...OPTIONS, resizeHeight: cote });
      }
      // Plus petit côté ramené à `cote` pixels : même cadrage que l'original.
      const k = Math.min(1, cote / Math.min(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * k));
      const h = Math.max(1, Math.round(bmp.height * k));
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bmp, 0, 0, w, h);
      }
      bmp.close();
      // PNG : la transparence éventuelle est conservée.
      if (ctx) blob = await canvas.convertToBlob({ type: "image/png" });
    } catch {
      /* format non décodable ici : la page affiche l'original, comme avant */
    }
    self.postMessage({ id, blob });
  });
};
