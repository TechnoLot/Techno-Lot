// TEMPS 3 (14,6 → 17 s) · « CUEILLETTE PARTOUT AU QUÉBEC » · blanc.
// L'iris s'ouvre sur la pastille verte du siège (Mascouche). Recul en ressort sur le
// Grand Montréal : Saint-Laurent, rivière des Prairies, rivière des Mille Îles,
// Outaouais, Richelieu ; les villes (Montréal, Laval, Longueuil, Saint-Jérôme…)
// s'allument et leurs tracés verts convergent vers le siège. Un médaillon du Québec
// entier rappelle « partout au Québec ». Puis la caméra plonge dans la pastille.
import * as THREE from "three";
import { Text, measure } from "../type.js";
import { C, PAPER, ink } from "../palette.js";
import { camera, frameW, frameH, fatLine, disc, ring } from "../kit.js";
import { clamp, smooth, expoOut, expoIn, spring, invLerp, quintOut, fbm1, cubicInOut } from "../ease.js";

const v3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// Décalage des étiquettes (en rayons de pastille) : [x, y, alignement]
const LAB16 = {
  Montréal: [-1.8, -3.4, "right"], Laval: [-1.8, 1.0, "right"], Longueuil: [1.8, 0.6, "left"], Brossard: [1.8, -2.6, "left"],
  Terrebonne: [-1.8, 1.2, "right"], Repentigny: [1.8, 0.8, "left"], "Saint-Jérôme": [1.8, 0.8, "left"], Blainville: [-1.8, 1.0, "right"],
  "Saint-Eustache": [-1.8, -2.8, "right"], Mirabel: [-1.8, 1.0, "right"], Boucherville: [1.8, 0.8, "left"], Châteauguay: [-1.8, -2.8, "right"],
  "Vaudreuil-Dorion": [-1.8, 1.0, "right"], "Saint-Jean-sur-Richelieu": [-1.8, -2.8, "right"],
};
// vertical : positions calculées à l'écran (1080 px de large) pour qu'aucune étiquette
// ne se chevauche ni ne sorte du cadre ; Mirabel et Saint-Eustache, collées au bord, sont omises
const LAB916 = {
  "Saint-Jérôme": [1.8, 1.6, "left"], Repentigny: [1.8, 0.8, "left"], Terrebonne: [-1.8, -2.6, "right"], Blainville: [-1.8, 0.8, "right"],
  Boucherville: [1.8, 0.8, "left"], Laval: [-1.8, 0.8, "right"], Longueuil: [1.8, 0.8, "left"], Montréal: [-1.8, -2.6, "right"],
  Brossard: [1.8, 0.8, "left"], "Vaudreuil-Dorion": [1.8, 0.8, "left"], Châteauguay: [1.8, 0.8, "left"],
  "Saint-Jean-sur-Richelieu": [-1.8, 0.8, "right"],
};

export function mapShot({ W, H, vertical: V, K, geo }) {
  const scene = new THREE.Scene();
  scene.userData.clear = PAPER;
  const cam = camera(W, H, V ? 46 : 30, 0.002, 60);
  scene.add(cam); // le médaillon est accroché à la caméra

  // ---------------------------------------------------------------- carte du Grand Montréal
  const S = V ? 22 : 26; // unités monde par unité de carte normalisée
  const M = geo.metro;
  const mc = [(M.cities["Saint-Jérôme"][0] + M.cities["Saint-Jean-sur-Richelieu"][0]) / 2, (M.cities["Saint-Jérôme"][1] + M.cities["Saint-Jean-sur-Richelieu"][1]) / 2];
  const W3 = ([x, y], z = 0) => v3((x - mc[0]) * S, (y - mc[1]) * S, z);
  const map = new THREE.Group();
  map.rotation.x = -0.2;
  scene.add(map);
  const black = new THREE.Color().copy(C.black), green = new THREE.Color().copy(C.green);
  const water = ink("#9C9C97");
  const rivers = Object.entries(M.rivers).map(([name, pts], i) => {
    const l = fatLine(pts.map((p) => W3(p)), { color: water, width: name === "Saint-Laurent" ? (V ? 4.6 : 4) : V ? 2.8 : 2.4, W, H });
    l.userData.delay = i * 0.06;
    map.add(l);
    return l;
  });

  // cadrage de référence (vue du Grand Montréal)
  const D = V ? 3.6 : 4.05;
  const look0 = V ? v3(0.0, 0.46, 0) : v3(-0.74, -0.02, 0); // vertical : la carte sous le titre
  cam.position.set(look0.x, look0.y, D);
  cam.lookAt(look0);
  cam.updateMatrixWorld();
  const fh = frameH(cam, D), fw = frameW(cam, D);
  const dotR = fh * 0.0065;
  const labCap = fh * (V ? 0.0135 : 0.0185);
  const HQ = W3(M.cities.Mascouche, 0.002);
  const LAB = V ? LAB916 : LAB16;
  const cities = Object.keys(LAB).map((name, i) => {
    const p = W3(M.cities[name], 0.001);
    const d = disc(dotR, black, 24);
    d.position.copy(p);
    map.add(d);
    const [ox, oy, al] = LAB[name];
    const label = new Text("mono", name.toUpperCase(), { size: labCap / 0.73, color: black, align: al });
    label.position.copy(p).add(v3(dotR * ox, dotR * oy, 0.001));
    map.add(label);
    const mid = p.clone().lerp(HQ, 0.5);
    const dir = HQ.clone().sub(p);
    const ctrl = mid.add(v3(-dir.y, dir.x, 0).multiplyScalar(0.25 * (i % 2 ? 1 : -1)));
    const route = fatLine(new THREE.QuadraticBezierCurve3(p, ctrl, HQ).getPoints(40), { color: green, width: V ? 3.4 : 3, W, H });
    map.add(route);
    return { name, p, d, label, route, dist: p.distanceTo(HQ) };
  });
  // les plus proches du siège d'abord
  [...cities].sort((a, b) => a.dist - b.dist).forEach((c, i) => (c.order = i));
  const hq = disc(dotR * 2.6, new THREE.Color().copy(C.green).multiplyScalar(1.2), 64);
  hq.position.copy(HQ).setZ(0.003);
  const hqRing = ring(dotR * 3.2, dotR * 3.6, green, 64);
  hqRing.position.copy(HQ).setZ(0.003);
  const hqLabel = new Text("monoBold", "TECHNO LOT · MASCOUCHE", { size: (labCap * 1.05) / 0.73, color: black, align: "center" });
  hqLabel.position.copy(HQ).add(v3(0, dotR * 4.4, 0.003)); // au-dessus de la pastille, centrée
  map.add(hq, hqRing, hqLabel);

  // ---------------------------------------------------------------- médaillon : le Québec entier
  const inset = new THREE.Group();
  cam.add(inset);
  const dI = 1;
  const ih = 2 * dI * Math.tan(THREE.MathUtils.DEG2RAD * cam.fov * 0.5), iw = ih * cam.aspect;
  const isz = ih * (V ? 0.13 : 0.16); // demi-hauteur du Québec dans le médaillon
  // sous « AU QUÉBEC » (zone libre de la carte), sur un fond papier qui masque les lignes
  inset.position.set(V ? -iw * 0.3 : -iw * 0.38, V ? -ih * 0.37 : -ih * 0.25, -dI);
  const panelW = isz * 2.2, panelH = isz * 2.55;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), new THREE.MeshBasicMaterial({ color: PAPER, transparent: true }));
  panel.position.set(0, isz * 0.08, -0.001);
  inset.add(panel);
  const frame = fatLine([v3(-1, -1), v3(1, -1), v3(1, 1), v3(-1, 1), v3(-1, -1)].map((q) => v3(q.x * panelW / 2, q.y * panelH / 2 + isz * 0.08, 0)), { color: ink("#B4B4AF"), width: 1.2, W, H });
  inset.add(frame);
  const qOut = geo.rings.map((r) => {
    const pts = r.map(([x, y]) => v3(x * isz, y * isz, 0));
    pts.push(pts[0].clone());
    const l = fatLine(pts, { color: ink("#5A5A57"), width: 1.6, W, H });
    inset.add(l);
    return l;
  });
  const mtl = v3(geo.cities["Montréal"][0] * isz, geo.cities["Montréal"][1] * isz, 0.0005);
  const box = fatLine([v3(-1, -1), v3(1, -1), v3(1, 1), v3(-1, 1), v3(-1, -1)].map((p) => p.multiplyScalar(isz * 0.06).add(mtl)), { color: green, width: 2, W, H });
  inset.add(box);
  const FAR = ["Gaspé", "Saguenay", "Rouyn-Noranda", "Sept-Îles", "Québec", "Gatineau", "Sherbrooke", "Trois-Rivières", "Chibougamau", "Rimouski"];
  const farRoutes = FAR.map((n, i) => {
    const p = v3(geo.cities[n][0] * isz, geo.cities[n][1] * isz, 0.0005);
    const mid = p.clone().lerp(mtl, 0.5), dir = mtl.clone().sub(p);
    const ctrl = mid.add(v3(-dir.y, dir.x, 0).multiplyScalar(0.2 * (i % 2 ? 1 : -1)));
    const l = fatLine(new THREE.QuadraticBezierCurve3(p, ctrl, mtl).getPoints(32), { color: green, width: 1.6, W, H });
    inset.add(l);
    const d = disc(isz * 0.012, green, 16);
    d.position.copy(p);
    inset.add(d);
    return { l, d };
  });
  const inLabel = new Text("monoBold", "QUÉBEC", { size: (ih * 0.017) / 0.73, color: ink("#5A5A57") });
  inLabel.position.set(-panelW / 2 + isz * 0.12, isz * 0.08 + panelH / 2 - isz * 0.22, 0);
  inset.add(inLabel);
  inset.traverse((o) => {
    if (o.material) {
      o.material.depthTest = false;
      o.renderOrder = o === panel ? 39 : 40;
    }
  });

  // ---------------------------------------------------------------- typographie
  const tg = new THREE.Group();
  tg.position.set(look0.x, look0.y, 0.05);
  scene.add(tg);
  const tSize = (V ? 0.84 : 0.34) * fw / measure("black", "CUEILLETTE");
  const L1 = new Text("black", "CUEILLETTE", { size: tSize, color: black });
  const capT = L1.cap;
  const L2 = new Text("black", "PARTOUT", { size: tSize, color: black });
  const L3 = new Text("black", "AU QUÉBEC", { size: tSize, color: black });
  const x0 = V ? -0.42 * fw : -0.46 * fw;
  const y0 = V ? 0.3 * fh : 0.2 * fh;
  [L1, L2, L3].forEach((t, i) => {
    t.position.set(x0, y0 - i * capT * 1.16, 0);
    t.setClip(-capT * 0.14, capT * 1.42);
    tg.add(t);
  });

  // ---------------------------------------------------------------- animation
  const hqWorld = () => map.localToWorld(HQ.clone());
  function camPose(t) {
    const hqW = hqWorld();
    // 1) collée à la pastille (raccord iris) → 2) recul en ressort → 3) dérive → 4) plongée
    const closeP = hqW.clone().add(v3(0, 0, dotR * 2.6 * 13));
    const wideP = v3(look0.x + fbm1(t * 0.4, 41) * 0.02, look0.y + fbm1(t * 0.37, 42) * 0.015, D - 0.12 * smooth(15.4, 16.3, t));
    const k = clamp(spring(t - (K.mapIn - 0.08), 1.3, 0.8), 0, 1.06);
    let p = closeP.clone().lerp(wideP, k), l = hqW.clone().lerp(look0, k);
    const dive = invLerp(K.irisDisk - 0.42, K.diskIn, t);
    if (dive > 0) {
      const e = expoIn(dive);
      p = p.lerp(hqW.clone().add(v3(0, 0, dotR * 2.6 * 2.2)), e);
      l = l.lerp(hqW, quintOut(Math.min(1, dive * 1.6)));
    }
    return { p, l };
  }

  function update(t) {
    for (const r of rivers) r.setProgress(cubicInOut(invLerp(K.mapIn + r.userData.delay, K.mapIn + 0.7 + r.userData.delay, t)));
    for (const c of cities) {
      const t0 = K.mapIn + 0.16 + c.order * 0.035;
      const pk = spring(t - t0, 3.2, 0.5);
      c.d.scale.setScalar(Math.max(1e-3, pk));
      c.d.visible = t > t0;
      c.d.material.color.copy(t > t0 + 0.12 ? green : black);
      c.route.setProgress(expoOut(invLerp(t0 + 0.06, t0 + 0.6, t)));
      const n = Math.floor(clamp((t - t0 - 0.03) / 0.011, 0, 40));
      c.label.glyphs.forEach((g, i) => (g.visible = i < n));
    }
    hq.scale.setScalar(1 + 0.08 * Math.sin((t - K.mapIn) * 6) * Math.exp(-Math.max(0, t - K.mapIn) * 2));
    const pulse = (((t - K.mapIn) * 1.2) % 1 + 1) % 1;
    hqRing.scale.setScalar(1 + pulse * 2.5);
    hqRing.material.opacity = (1 - pulse) * 0.8 * smooth(K.mapIn, K.mapIn + 0.3, t);
    const nl = Math.floor(clamp((t - K.mapIn - 0.35) / 0.018, 0, 40));
    hqLabel.glyphs.forEach((g, i) => (g.visible = i < nl));
    // médaillon
    const ik = smooth(K.partout - 0.2, K.partout + 0.15, t);
    inset.visible = ik > 0.001;
    for (const l of qOut) l.setProgress(cubicInOut(invLerp(K.partout - 0.2, K.partout + 0.45, t)));
    panel.material.opacity = ik;
    frame.setProgress(ik);
    box.setProgress(expoOut(invLerp(K.partout + 0.1, K.partout + 0.4, t)));
    farRoutes.forEach((r, i) => {
      const t0 = K.partout + 0.1 + i * 0.04;
      r.l.setProgress(expoOut(invLerp(t0, t0 + 0.5, t)));
      r.d.visible = t > t0;
    });
    const ni = Math.floor(clamp((t - K.partout) / 0.03, 0, 10));
    inLabel.glyphs.forEach((g, i) => (g.visible = i < ni));
    // mots
    const word = (tx, t0, st = 0.04) => {
      tx.glyphs.forEach((g, i) => {
        const kk = spring(t - t0 - i * st, 2.8, 0.55);
        const b = g.userData.base;
        g.position.set(b.x, b.y - (1 - kk) * capT * 1.3, 0);
        g.rotation.x = (1 - kk) * 0.7;
      });
      tx.updateClip();
    };
    word(L1, K.cueillette - 0.05);
    word(L2, K.partout - 0.05);
    word(L3, K.au - 0.08, 0.025);
    // tout s'efface quand on plonge dans la pastille
    const fade = 1 - smooth(K.irisDisk - 0.4, K.irisDisk - 0.1, t);
    for (const tx of [L1, L2, L3, hqLabel, inLabel, ...cities.map((c) => c.label)]) tx.setOpacity(fade);
    inset.visible = inset.visible && fade > 0.01 && !V; // vertical : pas de place pour le médaillon

    const { p, l } = camPose(t);
    cam.position.copy(p);
    cam.lookAt(l);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    // carte plane : pas de profondeur de champ (le médaillon, accroché à la caméra, resterait flou)
    return { scene, camera: cam, focus: Math.max(0.01, cam.position.distanceTo(l)), aperture: 0 };
  }

  function hqScreen() {
    const c = hqWorld();
    const e = map.localToWorld(HQ.clone().add(v3(dotR * 2.6 * hq.scale.x, 0, 0)));
    const pc = c.clone().project(cam), pe = e.project(cam);
    return { x: pc.x * 0.5 + 0.5, y: pc.y * 0.5 + 0.5, r: Math.hypot((pe.x - pc.x) * 0.5 * W, (pe.y - pc.y) * 0.5 * H) };
  }
  return { update, scene, cam, hqScreen };
}
