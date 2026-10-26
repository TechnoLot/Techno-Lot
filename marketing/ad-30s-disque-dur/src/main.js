// Point d'entrée : construit le film et expose renderFrame(i) au script de capture.
//   index.html?fmt=16x9 (défaut) ou ?fmt=9x16
import * as THREE from "three";
import { Engine } from "./engine.js";
import { loadFonts } from "./type.js";
import { buildFilm, FPS } from "./film.js";

const params = new URLSearchParams(location.search);
const vertical = params.get("fmt") === "9x16";
const W = vertical ? 1080 : 1920;
const H = vertical ? 1920 : 1080;
const canvas = document.getElementById("c");
canvas.style.width = W + "px";
canvas.style.height = H + "px";

try {
  await loadFonts();
  const timings = await (await fetch("voice/timings.json")).json();
  const engine = new Engine(canvas, W, H);
  const film = await buildFilm({ engine, W, H, vertical, timings });
  window.film = film;
  window.engine = engine;
  window.THREE = THREE;
  // i : numéro d'image (30 i/s) ; samples : sous-images (sinon valeur du plan)
  window.renderFrame = (i, samples) => {
    const t = i / FPS;
    const plan = film.plan(t);
    engine.renderFrame(t, i, film.director, { samples: samples ?? plan.samples, post: plan.post });
    return true;
  };
  window.__ready = true;
} catch (e) {
  console.error(e.stack || e);
  window.__error = String(e.stack || e);
}
