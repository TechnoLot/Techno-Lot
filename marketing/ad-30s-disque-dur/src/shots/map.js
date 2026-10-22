// TEMPS 3 (13,42 → 16,1 s) · « CUEILLETTE PARTOUT AU QUÉBEC ».
// L'iris s'ouvre depuis la pastille verte : c'est le siège (Mascouche). Le contour
// du Québec se dessine en lignes, les régions s'allument, des tracés verts
// convergent vers la pastille ; un point lumineux fait le trajet depuis Gaspé.
// Puis la caméra plonge dans la pastille : nouvel iris, vers le disque dur.
import * as THREE from "three";
import { Text, measure } from "../type.js";
import { C, PAPER } from "../palette.js";
import { camera, frameW, frameH, fatLine, disc, ring } from "../kit.js";
import { clamp, smooth, expoOut, expoIn, spring, lerp, invLerp, quintOut, fbm1, cubicInOut } from "../ease.js";

const v3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);

export function mapShot({ W, H, vertical: V, K, geo }) {
  const scene = new THREE.Scene();
  scene.userData.clear = PAPER;
  const cam = camera(W, H, V ? 46 : 30, 0.01, 200);
  const D = 10;
  cam.position.set(0, 0, D);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  const fh = frameH(cam, D), fw = frameW(cam, D);

  // ---------------------------------------------------------------- carte
  const mapH = V ? fh * 0.46 : fh * 0.84; // hauteur du territoire
  const S = mapH / 2;
  const map = new THREE.Group();
  const mapPos = V ? v3(fw * 0.02, -fh * 0.13, 0) : v3(fw * 0.2, -fh * 0.01, 0);
  map.position.copy(mapPos);
  map.rotation.x = -0.32;
  scene.add(map);
  const ink = new THREE.Color().copy(C.black);
  const outlines = geo.rings.map((r, i) => {
    const pts = r.map(([x, y]) => v3(x * S, y * S, 0));
    pts.push(pts[0].clone());
    const l = fatLine(pts, { color: ink, width: V ? 2.6 : 2.2, W, H });
    l.userData.delay = i * 0.12;
    map.add(l);
    return l;
  });
  const P = (name) => v3(geo.cities[name][0] * S, geo.cities[name][1] * S, 0.001);
  const HQ = P("Mascouche");
  const CITIES = ["Gaspé", "Rimouski", "Sept-Îles", "Baie-Comeau", "Saguenay", "Alma", "Chibougamau", "Rouyn-Noranda", "Val-d'Or", "Gatineau", "Sherbrooke", "Québec", "Trois-Rivières", "Drummondville", "Saint-Jérôme", "Matane"];
  // étiquettes choisies pour ne pas se chevaucher (décalage x, y en rayons de pastille)
  const LABELS = V
    ? { Gaspé: [1.8, 1.2], Saguenay: [-1.8, 1.4], Québec: [1.8, -0.6], "Sept-Îles": [-1.8, 1.4] }
    : { Gaspé: [1.8, 1.2], Saguenay: [-1.8, 1.4], "Rouyn-Noranda": [-1.8, 1.4], Gatineau: [-1.8, -3.2], Québec: [1.8, -0.6], Sherbrooke: [1.8, -3.0], "Sept-Îles": [1.8, 1.0] };
  const green = new THREE.Color().copy(C.green);
  const dotR = fh * 0.0055;
  const cities = CITIES.map((name, i) => {
    const p = P(name);
    const d = disc(dotR, ink, 24);
    d.position.copy(p);
    map.add(d);
    // tracé en arc vers le siège
    const mid = p.clone().lerp(HQ, 0.5);
    const dir = HQ.clone().sub(p);
    const nrm = v3(-dir.y, dir.x, 0).normalize().multiplyScalar(dir.length() * 0.22 * (i % 2 ? 1 : -1));
    const ctrl = mid.add(nrm);
    const curve = new THREE.QuadraticBezierCurve3(p, ctrl, HQ);
    const pts = curve.getPoints(48);
    const route = fatLine(pts, { color: green, width: V ? 3.4 : 3.0, W, H });
    map.add(route);
    let label = null;
    if (LABELS[name]) {
      const [ox, oy] = LABELS[name];
      label = new Text("mono", name.toUpperCase(), { size: fh * (V ? 0.017 : 0.0165) / 0.73, color: ink, align: ox < 0 ? "right" : "left" });
      label.position.copy(p).add(v3(dotR * ox, dotR * oy, 0));
      map.add(label);
    }
    const dist = p.distanceTo(HQ);
    return { name, p, d, route, label, curve, dist, delay: 0 };
  });
  // les plus lointaines partent en premier
  [...cities].sort((a, b) => b.dist - a.dist).forEach((c, i) => (c.delay = i * 0.055));
  const hero = cities.find((c) => c.name === "Gaspé");
  const runner = disc(dotR * 1.5, new THREE.Color().copy(C.green).multiplyScalar(1.4), 32);
  runner.position.z = 0.003;
  map.add(runner);
  // siège : pastille verte + onde
  const hq = disc(fh * 0.016, new THREE.Color().copy(C.green).multiplyScalar(1.2), 64);
  hq.position.copy(HQ).setZ(0.004);
  const hqRing = ring(fh * 0.02, fh * 0.023, green, 64);
  hqRing.position.copy(HQ).setZ(0.004);
  const hqLabel = new Text("monoBold", "TECHNO LOT · MASCOUCHE", { size: fh * (V ? 0.018 : 0.017) / 0.73, color: ink });
  hqLabel.position.copy(HQ).add(v3(-fh * 0.03, -fh * 0.045, 0.004));
  if (!V) hqLabel.position.x = HQ.x - hqLabel.width - fh * 0.03;
  else hqLabel.position.set(HQ.x + fh * 0.03, HQ.y - fh * 0.045, 0.004);
  map.add(hq, hqRing, hqLabel);

  // ---------------------------------------------------------------- typographie
  const tg = new THREE.Group();
  scene.add(tg);
  const tSize = V ? (0.84 * fw) / measure("black", "CUEILLETTE") : (0.4 * fw) / measure("black", "CUEILLETTE");
  const L1 = new Text("black", "CUEILLETTE", { size: tSize, color: ink });
  const capT = L1.cap;
  const L2 = new Text("black", "PARTOUT", { size: tSize, color: ink });
  const L3 = new Text("black", "AU QUÉBEC", { size: tSize, color: ink });
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
    // 1) collée à la pastille (raccord iris) → 2) recul en ressort → 3) dérive → 4) plongée
    const wideP = v3(fbm1(t * 0.4, 41) * 0.08, fbm1(t * 0.37, 42) * 0.06, D - 0.5 * smooth(14.3, 15.3, t));
    const wideL = v3(0, 0, 0);
    const hqW = hqWorld();
    const closeP = hqW.clone().add(v3(0, 0, D * 0.1));
    const k = clamp(spring(t - (K.mapIn - 0.1), 1.25, 0.8), 0, 1.06);
    let p = closeP.clone().lerp(wideP, k), l = hqW.clone().lerp(wideL, k);
    const dive = invLerp(15.3, K.diskIn, t);
    if (dive > 0) {
      const e = expoIn(dive);
      const endP = hqW.clone().add(v3(0, 0, D * 0.012));
      p = p.lerp(endP, e);
      l = l.lerp(hqW, quintOut(Math.min(1, dive * 1.6)));
    }
    return { p, l };
  }

  function update(t) {
    // contour du territoire
    for (const o of outlines) o.setProgress(cubicInOut(invLerp(K.mapIn + o.userData.delay, K.mapIn + 0.85 + o.userData.delay, t)));
    // régions, tracés et étiquettes
    for (const c of cities) {
      const t0 = K.mapIn + 0.35 + c.delay;
      const pk = spring(t - t0, 3.2, 0.5);
      c.d.scale.setScalar(Math.max(1e-3, pk));
      c.d.visible = t > t0;
      c.route.setProgress(expoOut(invLerp(t0 + 0.08, t0 + 0.75, t)));
      if (c.label) {
        const n = Math.floor(clamp((t - t0 - 0.1) / 0.02, 0, 40));
        c.label.glyphs.forEach((g, i) => (g.visible = i < n));
      }
      // la région « s'allume » en vert quand son tracé part
      c.d.material.color.copy(t > t0 + 0.1 ? green : ink);
    }
    // le point qui voyage depuis Gaspé
    const rk = cubicInOut(invLerp(hero.delay + K.mapIn + 0.45, hero.delay + K.mapIn + 1.55, t));
    runner.visible = rk > 0 && rk < 1;
    runner.position.copy(hero.curve.getPoint(rk)).setZ(0.003);
    // siège
    hq.scale.setScalar(1 + 0.08 * Math.sin((t - K.mapIn) * 6) * Math.exp(-Math.max(0, t - K.mapIn) * 2));
    const pulse = ((t - K.mapIn) * 1.2) % 1;
    hqRing.scale.setScalar(1 + pulse * 2.5);
    hqRing.material.opacity = (1 - pulse) * 0.8 * smooth(K.mapIn, K.mapIn + 0.3, t);
    const nl = Math.floor(clamp((t - K.mapIn - 1.0) / 0.018, 0, 40));
    hqLabel.glyphs.forEach((g, i) => (g.visible = i < nl));

    // mots
    const word = (tx, t0) => {
      tx.glyphs.forEach((g, i) => {
        const k = spring(t - t0 - i * 0.04, 2.8, 0.55);
        const b = g.userData.base;
        g.position.set(b.x, b.y - (1 - k) * capT * 1.3, 0);
        g.rotation.x = (1 - k) * 0.7;
      });
      tx.updateClip();
    };
    word(L1, K.cueillette - 0.05);
    word(L2, K.partout - 0.05);
    word(L3, K.au - 0.05);
    // tout s'efface quand on plonge dans la pastille
    const fade = 1 - smooth(15.35, 15.75, t);
    for (const tx of [L1, L2, L3]) tx.setOpacity(fade);
    for (const c of cities) if (c.label) c.label.setOpacity(fade);
    hqLabel.setOpacity(fade);

    const { p, l } = camPose(t);
    cam.position.copy(p);
    cam.lookAt(l);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return { scene, camera: cam, focus: cam.position.distanceTo(l), aperture: 0.02 };
  }

  function hqScreen() {
    const c = hqWorld();
    const e = map.localToWorld(HQ.clone().add(v3(fh * 0.016 * hq.scale.x, 0, 0)));
    const pc = c.clone().project(cam), pe = e.project(cam);
    return { x: pc.x * 0.5 + 0.5, y: pc.y * 0.5 + 0.5, r: Math.hypot((pe.x - pc.x) * 0.5 * W, (pe.y - pc.y) * 0.5 * H) };
  }
  return { update, scene, cam, hqScreen };
}
