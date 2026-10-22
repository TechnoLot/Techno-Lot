// TEMPS 2 (11,78 → 13,66 s) · « OFFRE RAPIDE » : compteur géant à rouleaux.
// On sort du « $ » vert de l'écran LCD : la caméra recule, les rouleaux défilent
// (flou de bougé réel) et s'arrêtent net, un par un, avec un rebond. Puis le « $ »
// se rétracte en pastille verte : c'est d'elle que s'ouvre l'iris de la carte.
import * as THREE from "three";
import { Text, measure } from "../type.js";
import { C, NIGHT } from "../palette.js";
import { camera, frameW, disc } from "../kit.js";
import { clamp, smooth, expoOut, expoIn, spring, lerp, invLerp, quintOut, fbm1 } from "../ease.js";

export function counterShot({ W, H, vertical: V, K }) {
  const scene = new THREE.Scene();
  scene.userData.clear = NIGHT;
  const cam = camera(W, H, V ? 46 : 30, 0.01, 100);
  const D = 10; // distance de référence du plan du compteur

  // Montant affiché (format québécois : espace des milliers, « $ » après)
  const FINAL = "3 480 $";
  cam.position.set(0, 0, D);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  const fw = frameW(cam, D);
  const size = (V ? 0.9 : 0.74) * fw / measure("black", FINAL);
  const ref = new Text("black", FINAL, { size, align: "center" });
  const cap = ref.cap;
  const group = new THREE.Group();
  scene.add(group);
  const baseY = -cap * (V ? 0.42 : 0.36);
  // positions des caractères finaux (crénage compris)
  const slots = ref.glyphs.map((g) => ({ ch: g.userData.ch, x: g.userData.base.x }));
  const digits = "0123456789";
  const reels = [];
  const white = C.white;
  slots.forEach((s, i) => {
    if (!/[0-9]/.test(s.ch)) return;
    const reel = new THREE.Group();
    reel.position.set(s.x, baseY + cap / 2, 0);
    const glyphs = [...digits].map((d) => {
      const t = new Text("black", d, { size, color: white, align: "center", segs: 12 });
      t.position.y = -cap / 2; // ligne de base du compteur ; la fente reste fixe
      reel.add(t);
      t.setClip(-cap * 0.14, cap * 1.14);
      return t;
    });
    group.add(reel);
    reels.push({ reel, glyphs, target: Number(s.ch), i: reels.length });
  });
  const dollarSlot = slots[slots.length - 1];
  const dollar = new Text("black", "$", { size, color: new THREE.Color().copy(C.green).multiplyScalar(1.35), align: "center", segs: 28 });
  dollar.position.set(dollarSlot.x, baseY, 0);
  group.add(dollar);
  const dot = disc(cap * 0.16, new THREE.Color().copy(C.green).multiplyScalar(1.35), 64);
  dot.position.set(dollarSlot.x, baseY + cap / 2, 0.01);
  group.add(dot);

  // « OFFRE RAPIDE »
  const lblSize = size * 0.34;
  const offre = new Text("black", "OFFRE", { size: lblSize, color: white });
  const rapide = new Text("black", "RAPIDE", { size: lblSize, color: white });
  const lw = offre.width + measure("black", " ", lblSize) + rapide.width;
  const lx = V ? -lw / 2 : ref.glyphs[0].userData.base.x - ref.glyphs[0].userData.adv / 2;
  const ly = baseY + cap * 1.22;
  offre.position.set(lx, ly, 0);
  rapide.position.set(lx + offre.width + measure("black", " ", lblSize), ly, 0);
  const lcap = offre.cap;
  for (const t of [offre, rapide]) {
    t.setClip(-lcap * 0.14, lcap * 1.14);
    group.add(t);
  }
  // filet vert sous l'étiquette (se trace)
  const rule = new THREE.Mesh(new THREE.PlaneGeometry(1, cap * 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color().copy(C.green).multiplyScalar(1.2) }));
  group.add(rule);

  // position du « $ » à l'écran pour le raccord depuis le LCD
  const dollarCenter = new THREE.Vector3(dollarSlot.x, baseY + cap / 2, 0);

  function reelPos(r, t) {
    // défilement rapide, freinage exponentiel, arrêt net + rebond amorti
    const stop = K.rapide + 0.02 + r.i * 0.065;
    const start = K.counterIn - 0.1;
    const turns = 3 + r.i; // les rouleaux de droite tournent plus longtemps
    const total = turns * 10 + r.target;
    if (t <= stop) {
      const k = invLerp(start, stop, t);
      // vitesse d'abord constante puis freinage (ease-out marqué)
      const e = 1 - Math.pow(1 - k, 2.6);
      return total * e;
    }
    const dt = t - stop;
    const bounce = 0.16 * Math.exp(-dt * 13) * Math.sin(dt * 2 * Math.PI * 5.5);
    return total + bounce;
  }

  function update(t) {
    // rouleaux
    for (const r of reels) {
      const p = reelPos(r, t);
      r.glyphs.forEach((g, d) => {
        let rel = (((d - p) % 10) + 10) % 10; // 0..10
        if (rel > 5) rel -= 10;
        const gl = g.glyphs[0];
        gl.position.y = gl.userData.base.y - rel * cap * 1.24;
        g.visible = Math.abs(rel) < 1.2;
        g.updateClip();
      });
    }
    // étiquette mot à mot
    const word = (tx, t0) =>
      tx.glyphs.forEach((g, i) => {
        const k = spring(t - t0 - i * 0.035, 3.0, 0.55);
        const b = g.userData.base;
        g.position.set(b.x, b.y - (1 - k) * lcap * 1.3, 0);
        g.rotation.x = (1 - k) * 0.8;
      });
    word(offre, K.offre - 0.04);
    word(rapide, K.rapide - 0.04);
    offre.updateClip();
    rapide.updateClip();
    const rk = expoOut(invLerp(K.rapide + 0.1, K.rapide + 0.6, t));
    rule.scale.x = Math.max(1e-4, lw * rk);
    rule.position.set(lx + (lw * rk) / 2, ly - lcap * 0.32, 0);
    rule.visible = rk > 0.001;

    // le « $ » se rétracte en pastille (morphing), puis l'iris s'ouvre dessus
    const m = smooth(K.irisMap - 0.24, K.irisMap - 0.02, t);
    const ds = 1 - expoIn(m);
    dollar.scale.setScalar(Math.max(1e-3, ds));
    dollar.position.set(dollarSlot.x * (1 - ds) + dollarSlot.x * ds, baseY + (cap / 2) * (1 - ds), 0);
    dollar.visible = ds > 0.002;
    const dk = spring(t - (K.irisMap - 0.16), 3.2, 0.5);
    dot.scale.setScalar(Math.max(1e-3, dk));
    dot.visible = t > K.irisMap - 0.16;
    // les chiffres et l'étiquette s'effacent pendant le morphing
    const fade = 1 - smooth(K.irisMap - 0.3, K.irisMap - 0.05, t);
    for (const r of reels) for (const g of r.glyphs) g.setOpacity(fade);
    offre.setOpacity(fade);
    rapide.setOpacity(fade);
    rule.material.opacity = fade;
    rule.material.transparent = true;

    // caméra : collée au « $ » (raccord LCD), recul en ressort, lente poussée, recentrage
    const pull = spring(t - K.counterIn, 1.5, 0.82);
    const wide = new THREE.Vector3(fbm1(t * 0.5, 31) * 0.05, (baseY + ly + lcap) / 2 + fbm1(t * 0.45, 32) * 0.04, D - 0.6 * smooth(K.rapide - 0.1, K.irisMap, t));
    const close = new THREE.Vector3(dollarCenter.x, dollarCenter.y, cap * 1.9);
    const pos = close.clone().lerp(wide, clamp(pull, 0, 1.08));
    // centre du bloc (étiquette + montant)
    const blockC = new THREE.Vector3(0, (baseY + ly + lcap) / 2, 0);
    const look = dollarCenter.clone().lerp(blockC, clamp(pull, 0, 1.05));
    // recentrage sur le « $ » avant l'iris
    const rc = smooth(K.irisMap - 0.55, K.irisMap - 0.05, t);
    pos.lerp(new THREE.Vector3(dollarCenter.x, dollarCenter.y, D * 0.62), quintOut(rc));
    look.lerp(dollarCenter, quintOut(rc));
    cam.position.copy(pos);
    cam.lookAt(look);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return { scene, camera: cam, focus: cam.position.distanceTo(look), aperture: 0.02 };
  }

  // centre de la pastille à l'écran (pour l'iris)
  function dotScreen() {
    const c = dot.getWorldPosition(new THREE.Vector3());
    const e = c.clone().add(new THREE.Vector3(cap * 0.16 * dot.scale.x, 0, 0));
    const pc = c.project(cam), pe = e.project(cam);
    return { x: pc.x * 0.5 + 0.5, y: pc.y * 0.5 + 0.5, r: Math.abs(pe.x - pc.x) * 0.5 * W };
  }
  return { update, scene, cam, dotScreen };
}
