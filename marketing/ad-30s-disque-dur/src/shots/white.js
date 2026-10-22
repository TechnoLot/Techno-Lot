// PLAN 2 (3,95 → 11,8 s) · L'espace blanc infini, puis le temps « ÉVALUATION GRATUITE ».
// Sortie de l'écran dans un blanc sans horizon : portable, tour, serveur 1U, écran et
// commutateur flottent en rotation. « TECHNO LOT » roule en « ON RACHÈTE », puis chaque
// appareil reçoit son étiquette (ligne verte qui se trace) au mot près. Rampe de
// vitesse vers le serveur : un laser vert le balaie et révèle « ÉVALUATION », puis la
// caméra plonge dans l'écran LCD de la façade (raccord avec le compteur).
import * as THREE from "three";
import * as MD from "../models.js";
import { Text, measure } from "../type.js";
import { C, PAPER } from "../palette.js";
import { camera, frameH, frameW, fatLine, disc, ring } from "../kit.js";
import { clamp, smooth, expoInOut, expoOut, spring, lerp, invLerp, hash, fbm1, cubicInOut, sineInOut } from "../ease.js";

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Balayage laser sur les matériaux du serveur (repère local de l'objet)
function laserize(mat, U) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLocalP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocalP = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLocalP;\nuniform float uLaser, uLaserOn;\nuniform vec3 uLaserCol;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float d = vLocalP.x - uLaser;
          float line = exp(-d * d / 0.000004) * 6.0 + exp(-d * d / 0.00012) * 0.8;
          // zone déjà analysée : fine trame verte
          vec2 g = abs(fract(vec2(vLocalP.z, vLocalP.y) * vec2(70.0, 140.0)) - 0.5);
          float grid = (1.0 - smoothstep(0.0, 0.06, min(g.x, g.y))) * step(d, 0.0) * 0.35;
          totalEmissiveRadiance += uLaserCol * (line + grid) * uLaserOn;
        }`
      );
  };
  mat.customProgramCacheKey = () => "laser";
  mat.needsUpdate = true;
}

export function whiteShot({ W, H, vertical: V, K, envBright }) {
  const scene = new THREE.Scene();
  scene.userData.clear = PAPER;
  scene.environment = envBright;
  scene.environmentIntensity = 0.85;

  // ---------------------------------------------------------------- lumière : grande source douce
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 0.5, far: 20 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(3, 2.5, -4);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbdbdb8, 0.7);
  scene.add(key, key.target, rim, hemi);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16, color: 0x000000 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------------------------------------------------------------- objets flottants
  const items = {
    laptop: MD.laptop(),
    tower: MD.towerModern(),
    server: MD.server1U(),
    monitor: MD.monitor(),
    switch: MD.switch1U(),
  };
  // centre de gravité de chaque objet ramené à son origine (rotation propre)
  const centers = { laptop: v3(0, 0.07, 0), tower: v3(0, 0.22, 0), server: v3(0, 0, 0), monitor: v3(0, 0.3, 0), switch: v3(0, 0, 0) };
  const L16 = {
    laptop: { p: v3(-0.7, 0.98, 0.3), r: 0.6, w: 0.32, tilt: 0.12 },
    monitor: { p: v3(-0.26, 1.12, -0.7), r: -0.3, w: -0.18, tilt: 0.05 },
    tower: { p: v3(0.44, 0.84, -0.36), r: -0.7, w: 0.22, tilt: 0.06 },
    server: { p: v3(0.0, 1.2, 0.42), r: 0.5, w: -0.26, tilt: 0.1 },
    switch: { p: v3(0.74, 1.3, 0.16), r: -0.4, w: 0.3, tilt: 0.14 },
  };
  const L916 = {
    monitor: { p: v3(0.12, 1.27, -0.6), r: -0.25, w: -0.18, tilt: 0.05 },
    laptop: { p: v3(-0.32, 1.0, 0.3), r: 0.6, w: 0.32, tilt: 0.12 },
    server: { p: v3(0.06, 0.78, 0.4), r: 0.5, w: -0.26, tilt: 0.1 },
    tower: { p: v3(0.36, 0.42, -0.35), r: -0.7, w: 0.22, tilt: 0.06 },
    switch: { p: v3(-0.24, 0.3, 0.2), r: -0.4, w: 0.3, tilt: 0.14 },
  };
  const LAY = V ? L916 : L16;
  const holders = {};
  for (const [k, o] of Object.entries(items)) {
    const h = new THREE.Group();
    o.position.copy(centers[k]).negate();
    h.add(o);
    scene.add(h);
    holders[k] = h;
  }
  const S = holders.server;
  const serverInfo = items.server.userData;

  // laser
  const laserU = { uLaser: { value: -1 }, uLaserOn: { value: 0 }, uLaserCol: { value: new THREE.Color().copy(C.green).multiplyScalar(1.4) } };
  laserize(serverInfo.steel, laserU);
  laserize(serverInfo.frontMat, laserU);
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.9),
    new THREE.ShaderMaterial({
      uniforms: { uCol: { value: C.green }, uA: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 uCol; uniform float uA; varying vec2 vUv; void main(){ float y = clamp(vUv.y, 0.0, 1.0); float a = y * sqrt(y) * (0.35 + 0.65 * smoothstep(0.0, 0.5, 1.0 - abs(vUv.x - 0.5) * 2.0)); gl_FragColor = vec4(uCol, a * uA); }",
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  sheet.rotation.y = Math.PI / 2;
  items.server.add(sheet);

  // « $ » vert sur l'écran LCD de la façade (raccord avec le compteur)
  const lcdDollar = new Text("black", "$", { size: 0.019, color: new THREE.Color().copy(C.green).multiplyScalar(1.3), align: "center", segs: 28 });
  lcdDollar.position.copy(serverInfo.lcd).add(v3(0, -lcdDollar.cap / 2, 0.0004));
  items.server.add(lcdDollar);

  // ---------------------------------------------------------------- caméra
  const cam = camera(W, H, V ? 46 : 30, 0.005, 80);
  const path = V
    ? [
        { t: K.whiteout, p: v3(-0.1, 1.35, 5.6), l: v3(0, 1.08, 0) },
        { t: 7.0, p: v3(0.12, 1.32, 4.3), l: v3(0, 1.08, -0.05) },
        { t: 9.55, p: v3(0.3, 1.25, 3.9), l: v3(0.02, 1.02, 0) },
      ]
    : [
        { t: K.whiteout, p: v3(-0.32, 1.26, 3.95), l: v3(0, 1.1, 0) },
        { t: 7.0, p: v3(0.1, 1.23, 2.75), l: v3(0, 1.08, -0.06) },
        { t: 9.55, p: v3(0.3, 1.24, 2.42), l: v3(0.04, 1.07, -0.04) },
      ];
  const catmull = (k, a, b, c) => {
    // quadratique lisse passant par a, b, c (k ∈ [0, 2])
    if (k <= 1) return a.clone().lerp(b, k);
    return b.clone().lerp(c, k - 1);
  };
  function wander(t) {
    const [A, B, Cc] = path;
    const k = t < B.t ? sineInOut(invLerp(A.t, B.t, t)) : 1 + sineInOut(invLerp(B.t, Cc.t, t));
    const p = catmull(k, A.p, B.p, Cc.p), l = catmull(k, A.l, B.l, Cc.l);
    p.x += fbm1(t * 0.4, 11) * 0.03;
    p.y += fbm1(t * 0.35, 12) * 0.02;
    return { p, l };
  }

  // pose des objets au temps t
  const SCAN_YAW = V ? 0.62 : 0.78;
  function placeItems(t) {
    for (const [k, h] of Object.entries(holders)) {
      const L = LAY[k];
      const ph = hash(k.length * 3.7) * 6.28;
      h.position.copy(L.p);
      h.position.y += Math.sin(t * 0.9 + ph) * 0.022;
      h.rotation.set(Math.sin(t * 0.5 + ph) * L.tilt * 0.5, L.r + L.w * (t - K.whiteout), Math.cos(t * 0.45 + ph) * L.tilt * 0.4);
    }
    // les autres objets s'écartent : le serveur reste seul pour l'analyse
    const away = expoInOut(invLerp(9.45, 10.25, t));
    for (const [k, h] of Object.entries(holders)) {
      if (k === "server") continue;
      const d = h.position.clone().sub(LAY.server.p).setY(0).normalize();
      h.position.addScaledVector(d, away * 3.2);
      h.position.y += away * (k === "switch" ? -1.8 : 0.6);
      h.visible = away < 0.995;
    }
    // le serveur se présente de trois quarts pour l'analyse
    const s = smooth(9.3, 10.15, t);
    const free = LAY.server.r + LAY.server.w * (t - K.whiteout);
    S.rotation.y = lerp(free, SCAN_YAW + 0.04 * Math.sin(t * 0.7), s);
    S.rotation.x = lerp(S.rotation.x, 0.05, s);
    S.rotation.z = lerp(S.rotation.z, 0, s);
    S.position.y = lerp(S.position.y, LAY.server.p.y, s);
    for (const h of Object.values(holders)) h.updateMatrixWorld(true);
  }
  const serverPose = (offset) => S.localToWorld(offset.clone());

  // ---------------------------------------------------------------- typographie géante
  const refT = 5.6;
  placeItems(refT);
  const wr = wander(refT);
  cam.position.copy(wr.p);
  cam.lookAt(wr.l);
  cam.updateMatrixWorld();
  const typeDist = wr.p.distanceTo(wr.l) + (V ? 2.4 : 2.6);
  const tw = frameW(cam, typeDist);
  const bigSize = V ? (0.84 * tw) / measure("black", "RACHÈTE") : (1.0 * tw) / measure("black", "ON RACHÈTE");
  const bigGroup = new THREE.Group();
  bigGroup.position.copy(cam.position).add(new THREE.Vector3(0, 0, -typeDist).applyQuaternion(cam.quaternion));
  bigGroup.quaternion.copy(cam.quaternion);
  // le titre passe au-dessus du groupe d'objets : seules ses lettres basses sont recouvertes
  bigGroup.position.add(new THREE.Vector3(0, frameH(cam, typeDist) * (V ? 0.215 : 0.17), 0).applyQuaternion(cam.quaternion));
  scene.add(bigGroup);
  const mk = (s, y) => {
    const tx = new Text("black", s, { size: bigSize, color: C.black, align: "center", segs: 14 });
    tx.position.y = y;
    bigGroup.add(tx);
    return tx;
  };
  const capB = new Text("black", "T", { size: bigSize }).cap;
  const lines = V
    ? { a: [mk("TECHNO", capB * 0.1), mk("LOT", -capB * 1.1)], b: [mk("ON", capB * 0.1), mk("RACHÈTE", -capB * 1.1)] }
    : { a: [mk("TECHNO LOT", -capB / 2)], b: [mk("ON RACHÈTE", -capB / 2)] };
  for (const tx of [...lines.a, ...lines.b]) tx.setClip(-capB * 0.14, capB * 1.42);

  function roll(tx, t, t0, mode, stagger = 0.04) {
    const cap = tx.cap;
    tx.glyphs.forEach((g, i) => {
      const b = g.userData.base, ti = t0 + i * stagger;
      let dy = 0, rx = 0;
      if (mode === "in") {
        const k = spring(t - ti, 2.7, 0.55);
        dy = -(1 - k) * cap * 1.3;
        rx = (1 - k) * 0.8;
      } else if (mode === "up") {
        const k = cubicInOut(invLerp(ti, ti + 0.17, t));
        dy = k * cap * 1.32;
        rx = -k * 0.9;
      } else if (mode === "down") {
        const k = cubicInOut(invLerp(ti, ti + 0.2, t));
        dy = -k * cap * 1.32;
        rx = k * 0.9;
      }
      g.position.set(b.x, b.y + dy, 0);
      g.rotation.x = rx;
    });
    tx.updateClip();
  }

  // ---------------------------------------------------------------- étiquettes
  const LBL = [
    { k: "laptop", t: K.portables, idx: "01", name: "PORTABLES", anchor: v3(0.1, 0.17, -0.06), side: 1 },
    // en vertical : tour vers le bas-gauche, écran vers la gauche, commutateur vers le bas (pas de croisement)
    { k: "tower", t: K.tours, idx: "02", name: "TOURS", anchor: V ? v3(-0.06, 0.3, 0.21) : v3(0.0, 0.43, 0.12), side: V ? -1 : 1, dy: V ? -0.075 : 0.05 },
    { k: "server", t: K.serveurs, idx: "03", name: "SERVEURS", anchor: v3(-0.12, 0.02, 0.2), side: V ? 1 : -1 },
    { k: "monitor", t: K.ecrans, idx: "04", name: "ÉCRANS", anchor: V ? v3(-0.22, 0.52, 0.0) : v3(0.22, 0.52, 0.0), side: V ? -1 : 1 },
    { k: "switch", t: K.ecrans + 0.14, idx: "05", name: "COMMUTATEURS", anchor: v3(V ? 0.12 : -0.12, 0.02, 0.06), side: V ? 1 : -1, dy: V ? -0.05 : 0.05 },
  ];
  const labels = LBL.map((d) => {
    const g = new THREE.Group();
    scene.add(g);
    const capH = V ? 0.023 : 0.03;
    const nm = new Text("monoBold", d.name, { size: capH / 0.73, color: C.black });
    const ix = new Text("mono", d.idx, { size: (capH * 0.8) / 0.73, color: new THREE.Color().copy(C.green) });
    // toujours « 01 NOM », posé au-dessus du segment horizontal (qui court sous le texte)
    const blockW = ix.width + 0.012 + nm.width;
    const dx = 0.05 * d.side, dy = d.dy ?? 0.05, run = (blockW + 0.012) * d.side;
    const line = fatLine([v3(0, 0, 0), v3(dx, dy, 0), v3(dx + run, dy, 0)], { color: new THREE.Color().copy(C.green), width: V ? 3.2 : 2.6, W, H });
    const left = d.side > 0 ? dx + 0.004 : dx - 0.004 - blockW;
    ix.position.set(left, dy + 0.012, 0);
    nm.position.set(left + ix.width + 0.012, dy + 0.012, 0);
    const dot = disc(0.0065, new THREE.Color().copy(C.green));
    const halo = ring(0.009, 0.0115, new THREE.Color().copy(C.green));
    g.add(line, nm, ix, dot, halo);
    // étiquettes toujours lisibles : dessinées par-dessus les objets
    g.traverse((o) => {
      if (o.material) {
        o.material.depthTest = false;
        o.material.depthWrite = false;
        o.renderOrder = 30;
      }
    });
    return { ...d, g, line, nm, ix, dot, halo };
  });

  // ---------------------------------------------------------------- temps 1 : « ÉVALUATION GRATUITE »
  const scanCam = (t) => {
    // vue de trois quarts serrée sur le serveur, lente orbite
    const k = invLerp(10.15, K.lcdZoom, t);
    const off = V ? v3(0.3 - 0.03 * k, 0.15 - 0.01 * k, 0.8 - 0.03 * k) : v3(0.5 - 0.035 * k, 0.16 - 0.01 * k, 0.66 - 0.03 * k);
    const look = V ? v3(0.0, -0.015, 0.1) : v3(-0.13, 0.0, 0.1);
    return { p: serverPose(off), l: serverPose(look) };
  };
  placeItems(10.6);
  const sc = scanCam(10.6);
  cam.position.copy(sc.p);
  cam.lookAt(sc.l);
  cam.updateMatrixWorld();
  const evalDist = sc.p.distanceTo(sc.l) * 0.72; // devant le serveur
  const ew = frameW(cam, evalDist), eh = frameH(cam, evalDist);
  const evalGroup = new THREE.Group();
  evalGroup.position.copy(cam.position).add(new THREE.Vector3(0, 0, -evalDist).applyQuaternion(cam.quaternion));
  evalGroup.quaternion.copy(cam.quaternion);
  scene.add(evalGroup);
  const evalSize = V ? (0.84 * ew) / measure("black", "ÉVALUATION") : (0.46 * ew) / measure("black", "ÉVALUATION");
  const ev1 = new Text("black", "ÉVALUATION", { size: evalSize, color: C.black });
  const ev2 = new Text("black", "GRATUITE", { size: evalSize, color: C.black });
  const capE = ev1.cap;
  const ex = V ? -0.42 * ew : -0.455 * ew;
  const ey = V ? 0.33 * eh : 0.13 * eh;
  ev1.position.set(ex, ey, 0);
  ev2.position.set(ex, ey - capE * 1.2, 0);
  ev1.setClip(-capE * 0.3, capE * 1.4);
  ev2.setClip(-capE * 0.14, capE * 1.14);
  const scanBar = new THREE.Mesh(new THREE.PlaneGeometry(capE * 0.035, capE * 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color().copy(C.green).multiplyScalar(1.6), transparent: true }));
  evalGroup.add(ev1, ev2, scanBar);
  // relevé monospace
  const hudSize = (V ? 0.021 : 0.024) * eh / 0.73;
  const HUD = ["ANALYSE ........ 100 %", "MODÈLE ..... 1U · 2 CPU", "ÉTAT .............. A"];
  const hud = HUD.map((s, i) => {
    const tx = new Text("mono", s, { size: hudSize, color: C.black });
    tx.position.set(V ? -0.42 * ew : -0.455 * ew, (V ? -0.36 : -0.27) * eh - i * hudSize * 1.25, 0);
    evalGroup.add(tx);
    return tx;
  });

  // ---------------------------------------------------------------- mise à jour
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const lcdW = new THREE.Vector3(), lcdN = new THREE.Vector3();
  function update(t) {
    placeItems(t);
    // lumière clé « surfacique » : direction légèrement différente à chaque sous-image
    const j = hash(t * 7919.13);
    key.position.set(-3 + (j - 0.5) * 0.9, 6 + (hash(t * 104.7) - 0.5) * 0.9, 4);
    key.target.position.set(0, 0, 0);

    // caméra
    let p, l;
    if (t < 9.55) ({ p, l } = wander(t));
    else if (t < 10.15) {
      const a = wander(9.55), b = scanCam(10.15);
      const k = expoInOut(invLerp(9.55, 10.15, t));
      p = a.p.lerp(b.p, k);
      l = a.l.lerp(b.l, k);
    } else if (t < K.lcdZoom) ({ p, l } = scanCam(t));
    else {
      const a = scanCam(K.lcdZoom);
      lcdW.copy(lcdDollar.position).add(v3(0, lcdDollar.cap / 2, 0));
      items.server.localToWorld(lcdW);
      lcdN.set(0, 0, 1).transformDirection(items.server.matrixWorld);
      const end = lcdW.clone().addScaledVector(lcdN, 0.016);
      const k = Math.pow(invLerp(K.lcdZoom, K.counterIn, t), 2.2);
      p = a.p.clone().lerp(end, k);
      l = a.l.clone().lerp(lcdW, smooth(K.lcdZoom, K.lcdZoom + 0.18, t));
    }
    cam.position.copy(p);
    cam.up.set(0, 1, 0);
    cam.lookAt(l);
    cam.fov = (V ? 46 : 30) - (t > K.lcdZoom ? 6 * smooth(K.lcdZoom, K.counterIn, t) : 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // typographie géante : TECHNO LOT → ON RACHÈTE → sortie
    const aIn = K.techno - 0.06, swap = K.on - 0.06, out = 6.92;
    for (const tx of lines.a) {
      tx.visible = t < swap + 0.7;
      if (tx.visible) roll(tx, t, t < swap ? aIn + (tx === lines.a[1] ? 0.12 : 0) : swap, t < swap ? "in" : "up");
    }
    for (const tx of lines.b) {
      tx.visible = t >= swap && t < out + 0.8;
      if (tx.visible) roll(tx, t, t < out ? swap + 0.1 + (tx === lines.b[1] ? 0.08 : 0) : out + (tx === lines.b[1] ? 0.06 : 0), t < out ? "in" : "down", 0.035);
    }

    // étiquettes, au mot près
    const hide = smooth(9.62, 9.78, t);
    for (const L of labels) {
      const anchor = items[L.k].localToWorld(L.anchor.clone());
      L.g.position.copy(anchor);
      L.g.quaternion.copy(cam.quaternion);
      const dist = anchor.clone().sub(cam.position).dot(new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion));
      L.g.scale.setScalar(frameH(cam, Math.max(0.05, dist)));
      const k = t - L.t;
      L.g.visible = k > 0 && hide < 1;
      if (!L.g.visible) continue;
      const pop = spring(k, 3.2, 0.5);
      L.dot.scale.setScalar(Math.max(0.001, pop));
      const hk = clamp(k / 0.5);
      L.halo.scale.setScalar(1 + hk * 2.2);
      L.halo.material.opacity = (1 - hk) * 0.8;
      L.line.setProgress(expoOut(invLerp(0.03, 0.32, k)));
      L.line.material.opacity = 1 - hide;
      const nChars = Math.floor(clamp((k - 0.12) / 0.018, 0, 99));
      L.nm.glyphs.forEach((gl, i) => (gl.visible = i < nChars - 2));
      L.ix.glyphs.forEach((gl, i) => (gl.visible = i < nChars));
      for (const tx of [L.nm, L.ix]) tx.setOpacity(1 - hide);
      L.dot.material.opacity = 1 - hide;
    }

    // laser et révélation de « ÉVALUATION »
    const s0 = K.evaluation - 0.12, s1 = K.evaluation + 0.62;
    const sk = sineInOut(invLerp(s0, s1, t));
    laserU.uLaser.value = lerp(-0.27, 0.27, sk);
    laserU.uLaserOn.value = smooth(s0 - 0.08, s0, t) * (1 - smooth(K.lcdZoom - 0.1, K.lcdZoom + 0.1, t) * 0.7);
    sheet.position.x = laserU.uLaser.value;
    sheet.material.uniforms.uA.value = 0.5 * smooth(s0 - 0.08, s0, t) * (1 - smooth(s1, s1 + 0.15, t));
    evalGroup.visible = t > 9.9 && t < K.counterIn;
    const x0 = ev1.position.x, x1 = x0 + ev1.width;
    const edge = lerp(x0 - capE * 0.1, x1 + capE * 0.1, sk);
    ev1.setClipX(-1e6, edge - x0);
    scanBar.position.set(edge, ev1.position.y + capE / 2, 0.001);
    scanBar.visible = sk > 0 && sk < 1;
    ev1.updateClip();
    // « GRATUITE » claque au mot
    const gk = spring(t - K.gratuite + 0.03, 3.4, 0.52);
    ev2.glyphs.forEach((g, i) => {
      const kk = spring(t - K.gratuite + 0.03 - i * 0.035, 3.4, 0.52);
      const b = g.userData.base;
      g.position.set(b.x, b.y - (1 - kk) * capE * 1.25, 0);
      g.rotation.x = (1 - kk) * 0.7;
    });
    void gk;
    ev2.updateClip();
    hud.forEach((tx, i) => {
      const n = Math.floor(clamp((t - (K.evaluation + 0.25 + i * 0.16)) / 0.016, 0, 99));
      tx.glyphs.forEach((g, gi) => (g.visible = gi < n));
    });
    // le relevé et les mots s'effacent quand on plonge dans l'écran
    const fade = 1 - smooth(K.lcdZoom, K.lcdZoom + 0.15, t);
    for (const tx of [ev1, ev2, ...hud]) tx.setOpacity(fade);

    const focusDist = t < 9.55 ? wander(t).p.distanceTo(wander(t).l) : cam.position.distanceTo(l);
    void qa;
    void qb;
    let aperture = 0.01, focus = focusDist;
    if (t > 9.9 && t <= K.lcdZoom) {
      // temps « évaluation » : netteté entre le titre (devant) et le serveur
      focus = cam.position.distanceTo(l) * 0.86;
      aperture = 0.0035;
    } else if (t > K.lcdZoom) aperture = 0.0012;
    return { scene, camera: cam, focus: Math.max(0.02, focus), aperture };
  }
  return { update, scene, cam };
}
