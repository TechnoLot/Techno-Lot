// CARTON DE FIN (24,8 → 30 s) · noir.
// Le logo se trace (la boucle suit son propre sens, la flèche arrive en dernier,
// le « $ » éclot), le mot-symbole apparaît en « glitch », halo vert. « Paiement rapide
// et garanti », pilule verte « technolot.ca » sur la voix, ligne monospace.
// Maintien de 1,5 s, puis coupe au noir sur le dernier temps.
import * as THREE from "three";
import { Text, measure } from "../type.js";
import { C, NIGHT } from "../palette.js";
import { camera, frameW, frameH } from "../kit.js";
import { clamp, smooth, expoOut, spring, lerp, invLerp, hash, fbm1 } from "../ease.js";

const LOGO_FS = /* glsl */ `
uniform sampler2D map;
uniform float uSweep, uDollar, uWord, uTime, uGreen, uOpacity;
varying vec2 vUv;
float h(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  vec2 S = vec2(1919.0, 1158.0);
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * S;
  vec4 c;
  if (px.y > 800.0) {
    // mot-symbole : tranches décalées qui se recalent (glitch), balayage gauche → droite
    float slice = floor(px.y / 22.0);
    float r = h(slice + floor(uTime * 30.0) * 7.0);
    float off = (1.0 - uWord) * (r - 0.5) * 260.0;
    c = texture2D(map, vec2((px.x + off) / S.x, vUv.y));
    c.a *= step(px.x / S.x, uWord * 1.25 - 0.12 * r);
  } else if (px.x > 845.0 && px.x < 1021.0 && px.y > 228.0 && px.y < 551.0) {
    // « $ » : éclosion en ressort autour de son centre
    vec2 dc = vec2(933.0, 389.5);
    vec2 p2 = dc + (px - dc) / max(uDollar, 0.001);
    c = texture2D(map, vec2(p2.x / S.x, 1.0 - p2.y / S.y));
    c.a *= step(845.0, p2.x) * step(p2.x, 1021.0) * step(228.0, p2.y) * step(p2.y, 551.0) * step(0.001, uDollar);
  } else {
    // boucle + flèche : tracé angulaire depuis l'extrémité haute (52°), sens antihoraire
    c = texture2D(map, vUv);
    float a = degrees(atan(-(px.y - 389.0), px.x - 933.0));
    float ang = mod(a - 52.0, 360.0);
    c.a *= 1.0 - smoothstep(uSweep * 312.0 - 3.0, uSweep * 312.0 + 3.0, ang);
  }
  float g = smoothstep(0.05, 0.25, c.g - c.r); // pixels verts du logo → halo
  vec3 col = c.rgb * mix(1.0, uGreen, g);
  gl_FragColor = vec4(col, c.a * uOpacity);
}`;

export function endShot({ W, H, vertical: V, K, logoTex }) {
  const scene = new THREE.Scene();
  scene.userData.clear = NIGHT;
  const cam = camera(W, H, V ? 46 : 30, 0.5, 100); // proche à 0,5 : bonne précision de profondeur
  const D = 10;
  cam.position.set(0, 0, D);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  const fw = frameW(cam, D), fh = frameH(cam, D);
  const G = new THREE.Group();
  scene.add(G);

  // logo (texture d'origine, masques de révélation en shader)
  const logoW = V ? fw * 0.72 : fh * 0.5 * (1919 / 1158);
  const logoH = logoW * (1158 / 1919);
  const logoMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: logoTex.full }, uSweep: { value: 0 }, uDollar: { value: 0 }, uWord: { value: 0 }, uTime: { value: 0 }, uGreen: { value: 1.7 }, uOpacity: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: LOGO_FS,
    transparent: true,
    depthWrite: false,
  });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), logoMat);
  const logoY = V ? fh * 0.12 : fh * 0.17;
  logo.position.set(0, logoY, 0);
  G.add(logo);

  // « Paiement rapide et garanti »
  const headSize = V ? (0.8 * fw) / measure("black", "Paiement rapide et garanti") : (0.44 * fw) / measure("black", "Paiement rapide et garanti");
  const head = new Text("black", "Paiement rapide et garanti", { size: headSize, color: C.white, align: "center" });
  const capH = head.cap;
  const headY = logoY - logoH * 0.5 - capH * (V ? 1.6 : 1.25);
  head.position.set(0, headY, 0);
  head.setClip(-capH * 0.4, capH * 1.45);
  G.add(head);

  // pilule verte « technolot.ca »
  const urlSize = headSize * 0.62;
  const url = new Text("monoBold", "technolot.ca", { size: urlSize, color: C.black, align: "center" });
  const pillH = url.cap * 2.6, pillW = url.width + url.cap * 2.6;
  const shape = new THREE.Shape();
  const r = pillH / 2;
  shape.absarc(-pillW / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  shape.absarc(pillW / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  const pill = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color().copy(C.green).multiplyScalar(1.12), transparent: true }));
  const pillY = headY - capH * 1.0 - pillH * 0.9;
  const pillG = new THREE.Group();
  pillG.position.set(0, pillY, 0);
  url.position.set(0, -url.cap / 2, 0.01);
  pillG.add(pill, url);
  // pilule puis texte, toujours dans cet ordre : sinon les lettres du bout (« .ca »)
  // passaient une image sur deux derrière la pilule (clignotement)
  pill.renderOrder = 1;
  for (const g of url.glyphs) {
    g.userData.mesh.material.depthTest = false;
    g.userData.mesh.renderOrder = 2;
  }
  G.add(pillG);

  // ligne monospace
  const subStr = "Rachat de matériel informatique · Partout au Québec";
  const subSize = V ? (0.86 * fw) / measure("mono", subStr) : Math.min((0.56 * fw) / measure("mono", subStr), fh * 0.03 / 0.73);
  const sub = new Text("mono", subStr, { size: subSize, color: C.grey, align: "center" });
  sub.position.set(0, pillY - pillH * 0.5 - sub.cap * (V ? 3.2 : 2.6), 0);
  G.add(sub);

  // poussière lumineuse au premier plan (bokeh)
  const NP = 140;
  const pg = new THREE.BufferGeometry();
  const pos = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) {
    pos[i * 3] = (hash(i * 1.3) - 0.5) * fw * 1.4;
    pos[i * 3 + 1] = (hash(i * 2.9) - 0.5) * fh * 1.4;
    pos[i * 3 + 2] = lerp(-4, 6.5, hash(i * 5.1));
  }
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(0.35, 0.35, 0.34), size: 2.2, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  function update(t) {
    const t0 = K.end;
    logoMat.uniforms.uSweep.value = expoOut(invLerp(t0 + 0.05, t0 + 0.75, t));
    logoMat.uniforms.uDollar.value = clamp(spring(t - (t0 + 0.42), 2.8, 0.45), 0, 1.3);
    logoMat.uniforms.uWord.value = expoOut(invLerp(t0 + 0.55, t0 + 1.05, t));
    logoMat.uniforms.uTime.value = t;
    // le halo « respire » légèrement pendant le maintien
    logoMat.uniforms.uGreen.value = 1.7 + 0.35 * Math.exp(-Math.max(0, t - (t0 + 0.75)) * 3) + 0.08 * Math.sin(t * 3.2);
    const ls = 1 + 0.04 * (1 - expoOut(invLerp(t0, t0 + 1.2, t)));
    logo.scale.setScalar(ls);

    head.glyphs.forEach((g, i) => {
      const k = spring(t - (t0 + 0.7) - i * 0.016, 3.0, 0.6);
      const b = g.userData.base;
      g.position.set(b.x, b.y - (1 - k) * capH * 1.3, 0);
      g.rotation.x = (1 - k) * 0.6;
    });
    head.updateClip();

    const pk = spring(t - (K.slogan + 0.02), 3.2, 0.48);
    pillG.scale.setScalar(Math.max(1e-3, pk));
    pillG.visible = t > K.slogan;
    const nu = Math.floor(clamp((t - K.slogan - 0.12) / 0.045, 0, 20));
    url.glyphs.forEach((g, i) => (g.visible = i < nu));

    const ns = Math.floor(clamp((t - K.occupe) / ((K.endBuilt - 0.05 - K.occupe) / subStr.length), 0, 99));
    sub.glyphs.forEach((g, i) => (g.visible = i < ns));

    // lente poussée, dérive minime : aucun plan figé
    const k = invLerp(t0, K.cut, t);
    cam.position.set(fbm1(t * 0.3, 51) * 0.04, fbm1(t * 0.27, 52) * 0.03, D * (1.04 - 0.07 * k));
    cam.lookAt(0, V ? -fh * 0.03 : -fh * 0.035, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    G.visible = t < K.cut;
    dust.visible = t < K.cut;
    return { scene, camera: cam, focus: cam.position.z, aperture: 0.06 };
  }
  return { update, scene, cam };
}
