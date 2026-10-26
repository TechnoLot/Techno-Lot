// PLAN 2 (6,1 → 10,9 s) · blanc. « Chez Technolot, on achète tout ce qui est
// informatique ou électronique. » « TECHNO LOT » se lève, puis « TOUT » (vert)
// claque au milieu d'un mur de catégories qui se remplit mot à mot ;
// « INFORMATIQUE » et « ÉLECTRONIQUE » passent au vert quand la voix les dit.
// Sortie : la caméra plonge dans le « O » de « TOUT » (iris vers le scan).
import * as THREE from "three";
import { Text, measure, glyphHole } from "../type.js";
import { C, PAPER, ink } from "../palette.js";
import { camera, frameW, frameH } from "../kit.js";
import { clamp, smooth, spring, invLerp, fbm1, cubicInOut } from "../ease.js";

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Le mur : tout ce qui est informatique ou électronique (rangées justifiées)
const ROWS16 = [
  ["PORTABLES", "ORDINATEURS", "SERVEURS", "ÉCRANS", "CELLULAIRES"],
  ["TABLETTES", "IMPRIMANTES", "ROUTEURS", "COMMUTATEURS", "CÂBLES"],
  ["DISQUES DURS", "SSD", "MÉMOIRE", "PROCESSEURS", "TÉLÉPHONES IP"],
  null, // « TOUT »
  ["INFORMATIQUE", "CAMÉRAS", "PROJECTEURS", "ÉLECTRONIQUE"],
  ["TÉLÉVISEURS", "CONSOLES", "ONDULEURS", "PIÈCES", "ACCESSOIRES"],
  ["NEUF", "USAGÉ", "EN BOÎTE", "EN LOT", "SURPLUS", "INVENTAIRE"],
];
const ROWS916 = [
  ["PORTABLES", "SERVEURS", "ÉCRANS"],
  ["CELLULAIRES", "TABLETTES"],
  ["IMPRIMANTES", "ROUTEURS", "SSD"],
  ["DISQUES DURS", "MÉMOIRE"],
  null,
  ["INFORMATIQUE", "CÂBLES"],
  ["CAMÉRAS", "ÉLECTRONIQUE"],
  ["TÉLÉVISEURS", "CONSOLES"],
  ["NEUF", "USAGÉ", "EN LOT"],
];

export function toutShot({ W, H, vertical: V, K }) {
  const scene = new THREE.Scene();
  scene.userData.clear = PAPER;
  const cam = camera(W, H, V ? 46 : 30, 0.05, 100);
  const D = 10;
  cam.position.set(0, 0, D);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  const fw = frameW(cam, D), fh = frameH(cam, D);
  const G = new THREE.Group();
  scene.add(G);
  const black = C.black, green = new THREE.Color().copy(C.green);
  const wallInk = ink("#5A5A57");

  // « TECHNO LOT » (marque)
  const brandSize = (V ? 0.86 : 0.8) * fw / measure("black", "TECHNO LOT");
  const brand = new Text("black", "TECHNO LOT", { size: brandSize, color: black, align: "center", segs: 14 });
  const capB = brand.cap;
  brand.position.set(0, -capB / 2, 0.02);
  brand.setClip(-capB * 0.16, capB * 1.16);
  G.add(brand);

  // « TOUT » (vert, très grand)
  const toutSize = (V ? 0.78 : 0.4) * fw / measure("black", "TOUT");
  const tout = new Text("black", "TOUT", { size: toutSize, color: green, align: "center", segs: 16 });
  const capT = tout.cap;
  tout.position.set(0, -capT / 2, 0.03);
  tout.setClip(-capT * 0.16, capT * 1.16);
  G.add(tout);
  // réserve blanche derrière « TOUT » (le mur ne passe pas dessous)
  const knock = new THREE.Mesh(new THREE.PlaneGeometry(tout.width * 1.08, capT * 1.3), new THREE.MeshBasicMaterial({ color: PAPER }));
  knock.position.set(0, 0, 0.01);
  G.add(knock);

  // le mur de catégories
  const rows = V ? ROWS916 : ROWS16;
  const tIdx = rows.indexOf(null);
  const rowGap = V ? capT * 0.2 : capT * 0.16;
  const words = [];
  let order = 0;
  const wallW = (V ? 0.88 : 0.9) * frameW(cam, D - 0.75); // tient dans le cadre même caméra avancée
  // hauteur de rangée commune : la plus longue rangée tient dans la largeur
  const sep = 0.5; // espace entre mots, en em
  const em = Math.min(
    ...rows.filter(Boolean).map((r) => wallW / (r.reduce((s, w) => s + measure("bold", w), 0) + sep * (r.length - 1)))
  );
  const capW = new Text("bold", "T", { size: em }).cap;
  const rowH = capW * 1.42;
  rows.forEach((r, ri) => {
    if (!r) return;
    // position verticale : de part et d'autre de « TOUT »
    const above = ri < tIdx;
    const k = above ? tIdx - ri : ri - tIdx;
    const y = above ? capT * 0.62 + rowGap + (k - 1) * rowH : -capT * 0.62 - rowGap - capW - (k - 1) * rowH;
    // justification : l'espace restant se répartit entre les mots
    const natural = r.reduce((s, w) => s + measure("bold", w, em), 0);
    const gap = r.length > 1 ? (wallW - natural) / (r.length - 1) : 0;
    let x = -wallW / 2;
    for (const wd of r) {
      const t = new Text("bold", wd, { size: em, color: wallInk });
      t.position.set(x, y, 0);
      t.setClip(-capW * 0.3, capW * 1.45);
      G.add(t);
      words.push({ t, wd, order: order++, hi: wd === "INFORMATIQUE" ? K.informatique : wd === "ÉLECTRONIQUE" ? K.electronique : null });
      x += measure("bold", wd, em) + gap;
    }
  });
  // ordre d'apparition : du centre vers l'extérieur (les rangées proches de « TOUT » d'abord)
  words.sort((a, b) => Math.abs(a.t.position.y) - Math.abs(b.t.position.y) || a.t.position.x - b.t.position.x);
  words.forEach((w, i) => (w.order = i));

  // contre-forme du « O » de « TOUT » (iris vers le scan)
  const hole = glyphHole("black", "O");
  const oG = tout.glyphs[1];
  const oLocal = () => {
    const b = oG.userData.base;
    return v3(tout.position.x + b.x - oG.userData.adv / 2 + hole.cx * toutSize, tout.position.y + b.y - capT / 2 + hole.cy * toutSize, 0.03);
  };

  const rise = (tx, t, t0, stagger, capH, out = null) => {
    tx.glyphs.forEach((g, i) => {
      const b = g.userData.base;
      const k = spring(t - t0 - i * stagger, 2.9, 0.55);
      const o = out ? cubicInOut(invLerp(out + i * 0.03, out + 0.18 + i * 0.03, t)) : 0;
      g.position.set(b.x, b.y - (1 - k) * capH * 1.3 + o * capH * 1.32, 0);
      g.rotation.x = (1 - k) * 0.8 - o * 0.9;
    });
    tx.updateClip();
  };

  function update(t) {
    // marque, puis « TOUT »
    brand.visible = t > K.chez - 0.12 && t < K.achete + 0.6;
    if (brand.visible) rise(brand, t, K.chez - 0.05, 0.035, capB, K.achete - 0.06);
    tout.visible = knock.visible = t > K.tout - 0.12;
    if (tout.visible) rise(tout, t, K.tout - 0.07, 0.05, capT);
    // le mur se remplit, puis les deux mots dits passent au vert
    const w0 = K.tout + 0.12;
    for (const w of words) {
      const t0 = w0 + w.order * 0.045;
      w.t.visible = t > t0 - 0.02;
      if (!w.t.visible) continue;
      w.t.glyphs.forEach((g) => {
        const b = g.userData.base;
        const k = spring(t - t0, 3.2, 0.6);
        g.position.set(b.x, b.y - (1 - k) * capW * 1.3, 0);
      });
      w.t.updateClip();
      if (w.hi !== null) {
        const h = smooth(w.hi - 0.04, w.hi + 0.06, t);
        w.t.setColor(new THREE.Color().copy(wallInk).lerp(green, h));
        w.t.scale.setScalar(1 + 0.08 * Math.sin(Math.PI * clamp((t - w.hi) / 0.3)) * (t > w.hi ? 1 : 0));
      }
    }
    // caméra : lente poussée, puis plongée dans le « O » de « TOUT »
    const push = smooth(K.toutIn, K.toutOut, t);
    const pos = v3(fbm1(t * 0.4, 71) * 0.05, fbm1(t * 0.36, 72) * 0.04, D - 0.7 * push);
    const look = v3(0, 0, 0);
    const dive = invLerp(K.toutOut - 0.42, K.scanIn + 0.02, t);
    if (dive > 0) {
      const o = oLocal();
      const e = Math.pow(dive, 2.6);
      pos.lerp(o.clone().add(v3(0, 0, 0.03)), e);
      look.lerp(o, smooth(K.toutOut - 0.42, K.toutOut - 0.15, t));
    }
    cam.position.copy(pos);
    cam.lookAt(look);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return { scene, camera: cam, focus: Math.max(0.05, cam.position.z - 0.03), aperture: dive > 0 ? 0.002 : 0.03 };
  }

  function holeScreen() {
    const c = oLocal();
    const pc = c.clone().project(cam);
    const px = c.clone().add(v3(hole.rx * toutSize, 0, 0)).project(cam);
    const py = c.clone().add(v3(0, hole.ry * toutSize, 0)).project(cam);
    return { x: pc.x * 0.5 + 0.5, y: pc.y * 0.5 + 0.5, rx: Math.abs(px.x - pc.x) * 0.5 * W, ry: Math.abs(py.y - pc.y) * 0.5 * H };
  }
  return { update, scene, cam, holeScreen };
}
