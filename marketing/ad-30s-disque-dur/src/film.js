// Le film : six plans enchaînés sans coupe franche (raccords dans l'écran, iris,
// morphings), et les réglages d'image instant par instant.
import * as THREE from "three";
import * as MD from "./models.js";
import { loadCanvasFonts } from "./textures.js";
import { makeTimeline } from "./timeline.js";
import { smooth, invLerp, expoIn, lerp } from "./ease.js";
import { closetShot } from "./shots/closet.js";
import { whiteShot } from "./shots/white.js";
import { counterShot } from "./shots/counter.js";
import { mapShot } from "./shots/map.js";
import { diskShot } from "./shots/disk.js";
import { endShot } from "./shots/end.js";

export const FPS = 30;

export async function buildFilm({ engine, W, H, vertical, timings }) {
  await loadCanvasFonts();
  const K = makeTimeline(timings);
  const geo = await (await fetch("assets/quebec.json")).json();
  const full = await new THREE.TextureLoader().loadAsync("assets/logo.png");
  full.colorSpace = THREE.SRGBColorSpace;
  full.anisotropy = 8;
  const icon = full.clone();
  icon.repeat.set((1321 - 596) / 1919, (726 - 52) / 1158);
  icon.offset.set(596 / 1919, 1 - 726 / 1158);
  icon.needsUpdate = true;
  const ctx = {
    W, H, vertical, K, engine, geo,
    envDark: MD.darkStudioEnv(engine.renderer),
    envBright: MD.brightStudioEnv(engine.renderer),
    logoTex: { full, icon },
  };
  const s1 = closetShot(ctx);
  const s2 = whiteShot(ctx);
  const s3 = counterShot(ctx);
  const s4 = mapShot(ctx);
  const s5 = diskShot(ctx);
  const s6 = endShot(ctx);
  const diag = Math.hypot(W, H);

  const director = (t) => {
    if (t < K.whiteout) return { a: s1.update(t) };
    if (t < K.counterIn) return { a: s2.update(t) };
    if (t < K.irisMap) return { a: s3.update(t) };
    if (t < K.mapIn) {
      // iris : la carte s'ouvre dans la pastille verte du compteur
      const a = s3.update(t), b = s4.update(t), d = s3.dotScreen();
      const k = expoIn(invLerp(K.irisMap, K.mapIn, t));
      return { a, b, mode: 1, p: new THREE.Vector4(d.x, d.y, lerp(d.r, diag, k), 1.2) };
    }
    if (t < K.irisDisk) return { a: s4.update(t) };
    if (t < K.diskIn) {
      // iris : le disque dur apparaît dans la pastille du siège
      const a = s4.update(t), b = s5.update(t), d = s4.hqScreen();
      const k = expoIn(invLerp(K.irisDisk, K.diskIn, t));
      return { a, b, mode: 1, p: new THREE.Vector4(d.x, d.y, lerp(d.r, diag, k), 1.2) };
    }
    if (t < K.end) return { a: s5.update(t) };
    return { a: s6.update(t) };
  };

  // Réglages d'image par instant (exposition, halo, grain, éclairs…)
  const plan = (t) => {
    const post = { exposure: 1, bloom: 0.22, threshold: 1.0, vignette: 0.3, ca: 0.006, grain: 0.04, flash: 0, lift: 0 };
    let samples = 24;
    const dark = () => Object.assign(post, { bloom: 0.3, threshold: 1.0, vignette: 0.42, grain: 0.042 });
    const light = () => Object.assign(post, { bloom: 0.14, threshold: 1.35, vignette: 0.16, grain: 0.03 });
    if (t < K.whiteout) {
      dark();
      post.exposure = 1 + 6 * Math.pow(smooth(K.dive + 0.35, K.whiteout, t), 2);
      if (t > K.dive) samples = 48; // plongée rapide : plus de sous-images
    } else if (t < K.counterIn) {
      light();
      // sortie de l'écran : surexposé → normal
      post.exposure = 1 + 6 * Math.pow(1 - smooth(K.whiteout, K.whiteout + 0.5, t), 2.2);
      if ((t > 9.5 && t < 10.2) || t > K.lcdZoom) samples = 44; // rampes de vitesse
    } else if (t < K.irisMap) {
      dark();
      samples = 40; // rouleaux en mouvement
    } else if (t < K.irisDisk) {
      light();
      samples = t < K.mapIn + 0.2 || t > 15.3 ? 40 : 28;
    } else if (t < K.end) {
      if (t < K.white2) dark();
      else light();
      samples = t < K.impact ? 40 : 28;
      const dt = t - K.impact;
      if (dt > 0) {
        post.exposure = 1 + 2.2 * Math.exp(-dt * 11);
        post.ca = 0.006 + 0.035 * Math.exp(-dt * 7);
      }
      if (t > K.flash - 0.14) post.exposure = 1 + 10 * Math.pow(smooth(K.flash - 0.14, K.end, t), 2);
      if (t > K.pivot - 0.1 && t < 23.4) samples = 36;
    } else {
      dark();
      post.vignette = 0.38;
      post.threshold = 1.12; // seul le vert du logo (surexposé) produit un halo
      post.flash = 1.4 * Math.exp(-(t - K.end) * 13); // éclair blanc qui retombe sur le noir
      if (t >= K.cut) Object.assign(post, { flash: 0, grain: 0.012, bloom: 0 });
    }
    return { samples, post };
  };
  return { K, director, plan };
}
