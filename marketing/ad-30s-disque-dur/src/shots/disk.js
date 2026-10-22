// PLAN SIGNATURE (15,86 → 24,8 s) · le disque, la destruction, le paiement.
// Macro sur le plateau qui tourne au ralenti ; des fichiers lumineux s'en échappent,
// se pixelisent et se dissolvent en particules vertes. Vue éclatée, puis compression
// sèche en cube noir (le drop). « VOS DONNÉES. DÉTRUITES. GRATUITEMENT. » Le cube
// pivote et devient une notification de paiement : crochet vert, ondes, éclair blanc.
import * as THREE from "three";
import * as MD from "../models.js";
import { Text, measure } from "../type.js";
import { C, NIGHT, PAPER } from "../palette.js";
import { camera, frameW, frameH, disc, ring, strokePath } from "../kit.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { clamp, smooth, expoOut, expoIn, expoInOut, spring, lerp, invLerp, hash, fbm1, cubicInOut, quintOut, sineInOut, noise1 } from "../ease.js";

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const HALF = Math.PI / 2;

export function diskShot({ W, H, vertical: V, K, envDark, envBright, logoTex }) {
  const scene = new THREE.Scene();
  scene.userData.clear = NIGHT;
  scene.environment = envDark;
  scene.environmentIntensity = 0.45;
  const cam = camera(W, H, V ? 46 : 30, 0.002, 20);

  // ---------------------------------------------------------------- lumière rasante
  const key = new THREE.SpotLight(0xffffff, 0.32, 3, 0.5, 0.6, 2);
  key.position.set(-0.32, 0.09, 0.18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00008;
  key.shadow.camera.near = 0.05;
  const rim = new THREE.SpotLight(0xffffff, 0.3, 3, 0.6, 0.8, 2);
  rim.position.set(0.25, 0.22, -0.3);
  const top = new THREE.DirectionalLight(0xffffff, 0.12);
  top.position.set(0.1, 1, 0.2);
  // éclairage du cube (allumé après l'impact) : liseré dur + bande haute
  const cubeRim = new THREE.SpotLight(0xffffff, 0, 2, 0.7, 0.5, 2);
  cubeRim.position.set(0.18, 0.16, -0.22);
  const cubeKey = new THREE.SpotLight(0xffffff, 0, 2, 0.8, 0.7, 2);
  cubeKey.position.set(-0.25, 0.22, 0.25);
  scene.add(key, key.target, rim, rim.target, top, cubeRim, cubeRim.target, cubeKey, cubeKey.target);

  // ---------------------------------------------------------------- disque dur
  const drive = MD.hdd();
  const P = drive.userData.parts;
  drive.position.set(0, -0.0175, 0.022); // centre du plateau en (0, 0, 0)
  scene.add(drive);
  const platterTop = P.platters[1].position.y + 0.00127 - 0.0175;
  const ARM_REST = 2.034 - 0.33;

  // ---------------------------------------------------------------- fichiers lumineux
  const FILES = [
    { name: "Clients.xlsx", ang: 0.6, r: 0.03, d: 0.0 },
    { name: "Paie_2024.pdf", ang: 2.2, r: 0.034, d: 0.12 },
    { name: "Courriels", ang: 3.9, r: 0.028, d: 0.24 },
  ];
  const cardW = V ? 0.019 : 0.027, cardH = V ? 0.0076 : 0.0108;
  const COLS = 15, ROWS = 9;
  const files = FILES.map((f, i) => {
    const g = new THREE.Group();
    const panel = new THREE.Mesh(
      new RoundedBoxGeometry(cardW, cardH, 0.0006, 2, 0.0014),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().copy(C.white).multiplyScalar(1.15), transparent: true })
    );
    g.add(panel);
    // icône de document (coin plié) en vert + nom en monospace
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(cardH * 0.36, cardH * 0.46), new THREE.MeshBasicMaterial({ color: new THREE.Color().copy(C.green), transparent: true }));
    icon.position.set(-cardW / 2 + cardH * 0.36, cardH * 0.08, 0.0004);
    g.add(icon);
    const label = new Text("monoBold", f.name, { size: (cardH * 0.16) / 0.73, color: C.black });
    label.position.set(-cardW / 2 + cardH * 0.64, cardH * 0.02, 0.0004);
    const sub = new Text("mono", ["48 Ko", "1,2 Mo", "3 214 messages"][i], { size: (cardH * 0.12) / 0.73, color: C.grey });
    sub.position.set(-cardW / 2 + cardH * 0.64, -cardH * 0.25, 0.0004);
    g.add(label, sub);
    // pixels (instanciés) : remplacent la carte au moment de la dissolution
    const px = new THREE.InstancedMesh(new THREE.PlaneGeometry(cardW / COLS, cardH / ROWS), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), COLS * ROWS);
    px.frustumCulled = false;
    g.add(px);
    scene.add(g);
    return { ...f, i, g, panel, icon, label, sub, px };
  });
  const pxM = new THREE.Matrix4(), pxQ = new THREE.Quaternion(), pxS = new THREE.Vector3(), pxP = new THREE.Vector3(), pxC = new THREE.Color();

  // ---------------------------------------------------------------- cube, éclats, onde
  const CUBE = 0.085;
  const cube = MD.blackCube(CUBE);
  cube.visible = false;
  scene.add(cube);
  const shards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.0035), new THREE.MeshPhysicalMaterial({ color: "#1a1a1a", metalness: 0.9, roughness: 0.3 }), 90);
  const sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0012, 0.0012, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color().copy(C.green).multiplyScalar(2.2) }), 40);
  shards.frustumCulled = sparks.frustumCulled = false;
  scene.add(shards, sparks);
  const shock = ring(0.04, 0.0412, new THREE.Color(1.1, 1.1, 1.1), 96);
  shock.rotation.x = -HALF;
  scene.add(shock);

  // ---------------------------------------------------------------- typographie (destruction)
  const camAfter = V ? { p: v3(0, 0.085, 0.4), l: v3(0, 0.04, 0) } : { p: v3(-0.085, 0.05, 0.34), l: v3(-0.085, 0.006, 0) };
  cam.position.copy(camAfter.p);
  cam.lookAt(camAfter.l);
  cam.updateMatrixWorld();
  const dT = camAfter.p.distanceTo(camAfter.l) * 0.82;
  const fw = frameW(cam, dT), fh = frameH(cam, dT);
  const dg = new THREE.Group();
  dg.position.copy(cam.position).add(new THREE.Vector3(0, 0, -dT).applyQuaternion(cam.quaternion));
  dg.quaternion.copy(cam.quaternion);
  scene.add(dg);
  const tSize = V ? (0.86 * fw) / measure("black", "GRATUITEMENT.") : (0.56 * fw) / measure("black", "GRATUITEMENT.");
  const lines = ["VOS DONNÉES.", "DÉTRUITES.", "GRATUITEMENT."].map((s, i) => {
    const t = new Text("black", s, { size: tSize, color: i === 2 ? new THREE.Color().copy(C.green).multiplyScalar(1.25) : C.white, segs: 14 });
    dg.add(t);
    return t;
  });
  const capD = lines[0].cap;
  const tx0 = V ? -0.41 * fw : -0.46 * fw;
  const ty0 = V ? 0.3 * fh : 0.2 * fh;
  lines.forEach((t, i) => {
    t.position.set(tx0, ty0 - i * capD * 1.32, 0);
    t.setClip(-capD * 0.16, capD * 1.42);
  });
  const MENTION = "Effacement sécurisé · Confidentialité garantie";
  // en vertical, la mention tient dans la largeur (elle débordait)
  const monoSize = V ? (0.84 * fw) / measure("mono", MENTION) : (0.027 * fh) / 0.73;
  const mention = new Text("mono", MENTION, { size: monoSize, color: C.white });
  mention.position.set(tx0, ty0 - 2 * capD * 1.32 - capD * 0.8, 0);
  if (V) mention.position.set(tx0, ty0 - 2 * capD * 1.32 - capD * 0.9, 0);
  dg.add(mention);
  const times = [K.onLes + 0.02, K.detruit, K.gratuitement];

  // ---------------------------------------------------------------- notification de paiement
  const cardWW = V ? 0.82 * fw : 0.47 * fw;
  const cardHH = cardWW * 0.36;
  const card = new THREE.Mesh(new RoundedBoxGeometry(cardWW, cardHH, cardHH * 0.08, 6, cardHH * 0.17), new THREE.MeshPhysicalMaterial({ color: "#050505", metalness: 0.1, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 0.22 }));
  card.visible = false;
  scene.add(card);
  const face = new THREE.Group();
  face.position.z = cardHH * 0.041;
  card.add(face);
  const pad = cardHH * 0.17;
  const icon = new THREE.Mesh(new THREE.PlaneGeometry(cardHH * 0.2, cardHH * 0.2), new THREE.MeshBasicMaterial({ map: logoTex.icon, transparent: true, color: new THREE.Color(1.3, 1.3, 1.3) }));
  icon.position.set(-cardWW / 2 + pad + cardHH * 0.1, cardHH / 2 - pad - cardHH * 0.08, 0);
  const brand = new Text("monoBold", "TECHNO LOT", { size: (cardHH * 0.085) / 0.73, color: C.white });
  brand.position.set(icon.position.x + cardHH * 0.17, icon.position.y - cardHH * 0.04, 0);
  const when = new Text("mono", "maintenant", { size: (cardHH * 0.075) / 0.73, color: C.grey, align: "right" });
  when.position.set(cardWW / 2 - pad, brand.position.y, 0);
  const title = new Text("bold", "Paiement reçu", { size: (cardHH * 0.16) / 0.7, color: C.white });
  title.position.set(-cardWW / 2 + pad, -cardHH * 0.07, 0);
  const amount = new Text("black", "3 480,00 $", { size: (cardHH * 0.2) / 0.7, color: C.white });
  amount.position.set(-cardWW / 2 + pad, -cardHH / 2 + pad * 0.8, 0);
  const checkC = v3(cardWW / 2 - pad - cardHH * 0.2, -cardHH * 0.1, 0.0002);
  const checkRing = ring(cardHH * 0.17, cardHH * 0.2, new THREE.Color().copy(C.green).multiplyScalar(1.3), 96);
  checkRing.position.copy(checkC);
  const cs = cardHH * 0.17;
  const check = strokePath([v3(-0.5, 0.0, 0), v3(-0.14, -0.38, 0), v3(0.55, 0.36, 0)].map((p) => p.multiplyScalar(cs).add(checkC)), cardHH * 0.045, new THREE.Color().copy(C.green).multiplyScalar(1.5));
  face.add(icon, brand, when, title, amount, checkRing, check);
  face.traverse((o) => {
    if (o.material) {
      o.material.depthTest = false;
      o.renderOrder = 6;
    }
  });
  // ondes
  const waves = [0, 1, 2].map(() => {
    const r = ring(1, 1.012, new THREE.Color().copy(C.green), 128);
    r.renderOrder = 5; // testées en profondeur : passent derrière « PAIEMENT… »
    scene.add(r);
    return r;
  });
  // fond qui passe au blanc (iris depuis la carte)
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: { uR: { value: 0 }, uC: { value: new THREE.Vector2() } },
      vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform float uR; uniform vec2 uC; varying vec2 vP; void main(){ float d = length(vP - uC); float a = 1.0 - smoothstep(uR - 0.004, uR + 0.004, d); gl_FragColor = vec4(1.0, 1.0, 1.0, a); }",
      transparent: true, depthWrite: false,
    })
  );
  scene.add(backdrop);

  // « PAIEMENT / RAPIDE ET / GARANTI. » (noir sur blanc)
  const camPay = V ? { p: v3(0, 0.0, 0.42), l: v3(0, 0.0, 0) } : { p: v3(-0.09, 0.0, 0.36), l: v3(-0.09, 0.0, 0) };
  cam.position.copy(camPay.p);
  cam.lookAt(camPay.l);
  cam.updateMatrixWorld();
  const dP = camPay.p.distanceTo(camPay.l) * 0.85;
  const pw = frameW(cam, dP), ph = frameH(cam, dP);
  const pg = new THREE.Group();
  pg.position.copy(cam.position).add(new THREE.Vector3(0, 0, -dP).applyQuaternion(cam.quaternion));
  pg.quaternion.copy(cam.quaternion);
  scene.add(pg);
  const pSize = V ? (0.8 * pw) / measure("black", "RAPIDE ET") : (0.42 * pw) / measure("black", "RAPIDE ET");
  const payLines = ["PAIEMENT", "RAPIDE ET", "GARANTI."].map((s) => {
    const t = new Text("black", s, { size: pSize, color: C.black });
    pg.add(t);
    return t;
  });
  const capP = payLines[0].cap;
  const px0 = V ? -0.4 * pw : -0.44 * pw, py0 = V ? 0.29 * ph : 0.22 * ph;
  payLines.forEach((t, i) => {
    t.position.set(px0, py0 - i * capP * 1.16, 0);
    t.setClip(-capP * 0.14, capP * 1.42);
  });
  const payTimes = [K.paiement - 0.03, K.rapide2 - 0.03, K.garanti - 0.03];
  // position finale de la carte (repère monde)
  const cardPos = V ? v3(0, -0.2 * ph, 0) : v3(-0.09 + 0.235 * pw, -0.03 * ph, 0);

  // ---------------------------------------------------------------- repères (rapides)
  const T0 = K.irisDisk; // vue de dessus (iris depuis le siège)
  const T1 = K.diskIn; // bascule vers l'angle rasant
  const TG = K.donnees; // « Et vos données? » : les fichiers sortent
  const TW0 = K.crush - 0.13, TW1 = K.crush + 0.1; // recul éclair sur tout le disque
  const TX0 = K.crush, TX1 = K.impact - 0.19; // éclatement, puis écrasement sec
  const TC = K.pivot + 0.48; // le cube devient la carte

  // ---------------------------------------------------------------- caméra
  const camMacroTop = { p: v3(0.0, 0.085, 0.0001), l: v3(0, 0, 0) };
  const camGraze = (t) => {
    const a = 0.9 + 0.12 * (t - T1);
    return { p: v3(Math.cos(a) * 0.088, platterTop + 0.026 - 0.006 * smooth(T1, TW0, t), Math.sin(a) * 0.088), l: v3(Math.cos(a) * 0.004, platterTop + 0.004, Math.sin(a) * 0.004) };
  };
  const camWide = (t) => {
    const a = 0.75 + 0.18 * (t - TW0);
    return { p: v3(Math.cos(a) * 0.34, 0.21 + 0.02 * (t - TW0), Math.sin(a) * 0.34), l: v3(0, 0.026, 0) };
  };
  // vertical : cadre étroit, les fichiers se rangent en cascade au centre de l'image.
  // Positions tirées de la vue rasante (écran normalisé x, y et distance à la caméra).
  let endsV = null;
  function verticalEnds() {
    const g = camGraze(K.donnees + 0.35);
    const c = cam.clone();
    c.position.copy(g.p);
    c.up.set(0, 1, 0);
    c.lookAt(g.l);
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    return [[-0.12, 0.1, 0.074], [0.12, 0.36, 0.081], [-0.06, 0.6, 0.088]].map(([nx, ny, d]) => {
      const dir = new THREE.Vector3(nx, ny, 0.5).unproject(c).sub(c.position).normalize();
      return c.position.clone().addScaledVector(dir, d);
    });
  }
  function camPose(t) {
    let p, l;
    if (t < T1) {
      // descente verticale sur le moyeu (raccord iris)
      const k = expoOut(invLerp(T0 - 0.05, T1 + 0.15, t));
      p = camMacroTop.p.clone().setY(lerp(0.11, 0.075, k));
      l = camMacroTop.l.clone();
      cam.up.set(0, 0, -1);
    } else if (t < TW0) {
      // la caméra bascule de la vue de dessus à un angle rasant
      const k = cubicInOut(invLerp(T1, T1 + 0.3, t));
      const g = camGraze(t);
      p = camMacroTop.p.clone().setY(0.075).lerp(g.p, k);
      l = camMacroTop.l.clone().lerp(g.l, k);
      cam.up.set(0, 0, -1).lerp(v3(0, 1, 0), smooth(T1, T1 + 0.25, t)).normalize();
    } else if (t < K.impact + 0.02) {
      const k = expoInOut(invLerp(TW0, TW1, t));
      const g = camGraze(TW0), w = camWide(t);
      p = g.p.lerp(w.p, k);
      l = g.l.lerp(w.l, k);
      // compression : la caméra s'approche juste avant l'impact
      const c = expoIn(invLerp(TX1, K.impact, t));
      const a = camAfter;
      p.lerp(a.p.clone().multiplyScalar(0.92), c);
      l.lerp(a.l, c);
      cam.up.set(0, 1, 0);
    } else if (t < K.pivot) {
      const k = expoOut(invLerp(K.impact, K.impact + 0.6, t));
      p = camAfter.p.clone().multiplyScalar(lerp(0.92, 1.0, k));
      p.z += 0.01 * (t - K.impact);
      l = camAfter.l.clone();
      cam.up.set(0, 1, 0);
    } else {
      const k = cubicInOut(invLerp(K.pivot, K.pivot + 0.6, t));
      p = camAfter.p.clone().add(v3(0, 0, 0.01 * (K.pivot - K.impact))).lerp(camPay.p, k);
      l = camAfter.l.clone().lerp(camPay.l, k);
      p.z -= 0.006 * smooth(K.white2 + 0.25, K.flash, t);
      cam.up.set(0, 1, 0);
    }
    // secousse d'impact (bruit amorti) + micro-secousses sur les mots
    let shake = 0.0035 * Math.exp(-(t - K.impact) * 7) * (t > K.impact ? 1 : 0);
    for (const tt of times) shake += 0.0012 * Math.exp(-(t - tt) * 12) * (t > tt ? 1 : 0);
    p.x += noise1(t * 60, 3) * shake;
    p.y += noise1(t * 60, 4) * shake;
    return { p, l };
  }

  // ---------------------------------------------------------------- mise à jour
  function update(t) {
    const exploded = expoOut(invLerp(TX0, TX1, t));
    const crush = expoIn(invLerp(TX1, K.impact, t));
    const spin = t * 2.1 * Math.PI * (1 - 0.5 * smooth(T0, T1 + 0.3, t)); // ralenti
    drive.visible = t < K.impact;
    for (const pl of P.platters) pl.rotation.y = spin;
    P.clamp.rotation.y = spin;
    P.arm.rotation.y = ARM_REST + 0.06 * Math.sin(t * 2.3) + 0.12 * smooth(TG - 0.1, TG + 0.3, t) * Math.sin(t * 9) * (1 - smooth(TG + 0.4, TW0, t));
    // vue éclatée : décalages (repère du disque)
    const EX = {
      cover: v3(0, 0.07, 0), magnet: v3(0.01, 0.05, 0.01), clamp: v3(0, 0.04, 0), spacer: v3(0, 0.026, 0),
      arm: v3(0.025, 0.012, 0.012), pcb: v3(0, -0.035, 0), base: v3(0, 0, 0),
    };
    const center = v3(0, 0.0175, -0.022);
    const setPart = (o, off) => {
      const home = o.userData.home;
      const e = home.clone().add(off.clone().multiplyScalar(exploded));
      o.position.copy(e.lerp(center, crush));
      o.scale.setScalar(lerp(1, 0.25, crush));
    };
    for (const [k, off] of Object.entries(EX)) setPart(P[k], off);
    // le capot n'est pas là pendant la macro : il descend du ciel pour la vue éclatée
    P.cover.position.y += 0.25 * Math.pow(1 - exploded, 2) * (1 - crush);
    P.magnet.position.y += 0.12 * Math.pow(1 - exploded, 2) * (1 - crush) * (t < TX0 ? 0 : 1);
    P.platters.forEach((pl, i) => setPart(pl, v3(0, 0.012 + i * 0.012, 0)));
    drive.rotation.y = 0.5 * exploded + 0.15 * (t - TX0) * (t > TX0 ? 1 : 0);
    drive.rotation.x = 0.12 * exploded;

    // fichiers : montent du plateau, font face, puis se pixelisent
    for (const f of files) {
      const t0 = TG + f.d * 0.5, tP = TG + 0.38 + f.d * 0.4;
      const rise = expoOut(invLerp(t0, t0 + 0.55, t));
      f.g.visible = t > t0 && t < tP + 0.6;
      if (!f.g.visible) continue;
      const a = f.ang + spin * 0.0; // part d'un secteur du plateau
      const start = v3(Math.cos(a) * f.r, platterTop + 0.0008, Math.sin(a) * f.r);
      const rr = f.r * 0.75;
      const end = V ? (endsV ||= verticalEnds())[f.i].clone() : v3(Math.cos(a) * rr, platterTop + 0.011 + 0.003 * f.i, Math.sin(a) * rr);
      f.g.position.copy(start.lerp(end, rise));
      f.g.position.y += 0.0015 * Math.sin(t * 3 + f.i);
      // couché sur le plateau → face caméra
      const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-HALF, 0, a));
      f.g.quaternion.copy(qFlat).slerp(cam.quaternion, quintOut(invLerp(t0 + 0.03, t0 + 0.45, t)));
      const pk = invLerp(tP, tP + 0.45, t);
      const show = pk <= 0;
      f.panel.visible = f.icon.visible = f.label.visible = f.sub.visible = show;
      f.panel.material.opacity = smooth(t0, t0 + 0.15, t);
      f.px.visible = pk > 0;
      if (pk > 0) {
        let n = 0;
        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++) {
            const h1 = hash(f.i * 999 + n * 1.37), h2 = hash(f.i * 777 + n * 2.71), h3 = hash(n * 5.3 + f.i);
            const delay = (c / COLS) * 0.35 + h1 * 0.15; // vague de gauche à droite
            const k = clamp((pk - delay) / 0.55);
            const e = expoOut(k);
            pxP.set(-cardW / 2 + (c + 0.5) * (cardW / COLS) + (h2 - 0.5) * 0.02 * e, -cardH / 2 + (r + 0.5) * (cardH / ROWS) + (0.004 + h3 * 0.02) * e, (h1 - 0.5) * 0.01 * e);
            const sc = lerp(1, 0.25, e) * (1 - smooth(0.7, 1.0, k));
            pxS.setScalar(Math.max(1e-4, sc));
            pxQ.identity();
            pxM.compose(pxP, pxQ, pxS);
            f.px.setMatrixAt(n, pxM);
            pxC.copy(C.white).multiplyScalar(1.15).lerp(new THREE.Color().copy(C.green).multiplyScalar(2.0), smooth(0.05, 0.35, k));
            f.px.setColorAt(n, pxC);
            n++;
          }
        f.px.instanceMatrix.needsUpdate = true;
        f.px.instanceColor.needsUpdate = true;
      }
    }

    // cube : apparaît à l'écrasement, pivote ensuite et devient la carte
    const ck = spring(t - (K.impact - 0.06), 4.0, 0.42);
    cube.visible = t > K.impact - 0.06 && t < TC;
    const cubeSpin = 0.62 + 0.16 * Math.max(0, t - K.impact);
    const pv = spring(t - K.pivot, 1.9, 0.72);
    const morph = cubicInOut(invLerp(K.pivot + 0.12, TC, t));
    // après le quart de tour, la face visible est la face −X locale : épaisseur en X, largeur en Z
    cube.scale.set(lerp(1, 0.08, morph), lerp(1, cardHH / CUBE, morph), lerp(1, cardWW / CUBE, morph)).multiplyScalar(Math.max(1e-3, clamp(ck, 0, 1.2)));
    cube.rotation.set(lerp(0.36, 0, clamp(pv)), lerp(cubeSpin, HALF, clamp(pv)), 0);
    cube.position.copy(v3(0, 0.0, 0).lerp(cardPos, morph));
    card.visible = t >= TC;
    card.position.copy(cardPos);
    card.rotation.set(0, 0.04 * Math.sin((t - TC) * 1.3), 0);
    card.scale.setScalar(1 + 0.03 * smooth(TC, K.flash, t));

    // éclats et étincelles (balistique, amortie)
    const dt = t - K.impact;
    shards.visible = sparks.visible = dt > 0 && dt < 1.4;
    if (shards.visible) {
      for (let i = 0; i < 90; i++) {
        const th = hash(i * 3.1) * Math.PI * 2, ph = (hash(i * 7.7) - 0.3) * 1.2, sp = 0.18 + 0.35 * hash(i * 1.9);
        const dir = v3(Math.cos(th) * Math.cos(ph), Math.sin(ph) + 0.25, Math.sin(th) * Math.cos(ph));
        const dist = (sp * (1 - Math.exp(-dt * 4))) / 4;
        pxP.copy(dir).multiplyScalar(0.04 + dist);
        pxP.y -= 0.06 * dt * dt;
        pxQ.setFromEuler(new THREE.Euler(dt * 9 * hash(i), dt * 7 * hash(i + 3), 0));
        pxS.setScalar((1 - smooth(0.6, 1.4, dt)) * (0.5 + hash(i * 4.4)));
        pxM.compose(pxP, pxQ, pxS);
        shards.setMatrixAt(i, pxM);
      }
      for (let i = 0; i < 40; i++) {
        const th = hash(i * 5.3) * Math.PI * 2, ph = (hash(i * 2.2) - 0.2) * 1.0, sp = 0.4 + 0.5 * hash(i * 9.1);
        const dir = v3(Math.cos(th) * Math.cos(ph), Math.sin(ph) + 0.3, Math.sin(th) * Math.cos(ph)).normalize();
        const dist = (sp * (1 - Math.exp(-dt * 5))) / 5;
        pxP.copy(dir).multiplyScalar(0.045 + dist);
        pxQ.setFromUnitVectors(v3(0, 0, 1), dir);
        pxS.set(1, 1, 1 + 3 * Math.exp(-dt * 6)).multiplyScalar(1 - smooth(0.2, 0.7, dt));
        pxM.compose(pxP, pxQ, pxS);
        sparks.setMatrixAt(i, pxM);
      }
      shards.instanceMatrix.needsUpdate = true;
      sparks.instanceMatrix.needsUpdate = true;
    }
    shock.visible = dt > 0 && dt < 0.6;
    shock.position.set(0, -CUBE / 2, 0);
    shock.scale.setScalar(1 + expoOut(clamp(dt / 0.6)) * 5);
    shock.material.opacity = (1 - clamp(dt / 0.6)) * 0.45;

    // typographie de la destruction
    lines.forEach((tx, i) => {
      const t0 = times[i];
      const k = spring(t - t0, 3.6, 0.48);
      const out = cubicInOut(invLerp(K.pivot - 0.2 + i * 0.05, K.pivot + 0.02 + i * 0.05, t));
      tx.visible = t > t0 - 0.02 && out < 1;
      tx.glyphs.forEach((g, gi) => {
        const b = g.userData.base;
        const kk = spring(t - t0 - gi * 0.012, 3.6, 0.48);
        g.position.set(b.x, b.y + (1 - kk) * -capD * 1.25 + out * capD * 1.35, 0);
        g.rotation.x = (1 - kk) * 0.6 - out * 0.8;
      });
      tx.scale.setScalar(1 + 0.18 * (1 - clamp(k)));
      tx.updateClip();
    });
    const mk = Math.floor(clamp((t - K.securisee) / 0.014, 0, 99));
    mention.glyphs.forEach((g, i) => (g.visible = i < mk));
    mention.setOpacity(1 - smooth(K.pivot - 0.25, K.pivot - 0.05, t));

    // fond blanc (iris depuis la carte), environnement clair
    const wk = expoIn(invLerp(K.white2 - 0.05, K.white2 + 0.3, t));
    scene.environment = t > K.white2 ? envBright : envDark;
    scene.environmentIntensity = t > K.white2 ? 0.9 : t > K.impact - 0.1 ? 0.75 : lerp(0.1, 0.45, smooth(T0, T1 + 0.4, t));
    cubeRim.intensity = t > K.impact - 0.1 && t < K.white2 ? 0.9 : 0;
    cubeKey.intensity = t > K.impact - 0.1 && t < K.white2 ? 0.35 : 0;
    const cPos = card.visible ? card.position : cube.position;
    backdrop.visible = wk > 0;
    backdrop.position.copy(cPos).add(v3(0, 0, -0.15));
    backdrop.scale.setScalar(3);
    backdrop.material.uniforms.uC.value.set(0, 0);
    backdrop.material.uniforms.uR.value = wk * 1.6;

    // contenu de la carte
    const ci = (t0) => smooth(t0, t0 + 0.2, t);
    icon.material.opacity = ci(K.white2 + 0.12);
    brand.setOpacity(ci(K.white2 + 0.16));
    when.setOpacity(ci(K.white2 + 0.22));
    title.setOpacity(ci(K.white2 + 0.27));
    amount.setOpacity(ci(K.white2 + 0.37));
    const ringK = spring(t - (K.check - 0.1), 3.0, 0.5);
    checkRing.scale.setScalar(Math.max(1e-3, ringK));
    checkRing.visible = t > K.check - 0.1;
    check.setProgress(expoOut(invLerp(K.check, K.check + 0.22, t)));
    // ondes depuis le crochet
    const cw = card.localToWorld(face.position.clone().add(checkC));
    waves.forEach((w, i) => {
      const wt = t - (K.check + 0.08 + i * 0.16);
      w.visible = wt > 0 && wt < 1.1 && card.visible;
      w.position.copy(cw).add(v3(0, 0, -0.002));
      w.quaternion.copy(card.quaternion);
      w.scale.setScalar(cardHH * 0.2 + expoOut(clamp(wt / 1.1)) * cardWW * 1.4);
      w.material.opacity = (1 - clamp(wt / 1.1)) * 0.9;
    });
    // « PAIEMENT / RAPIDE ET / GARANTI. »
    payLines.forEach((tx, i) => {
      tx.visible = t > payTimes[i] - 0.02;
      tx.glyphs.forEach((g, gi) => {
        const b = g.userData.base;
        const kk = spring(t - payTimes[i] - gi * 0.03, 3.0, 0.55);
        g.position.set(b.x, b.y - (1 - kk) * capP * 1.3, 0);
        g.rotation.x = (1 - kk) * 0.7;
      });
      tx.updateClip();
    });

    const { p, l } = camPose(t);
    cam.position.copy(p);
    cam.lookAt(l);
    cam.fov = V ? 46 : 30;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    // mise au point
    let focus = cam.position.distanceTo(l), aperture = 0.0016;
    if (t < T1) aperture = 0.0003;
    else if (t < TW0) {
      focus = cam.position.distanceTo(v3(0, platterTop, 0)) * 0.8;
      aperture = 0.00055;
    } else if (t < K.impact) aperture = 0.0018;
    else if (t < K.pivot) {
      focus = dT;
      aperture = 0.004;
    } else {
      focus = cam.position.distanceTo(card.visible ? card.position : cube.position);
      aperture = 0.003;
    }
    return { scene, camera: cam, focus, aperture };
  }
  return { update, scene, cam };
}
