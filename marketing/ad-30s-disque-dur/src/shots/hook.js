// PLAN 1 (0 → 6,4 s) · le parc informatique d'une entreprise.
// Un registre d'inventaire (neuf et usagé, de tout) se remplit en perspective.
// « POUR LES ENTREPRISES » · « VOTRE PARC / INFORMATIQUE? » roule en
// « ON RACHÈTE / EN LOT. » pendant que tout le lot se sélectionne en vert ;
// « ✓ NEUF » « ✓ USAGÉ ». Puis la caméra plonge dans le « O » de « LOT. » (iris).
import * as THREE from "three";
import { Text, measure, glyphHole } from "../type.js";
import { C, NIGHT } from "../palette.js";
import { camera, frameW, frameH } from "../kit.js";
import { makeInventory } from "../inventory.js";
import { smooth, expoIn, expoOut, spring, lerp, invLerp, fbm1, cubicInOut } from "../ease.js";
import { INV } from "../timeline.js";

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
// fond des étiquettes posées sur le registre (noir de la palette)
const PLATE = new THREE.Color(0.004, 0.004, 0.004);

// Pastille « case cochée » : contour vert arrondi + texte
function checkTag(label, h) {
  const g = new THREE.Group();
  // le crochet est dessiné (la police monospace n'a pas de glyphe « ✓ »)
  const col = new THREE.Color().copy(C.green).multiplyScalar(1.1);
  const t = new Text("monoBold", label, { size: h / 0.73, color: col });
  const ck = new THREE.Shape();
  const u = h;
  ck.moveTo(0, 0.45 * u);
  ck.lineTo(0.18 * u, 0.62 * u);
  ck.lineTo(0.42 * u, 0.36 * u);
  ck.lineTo(0.95 * u, 0.95 * u);
  ck.lineTo(1.12 * u, 0.78 * u);
  ck.lineTo(0.42 * u, 0.0);
  ck.closePath();
  const check = new THREE.Mesh(new THREE.ShapeGeometry(ck), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
  const w = t.width + h * 3.25, hh = h * 2.3;
  const s = new THREE.Shape();
  const r = hh / 2;
  s.absarc(r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  s.absarc(w - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  const hole = new THREE.Path();
  const k = h * 0.12;
  hole.absarc(r, 0, r - k, Math.PI / 2, (3 * Math.PI) / 2, false);
  hole.absarc(w - r, 0, r - k, -Math.PI / 2, Math.PI / 2, false);
  s.holes.push(hole);
  const ring = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color().copy(C.green), transparent: true }));
  // fond opaque : la colonne « ÉTAT » du registre (NEUF / USAGÉ en vert) passe derrière
  const plate = new THREE.Shape();
  plate.absarc(r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  plate.absarc(w - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(plate, 24), new THREE.MeshBasicMaterial({ color: PLATE, transparent: true, opacity: 0.94 }));
  fill.position.z = -0.0004;
  check.position.set(h * 0.8, -h * 0.5, 0.0005);
  t.position.set(h * 2.45, -h / 2, 0.0005);
  g.add(fill, ring, check, t);
  g.userData = { w, t, ring };
  return g;
}

export function hookShot({ W, H, vertical: V, K }) {
  const scene = new THREE.Scene();
  scene.userData.clear = NIGHT;
  const cam = camera(W, H, V ? 46 : 30, 0.02, 60);

  // registre d'inventaire : une grande feuille inclinée qui fuit vers le fond
  const inv = makeInventory({ width: 8 });
  const U = inv.userData.uniforms;
  inv.rotation.set(-0.62, V ? 0.12 : 0.3, 0);
  inv.position.set(V ? 0.2 : 0.9, -0.55, -2.2);
  scene.add(inv);

  // caméra : pose de référence (lecture du titre) et dérive lente
  const P0 = V ? v3(-0.05, 0.22, 4.6) : v3(-0.12, 0.18, 4.4);
  const P1 = V ? v3(0.05, 0.05, 3.9) : v3(0.06, 0.0, 3.75);
  const L0 = v3(0.1, -0.35, -1.5), L1 = v3(0.18, -0.4, -1.6);
  const kRef = cubicInOut(4.5 / 5.6);
  cam.position.copy(lerp3(P0, P1, kRef));
  cam.lookAt(lerp3(L0, L1, kRef));
  cam.updateMatrixWorld();
  function lerp3(a, b, k) {
    return a.clone().lerp(b, k);
  }

  // titre : plan face caméra
  const dText = 2.4;
  const fw = frameW(cam, dText), fh = frameH(cam, dText);
  const tg = new THREE.Group();
  tg.position.copy(cam.position).add(new THREE.Vector3(0, 0, -dText).applyQuaternion(cam.quaternion));
  tg.quaternion.copy(cam.quaternion);
  scene.add(tg);
  const size = (V ? 0.96 : 0.66) * fw / measure("black", "INFORMATIQUE?");
  const white = C.white, green = new THREE.Color().copy(C.green).multiplyScalar(1.15);
  const mk = (s) => new Text("black", s, { size, color: white, segs: 14, align: "center" });
  const a1 = mk("VOTRE PARC"), a2 = mk("INFORMATIQUE?"), b1 = mk("ON RACHÈTE"), b2 = mk("EN LOT.");
  const cap = a1.cap;
  // « LOT. » en vert
  b2.glyphs.forEach((g, i) => i >= 3 && g.userData.mesh.material.color.copy(green));
  const x0 = 0;
  const y1 = V ? 0.06 * fh : 0.1 * fh;
  const lead = cap * 1.2;
  for (const [t, y] of [[a1, y1], [b1, y1], [a2, y1 - lead], [b2, y1 - lead]]) {
    t.position.set(x0, y, 0);
    t.setClip(-cap * 0.16, cap * 1.42);
    tg.add(t);
  }
  // « POUR LES ENTREPRISES »
  const tagH = (V ? 0.024 : 0.03) * fh;
  const tag = new Text("monoBold", "POUR LES ENTREPRISES", { size: tagH / 0.73, color: green });
  const tagW = tagH * 1.6 + tag.width;
  tag.position.set(-tagW / 2 + tagH * 1.6, y1 + cap + tagH * 2.2, 0);
  const bullet = new THREE.Mesh(new THREE.PlaneGeometry(tagH * 0.9, tagH * 0.9), new THREE.MeshBasicMaterial({ color: green, transparent: true }));
  bullet.position.set(-tagW / 2 + tagH * 0.45, y1 + cap + tagH * 2.2 + tagH * 0.5, 0);
  // plaque sombre derrière la mention (les lignes du registre défilent derrière)
  const tagPlate = new THREE.Mesh(new THREE.PlaneGeometry(tagW + tagH * 1.4, tagH * 2.2), new THREE.MeshBasicMaterial({ color: PLATE, transparent: true, opacity: 0.9 }));
  tagPlate.position.set(0, y1 + cap + tagH * 2.2 + tagH * 0.5, -0.0004);
  tg.add(tagPlate, tag, bullet);
  // « ✓ NEUF » « ✓ USAGÉ »
  const pillH = (V ? 0.026 : 0.032) * fh;
  const neuf = checkTag("NEUF", pillH), usage = checkTag("USAGÉ", pillH);
  const py = y1 - lead - cap * 0.55 - pillH * 1.4;
  const pillsW = neuf.userData.w + pillH * 0.8 + usage.userData.w;
  neuf.position.set(-pillsW / 2, py, 0);
  usage.position.set(-pillsW / 2 + neuf.userData.w + pillH * 0.8, py, 0);
  tg.add(neuf, usage);

  // contre-forme du « O » de « LOT. » (iris vers le plan suivant)
  const hole = glyphHole("black", "O");
  const oGlyph = b2.glyphs[4];
  const oLocal = () => {
    const b = oGlyph.userData.base;
    return v3(b.x - oGlyph.userData.adv / 2 + hole.cx * size, b.y - cap / 2 + hole.cy * size, 0);
  };

  function roll(tx, t, t0, mode, stagger = 0.04) {
    tx.glyphs.forEach((g, i) => {
      const b = g.userData.base, ti = t0 + i * stagger;
      let dy = 0, rx = 0;
      if (mode === "in") {
        const k = spring(t - ti, 2.8, 0.55);
        dy = -(1 - k) * cap * 1.3;
        rx = (1 - k) * 0.8;
      } else {
        const k = cubicInOut(invLerp(ti, ti + 0.17, t));
        dy = k * cap * 1.32;
        rx = -k * 0.9;
      }
      g.position.set(b.x, b.y + dy, 0);
      g.rotation.x = rx;
    });
    tx.updateClip();
  }

  function update(t) {
    // registre : déjà rempli aux trois quarts dès la 1re image (miniature), le reste
    // s'écrit vite, puis « tout le lot » se sélectionne
    U.uIn.value = INV.fill0 + (1 - INV.fill0) * expoOut(invLerp(0.0, INV.fillDur, t));
    U.uSel.value = cubicInOut(invLerp(K.enLot - 0.05, K.lot + 0.55, t));
    U.uFade.value = 1;

    // titres : VOTRE PARC / INFORMATIQUE? → ON RACHÈTE / EN LOT.
    const s1 = K.onRachete - 0.06, s2 = K.enLot - 0.06;
    a1.visible = t < s1 + 0.6;
    if (a1.visible) roll(a1, t, t < s1 ? K.votre + 0.02 : s1, t < s1 ? "in" : "out");
    a2.visible = t < s2 + 0.7;
    if (a2.visible) roll(a2, t, t < s2 ? K.votre + 0.16 : s2, t < s2 ? "in" : "out", 0.03);
    b1.visible = t >= s1;
    if (b1.visible) roll(b1, t, s1 + 0.08, "in");
    b2.visible = t >= s2;
    if (b2.visible) roll(b2, t, s2 + 0.08, "in", 0.05);
    // « POUR LES ENTREPRISES » est là dès la 1re image (miniature) : rien à animer
    for (const [p, t0] of [[neuf, K.neuf - 0.04], [usage, K.usage - 0.04]]) {
      const k = spring(t - t0, 3.2, 0.5);
      p.visible = t > t0;
      p.scale.setScalar(Math.max(1e-3, k));
    }

    // caméra : lente poussée avec dérive, puis plongée dans le « O »
    const k = cubicInOut(invLerp(0, 5.6, t));
    const pos = lerp3(P0, P1, k), look = lerp3(L0, L1, k);
    pos.x += fbm1(t * 0.5, 61) * 0.04;
    pos.y += fbm1(t * 0.45, 62) * 0.03;
    cam.position.copy(pos);
    cam.lookAt(look);
    cam.updateMatrixWorld();
    const dive = invLerp(5.62, K.toutIn + 0.02, t);
    if (dive > 0) {
      tg.updateMatrixWorld(true);
      const o = tg.localToWorld(oLocal());
      const e = Math.pow(dive, 2.6);
      cam.position.lerp(o.clone().add(new THREE.Vector3(0, 0, 0.02).applyQuaternion(tg.quaternion)), e);
      const q = cam.quaternion.clone();
      cam.lookAt(o);
      cam.quaternion.slerp(q, 1 - smooth(5.62, 6.0, t)).normalize();
    }
    cam.fov = V ? 46 : 30;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const focus = Math.max(0.05, tg.position.clone().sub(cam.position).dot(new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion)));
    return { scene, camera: cam, focus, aperture: dive > 0 ? 0.004 : 0.03 };
  }

  // contre-forme du « O » à l'écran : centre (uv) et demi-axes (px)
  function holeScreen() {
    tg.updateMatrixWorld(true);
    const c = tg.localToWorld(oLocal());
    const ex = tg.localToWorld(oLocal().add(v3(hole.rx * size, 0, 0)));
    const ey = tg.localToWorld(oLocal().add(v3(0, hole.ry * size, 0)));
    const pc = c.clone().project(cam), px = ex.project(cam), py = ey.project(cam);
    return { x: pc.x * 0.5 + 0.5, y: pc.y * 0.5 + 0.5, rx: Math.abs(px.x - pc.x) * 0.5 * W, ry: Math.abs(py.y - pc.y) * 0.5 * H };
  }
  return { update, scene, cam, holeScreen };
}
