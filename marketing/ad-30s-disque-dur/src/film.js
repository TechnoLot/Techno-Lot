// Le film : sept plans enchaînés sans coupe franche (iris à travers les lettres
// « O », plongée dans un « $ », pastilles, morphing cube → notification), et les
// réglages d'image instant par instant.
import * as THREE from "three";
import * as MD from "./models.js";
import { loadCanvasFonts } from "./textures.js";
import { makeTimeline } from "./timeline.js";
import { smooth, invLerp, expoIn, lerp } from "./ease.js";
import { hookShot } from "./shots/hook.js";
import { toutShot } from "./shots/tout.js";
import { scanShot } from "./shots/scan.js";
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
  const hook = hookShot(ctx);
  const tout = toutShot(ctx);
  const scan = scanShot(ctx);
  const counter = counterShot(ctx);
  const map = mapShot(ctx);
  const disk = diskShot(ctx);
  const end = endShot(ctx);
  const diag = Math.hypot(W, H);

  // iris elliptique dans la contre-forme d'un « O » : grandit jusqu'à couvrir l'image
  const holeIris = (shot, t0, t1, t) => {
    const h = shot.holeScreen();
    const k = expoIn(invLerp(t0, t1, t));
    const g = lerp(1, (1.2 * diag) / Math.max(1, Math.min(h.rx, h.ry)), k);
    return new THREE.Vector4(h.x, h.y, h.rx * g, h.ry * g);
  };
  const dotIris = (d, t0, t1, t) => new THREE.Vector4(d.x, d.y, lerp(d.r, diag, expoIn(invLerp(t0, t1, t))), 1.2);

  const director = (t) => {
    if (t < K.hookOut) return { a: hook.update(t) };
    if (t < K.toutIn) return { a: hook.update(t), b: tout.update(t), mode: 4, p: holeIris(hook, K.hookOut, K.toutIn, t) };
    if (t < K.toutOut) return { a: tout.update(t) };
    if (t < K.scanIn) return { a: tout.update(t), b: scan.update(t), mode: 4, p: holeIris(tout, K.toutOut, K.scanIn, t) };
    if (t < K.counterIn) return { a: scan.update(t) };
    if (t < K.irisMap) return { a: counter.update(t) };
    if (t < K.mapIn) {
      const a = counter.update(t), b = map.update(t);
      return { a, b, mode: 1, p: dotIris(counter.dotScreen(), K.irisMap, K.mapIn, t) };
    }
    if (t < K.irisDisk) return { a: map.update(t) };
    if (t < K.diskIn) {
      const a = map.update(t), b = disk.update(t);
      return { a, b, mode: 1, p: dotIris(map.hqScreen(), K.irisDisk, K.diskIn, t) };
    }
    if (t < K.end) return { a: disk.update(t) };
    return { a: end.update(t) };
  };

  // Réglages d'image par instant (exposition, halo, grain, éclairs…)
  const plan = (t) => {
    const post = { exposure: 1, bloom: 0.22, threshold: 1.0, vignette: 0.3, ca: 0.006, grain: 0.04, flash: 0, lift: 0 };
    let samples = 24;
    const dark = () => Object.assign(post, { bloom: 0.3, threshold: 1.0, vignette: 0.42, grain: 0.042 });
    const light = () => Object.assign(post, { bloom: 0.14, threshold: 1.35, vignette: 0.16, grain: 0.03 });
    const near = (a, w = 0.25) => Math.abs(t - a) < w;
    if (t < K.toutIn) {
      dark();
      if (t > K.hookOut - 0.5) samples = 44; // plongée dans le « O »
    } else if (t < K.scanIn) {
      light();
      if (t > K.toutOut - 0.45) samples = 44;
    } else if (t < K.counterIn) {
      dark();
      samples = t > K.dollarZoom - 0.1 ? 44 : 28;
    } else if (t < K.irisMap) {
      dark();
      samples = 40; // rouleaux en mouvement
    } else if (t < K.irisDisk) {
      light();
      samples = t < K.mapIn + 0.4 || t > K.irisDisk - 0.45 ? 40 : 28;
    } else if (t < K.end) {
      if (t < K.white2) dark();
      else light();
      samples = t < K.impact + 0.05 ? 44 : 28;
      const dt = t - K.impact;
      if (dt > 0) {
        post.exposure = 1 + 2.2 * Math.exp(-dt * 11);
        post.ca = 0.006 + 0.035 * Math.exp(-dt * 7);
      }
      if (t > K.flash - 0.14) post.exposure = 1 + 10 * Math.pow(smooth(K.flash - 0.14, K.end, t), 2);
      if (near(K.pivot + 0.25, 0.4)) samples = 36;
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
