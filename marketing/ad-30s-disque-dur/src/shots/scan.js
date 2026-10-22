// TEMPS 1 (10,6 → 13,15 s) · « ÉVALUATION GRATUITE » · noir.
// Le registre du lot, vu de trois quarts : un laser vert le balaie, chaque ligne
// reçoit son ✓ et sa valeur ; « ÉVALUATION » se révèle derrière le laser,
// « GRATUITE » claque. Puis les valeurs convergent en un « $ » vert où la caméra
// plonge (raccord avec le compteur).
import * as THREE from "three";
import { Text, measure, FONTS } from "../type.js";
import { C, NIGHT } from "../palette.js";
import { camera, frameW, frameH } from "../kit.js";
import { makeInventory } from "../inventory.js";
import { clamp, smooth, expoIn, expoOut, spring, lerp, invLerp, hash, fbm1, sineInOut, cubicInOut } from "../ease.js";

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function scanShot({ W, H, vertical: V, K }) {
  const scene = new THREE.Scene();
  scene.userData.clear = NIGHT;
  const cam = camera(W, H, V ? 46 : 30, 0.02, 60);

  const inv = makeInventory({ width: 8 });
  const U = inv.userData.uniforms;
  inv.rotation.set(-0.95, V ? 0.0 : 0.18, V ? 0.0 : 0.05);
  inv.position.set(V ? 0 : 0.6, -0.9, -1.6);
  scene.add(inv);
  // nappe du laser (rideau lumineux au-dessus de la feuille)
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color().copy(C.green) }, uA: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 uCol; uniform float uA; varying vec2 vUv; void main(){ float y = clamp(vUv.y, 0.0, 1.0); float a = (1.0 - y) * (1.0 - y) * uA; gl_FragColor = vec4(uCol * a, 1.0); }",
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    })
  );
  inv.add(sheet);
  const { width: IW, height: IH } = inv.userData;

  // caméra
  const P = V ? v3(0.0, 0.55, 3.3) : v3(-0.1, 0.45, 3.0);
  const L = V ? v3(0.0, -0.35, -1.2) : v3(0.15, -0.4, -1.4);
  cam.position.copy(P);
  cam.lookAt(L);
  cam.updateMatrixWorld();

  // titres
  const dT = 2.2;
  const fw = frameW(cam, dT), fh = frameH(cam, dT);
  const tg = new THREE.Group();
  tg.position.copy(cam.position).add(new THREE.Vector3(0, 0, -dT).applyQuaternion(cam.quaternion));
  tg.quaternion.copy(cam.quaternion);
  scene.add(tg);
  const size = (V ? 0.84 : 0.5) * fw / measure("black", "ÉVALUATION");
  const ev1 = new Text("black", "ÉVALUATION", { size, color: C.white, segs: 14 });
  const ev2 = new Text("black", "GRATUITE", { size, color: C.white, segs: 14 });
  const cap = ev1.cap;
  const x0 = V ? -0.42 * fw : -0.45 * fw, y0 = V ? 0.3 * fh : 0.2 * fh;
  ev1.position.set(x0, y0, 0);
  ev2.position.set(x0, y0 - cap * 1.24, 0);
  ev1.setClip(-cap * 0.3, cap * 1.45);
  ev2.setClip(-cap * 0.16, cap * 1.16);
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(cap * 0.035, cap * 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color().copy(C.green).multiplyScalar(1.6), transparent: true }));
  tg.add(ev1, ev2, bar);
  const hudSize = (V ? 0.021 : 0.024) * fh / 0.73;
  const HUD = ["ANALYSE ........ 100 %", "NEUF ET USAGÉ ... OUI", "VALEUR ..... CALCULÉE"];
  const hud = HUD.map((s, i) => {
    const t = new Text("mono", s, { size: hudSize, color: C.white });
    t.position.set(x0, (V ? -0.36 : -0.3) * fh - i * hudSize * 1.3, 0);
    tg.add(t);
    return t;
  });

  // les valeurs convergent en un « $ »
  const big = new Text("black", "$", { size: fh * 0.62 / 0.72, color: new THREE.Color().copy(C.green).multiplyScalar(1.35), align: "center", segs: 28 });
  big.position.set(0, -big.cap / 2, 0.02);
  const bigG = new THREE.Group();
  bigG.add(big);
  tg.add(bigG);
  const dollarGeo = (() => {
    const t = new Text("black", "$", { size: 1, align: "center" });
    return t.glyphs[0].userData.mesh.geometry;
  })();
  const NF = 46;
  const flies = new THREE.InstancedMesh(dollarGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color().copy(C.green).multiplyScalar(1.4) }), NF);
  flies.frustumCulled = false;
  scene.add(flies);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), P3 = new THREE.Vector3();
  const starts = Array.from({ length: NF }, (_, i) => {
    // une ligne de la colonne « valeur » de la feuille
    const col = i % 2, row = Math.floor(hash(i * 3.3) * 32);
    const u = col ? 0.885 : 0.385, vv = 1 - (0.05 + (row + 0.5) * (0.95 / 32));
    return v3((u - 0.5) * IW, (vv - 0.5) * IH, 0.01);
  });

  function update(t) {
    U.uIn.value = 1;
    U.uSel.value = 0;
    U.uFade.value = 1;
    // laser : balaie toute la feuille pendant « Évaluation »
    const s0 = K.evaluation - 0.14, s1 = K.evaluation + 0.66;
    const sk = sineInOut(invLerp(s0, s1, t));
    U.uLaser.value = lerp(-0.02, 1.02, sk);
    U.uLaserOn.value = smooth(s0 - 0.06, s0, t) * (1 - smooth(s1, s1 + 0.12, t));
    sheet.visible = U.uLaserOn.value > 0.001;
    sheet.position.set((U.uLaser.value - 0.5) * IW, 0, 0.5);
    sheet.rotation.set(0, Math.PI / 2, 0);
    sheet.scale.set(1, IH, 1);
    sheet.material.uniforms.uA.value = 0.55 * U.uLaserOn.value;

    // « ÉVALUATION » derrière le laser, « GRATUITE » au mot
    const ex0 = ev1.position.x, ex1 = ex0 + ev1.width;
    const edge = lerp(ex0 - cap * 0.1, ex1 + cap * 0.1, sk);
    ev1.setClipX(-1e6, edge - ex0);
    bar.position.set(edge, ev1.position.y + cap / 2, 0.001);
    bar.visible = sk > 0 && sk < 1;
    ev1.updateClip();
    ev2.glyphs.forEach((g, i) => {
      const kk = spring(t - K.gratuite + 0.03 - i * 0.035, 3.4, 0.52);
      const b = g.userData.base;
      g.position.set(b.x, b.y - (1 - kk) * cap * 1.25, 0);
      g.rotation.x = (1 - kk) * 0.7;
    });
    ev2.updateClip();
    hud.forEach((tx, i) => {
      const n = Math.floor(clamp((t - (K.evaluation + 0.2 + i * 0.16)) / 0.016, 0, 99));
      tx.glyphs.forEach((g, gi) => (g.visible = gi < n));
    });
    const fade = 1 - smooth(K.dollarZoom - 0.05, K.dollarZoom + 0.12, t);
    for (const tx of [ev1, ev2, ...hud]) tx.setOpacity(fade);
    U.uFade.value = 1 - 0.75 * smooth(K.dollarZoom, K.counterIn, t);

    // convergence des valeurs puis « $ »
    const c0 = K.evaluationEnd - 0.05;
    tg.updateMatrixWorld(true);
    const target = bigG.getWorldPosition(new THREE.Vector3());
    flies.visible = t > c0 && t < K.dollarZoom + 0.2;
    if (flies.visible) {
      for (let i = 0; i < NF; i++) {
        const k = expoIn(clamp((t - c0 - hash(i * 7.1) * 0.12) / 0.3));
        P3.copy(starts[i]).applyMatrix4(inv.matrixWorld).lerp(target, k);
        Q.copy(tg.quaternion);
        S3.setScalar(lerp(0.05, 0.01, k) * (k < 1 ? 1 : 0));
        M.compose(P3, Q, S3);
        flies.setMatrixAt(i, M);
      }
      flies.instanceMatrix.needsUpdate = true;
    }
    const bk = spring(t - (c0 + 0.2), 3.0, 0.5);
    bigG.scale.setScalar(Math.max(1e-3, bk));
    bigG.visible = t > c0 + 0.2;

    // caméra : légère dérive, puis plongée dans le « $ »
    const pos = P.clone().add(v3(fbm1(t * 0.4, 81) * 0.03, fbm1(t * 0.37, 82) * 0.02, -0.15 * smooth(K.scanIn, K.dollarZoom, t)));
    const look = L.clone();
    const dz = invLerp(K.dollarZoom, K.counterIn, t);
    if (dz > 0) {
      const e = Math.pow(dz, 2.4);
      const c = big.localToWorld(new THREE.Vector3(0, big.cap / 2, 0));
      pos.lerp(c.clone().add(new THREE.Vector3(0, 0, big.cap * 1.9).applyQuaternion(tg.quaternion)), e);
      look.lerp(c, smooth(K.dollarZoom, K.dollarZoom + 0.12, t));
    }
    cam.position.copy(pos);
    cam.lookAt(look);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const focus = Math.max(0.05, tg.position.clone().sub(cam.position).dot(new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion)));
    return { scene, camera: cam, focus, aperture: dz > 0 ? 0.002 : 0.02 };
  }
  void FONTS;
  return { update, scene, cam };
}
