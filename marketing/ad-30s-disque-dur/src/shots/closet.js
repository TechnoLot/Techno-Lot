// PLAN 1 (0 → 3,95 s) · Le placard sombre.
// La porte s'ouvre : une lame de lumière rasante (volumétrique, poussière en suspension)
// découvre une pile de vieux ordis. « ILS DORMENT. » se lève lettre à lettre, puis les
// lettres roulent comme un compteur mécanique jusqu'à « ILS VALENT $ ». L'écran d'un
// portable s'allume derrière l'espace entre les mots : la caméra fonce entre les
// lettres et plonge dans l'écran (sortie au blanc).
import * as THREE from "three";
import * as MD from "../models.js";
import { Text, measure } from "../type.js";
import { C } from "../palette.js";
import { camera, frameW } from "../kit.js";
import { clamp, smooth, expoIn, expoOut, spring, lerp, invLerp, fbm1, cubicInOut, hash } from "../ease.js";

const BEAM_VS = /* glsl */ `
varying vec3 vWorld;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

// Fonction de fente partagée : faisceau, poussière et masque de la lampe
const SLIT_GLSL = /* glsl */ `
uniform mat4 uLightM; uniform vec3 uLightPos; uniform float uOpen, uTime;
// Ouverture rectangulaire (porte entrebâillée) : profondeur fixe, épaisseur qui s'ouvre
float slit(vec2 uv) {
  float wv = 0.008 + 0.054 * uOpen;
  float sx = 1.0 - smoothstep(0.13, 0.16, abs(uv.x - 0.5));
  float sy = 1.0 - smoothstep(wv - 0.014, wv + 0.014, abs(uv.y - 0.5));
  return sx * sy * step(0.001, uOpen);
}
float lightAt(vec3 p) {
  vec4 q = uLightM * vec4(p, 1.0);
  if (q.w <= 0.0) return 0.0;
  vec2 uv = q.xy / q.w;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  float d = distance(p, uLightPos);
  return slit(uv) * 9.0 / (d * d);
}
float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

const BEAM_FS = /* glsl */ `
${SLIT_GLSL}
uniform vec3 uBoxMin, uBoxMax; uniform float uGain;
varying vec3 vWorld;
void main() {
  vec3 ro = cameraPosition, rd = normalize(vWorld - cameraPosition);
  vec3 t0 = (uBoxMin - ro) / rd, t1 = (uBoxMax - ro) / rd;
  vec3 tmin = min(t0, t1), tmax = max(t0, t1);
  float a = max(max(max(tmin.x, tmin.y), tmin.z), 0.0);
  float b = min(min(tmax.x, tmax.y), tmax.z);
  if (b <= a) discard;
  const int N = 48;
  float dt = (b - a) / float(N), acc = 0.0;
  float j = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * (a + (float(i) + j) * dt);
    float n = vnoise(p * 7.0 + vec3(0.0, uTime * 0.12, uTime * 0.05)) * 0.6 + vnoise(p * 19.0 - vec3(uTime * 0.07)) * 0.4;
    acc += lightAt(p) * (0.35 + 0.65 * n) * dt;
  }
  gl_FragColor = vec4(vec3(1.0, 0.99, 0.97) * acc * uGain, 1.0);
}`;

const DUST_VS = /* glsl */ `
${SLIT_GLSL}
attribute vec4 seed;
uniform float uSize, uPx, uFocus, uAperture;
varying float vB;
void main() {
  vec3 p = position;
  float t = uTime;
  p += vec3(sin(t * (0.21 + seed.x * 0.3) + seed.y * 6.28), sin(t * (0.17 + seed.z * 0.25) + seed.w * 6.28), cos(t * (0.19 + seed.y * 0.2) + seed.x * 6.28)) * 0.035;
  p.y += t * (0.012 + 0.02 * seed.z) * (seed.w > 0.5 ? 1.0 : -0.6);
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float L = lightAt((modelMatrix * vec4(p, 1.0)).xyz);
  float base = max(1.5, uPx * uSize * (0.6 + 0.8 * seed.w) / -mv.z);
  float coc = uAperture * uPx * abs(1.0 / -mv.z - 1.0 / uFocus);
  float sz = base + 1.3 * coc;
  vB = (L * (0.4 + 1.2 * seed.x) + 0.004) * (base * base) / (sz * sz);
  gl_PointSize = sz;
}`;
const DUST_FS = /* glsl */ `
varying float vB;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.15, length(c));
  gl_FragColor = vec4(vec3(1.0) * vB * a, 1.0);
}`;

// Couche de poussière sur les faces tournées vers le haut
function dustify(mat, amount = 0.6) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vUpY; varying vec3 vDustP;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvUpY = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz).y; vDustP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vUpY; varying vec3 vDustP;\nfloat dh(vec3 p){ return fract(sin(dot(floor(p), vec3(127.1, 311.7, 74.7))) * 43758.5453); }")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float dn = dh(vDustP * 180.0) * 0.5 + dh(vDustP * 40.0) * 0.5;
        float up = smoothstep(0.55, 0.95, vUpY);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.61, 0.58), up * ${amount.toFixed(2)} * (0.55 + 0.45 * dn));`
      );
  };
  mat.customProgramCacheKey = () => "dust" + amount;
}

export function closetShot({ W, H, vertical: V, K, envDark }) {
  const scene = new THREE.Scene();
  scene.userData.clear = new THREE.Color(0, 0, 0);
  scene.environment = envDark;
  scene.environmentIntensity = 0.025;

  // ---------------------------------------------------------------- décor
  const wallMat = new THREE.MeshStandardMaterial({ color: "#2c2b29", roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: "#232220", roughness: 0.82 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), wallMat);
  back.position.set(0, 2, -0.95);
  back.receiveShadow = true;
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 0.45), new THREE.MeshStandardMaterial({ color: "#3a3833", roughness: 0.8 }));
  shelf.position.set(-0.2, 1.32, -0.72);
  shelf.castShadow = shelf.receiveShadow = true;
  scene.add(floor, back, shelf);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.32 + 0.1 * hash(i), 0.24 + 0.1 * hash(i + 3), 0.34), new THREE.MeshStandardMaterial({ color: "#3b3936", roughness: 0.9 }));
    b.position.set(-1.0 + i * 0.42, 1.335 + 0.13, -0.72);
    b.rotation.y = (hash(i * 5) - 0.5) * 0.3;
    b.castShadow = b.receiveShadow = true;
    scene.add(b);
  }

  // ---------------------------------------------------------------- la pile
  const pile = new THREE.Group();
  const lying = MD.oldTower(1);
  lying.rotation.z = Math.PI / 2;
  lying.position.set(-0.08, 0.0, -0.38);
  lying.rotation.y = 0.06;
  // tour couchée : son « bas » (y=0) devient le côté ; on la recale au sol
  lying.position.y = 0.095;
  lying.position.x = -0.1 + 0.21;
  const standing = MD.oldTower(5);
  standing.position.set(-0.78, 0, -0.55);
  standing.rotation.y = 0.42;
  const screen = MD.crt(2);
  screen.position.set(0.42, 0, -0.42);
  screen.rotation.y = -0.38;
  const kb = MD.oldKeyboard(4);
  kb.position.set(0.12, 0, 0.12);
  kb.rotation.set(0, 0.25, 0);
  const lap1 = MD.laptop({ old: true });
  lap1.userData.hinge.rotation.x = Math.PI / 2 - 0.035;
  lap1.position.set(-0.12, 0.19, -0.36);
  lap1.rotation.y = 0.12;
  const lap2 = MD.laptop({ old: true });
  lap2.userData.hinge.rotation.x = Math.PI / 2 - 0.035;
  lap2.position.set(-0.1, 0.232, -0.34);
  lap2.rotation.y = -0.1;
  const hero = MD.laptop({ old: true });
  hero.userData.hinge.rotation.x = -0.32;
  hero.position.set(-0.08, 0.275, -0.3);
  hero.rotation.y = 0.18;
  const floorLap = MD.laptop({ old: true });
  floorLap.userData.hinge.rotation.x = Math.PI / 2 - 0.035;
  floorLap.position.set(-0.55, 0, 0.05);
  floorLap.rotation.y = -0.55;
  const screen2 = MD.crt(6);
  screen2.position.set(-0.62, 0, -0.18);
  screen2.rotation.y = 0.55;
  screen2.scale.setScalar(0.88);
  const tower3 = MD.oldTower(8);
  tower3.position.set(0.86, 0, -0.66);
  tower3.rotation.y = -0.5;
  const kb2 = MD.oldKeyboard(9);
  kb2.position.set(0.52, 0.381, -0.5);
  kb2.rotation.set(0.0, -0.3, 0.06);
  const lap3 = MD.laptop({ old: true });
  lap3.userData.hinge.rotation.x = 0.55;
  lap3.position.set(0.66, 0, 0.02);
  lap3.rotation.y = -0.9;
  pile.add(lying, standing, screen, kb, lap1, lap2, hero, floorLap, screen2, tower3, kb2, lap3);
  pile.add(MD.cable([[0.42, 0.18, -0.62], [0.55, 0.05, -0.5], [0.62, 0.005, -0.2], [0.4, 0.005, 0.0]]));
  pile.add(MD.cable([[-0.3, 0.05, -0.6], [-0.42, 0.005, -0.3], [-0.2, 0.006, -0.05], [-0.05, 0.005, 0.25]], 0.005));
  scene.add(pile);
  pile.traverse((o) => {
    if (o.isMesh && o.material?.isMeshStandardMaterial && !o.material.userData.dusted && o.material !== hero.userData.screen) {
      o.material.userData.dusted = true;
      dustify(o.material, 0.55);
    }
  });
  // l'écran du héros : s'allume plus tard
  const heroScreen = hero.userData.screen;
  heroScreen.emissiveMap = null;
  heroScreen.emissive.set(1, 1, 1);
  heroScreen.needsUpdate = true;

  // ---------------------------------------------------------------- lumière de porte
  const spot = new THREE.SpotLight(0xffffff, 0, 9, 0.42, 0.0, 2);
  spot.position.set(-2.15, 2.35, -0.12);
  spot.target.position.set(-0.02, 0.3, -0.34);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0003;
  spot.shadow.normalBias = 0.012;
  spot.shadow.camera.near = 0.8;
  spot.shadow.camera.far = 7;
  scene.add(spot, spot.target);
  const ck = document.createElement("canvas");
  ck.width = ck.height = 256;
  const ckx = ck.getContext("2d");
  const ckImg = ckx.createImageData(256, 256);
  const cookie = new THREE.CanvasTexture(ck);
  cookie.colorSpace = THREE.NoColorSpace;
  spot.map = cookie;
  let lastOpen = -1;
  const sm = (a, b, x) => {
    const k = clamp((x - a) / (b - a));
    return k * k * (3 - 2 * k);
  };
  function drawCookie(open) {
    if (Math.abs(open - lastOpen) < 1e-4) return;
    lastOpen = open;
    const wv = 0.008 + 0.054 * open;
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const u = (x + 0.5) / 256, v = 1 - (y + 0.5) / 256;
        const sx = 1 - sm(0.13, 0.16, Math.abs(u - 0.5));
        const sy = 1 - sm(wv - 0.014, wv + 0.014, Math.abs(v - 0.5));
        const val = open > 0.001 ? sx * sy : 0;
        const i = (y * 256 + x) * 4;
        ckImg.data[i] = ckImg.data[i + 1] = ckImg.data[i + 2] = Math.round(255 * val);
        ckImg.data[i + 3] = 255;
      }
    ckx.putImageData(ckImg, 0, 0);
    cookie.needsUpdate = true;
  }
  const fill = new THREE.HemisphereLight(0xb8b8b4, 0x000000, 0.012);
  // contre-jour très discret : détache les silhouettes du fond
  const rim = new THREE.SpotLight(0xffffff, 3.2, 6, 0.5, 0.8, 2);
  rim.position.set(1.4, 1.6, -1.6);
  rim.target.position.set(-0.1, 0.25, -0.2);
  scene.add(fill, rim, rim.target);

  // faisceau volumétrique (marche de rayons dans une boîte, face arrière)
  const shared = { uLightM: { value: new THREE.Matrix4() }, uLightPos: { value: spot.position }, uOpen: { value: 0 }, uTime: { value: 0 } };
  const boxMin = new THREE.Vector3(-1.7, 0.003, -0.94), boxMax = new THREE.Vector3(0.9, 2.0, 1.1);
  const beamMat = new THREE.ShaderMaterial({
    vertexShader: BEAM_VS,
    fragmentShader: BEAM_FS,
    uniforms: { ...shared, uBoxMin: { value: boxMin }, uBoxMax: { value: boxMax }, uGain: { value: 0.11 } },
    side: THREE.FrontSide, // face avant testée en profondeur : masqué par ce qui est devant
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), beamMat);
  beam.scale.subVectors(boxMax, boxMin);
  beam.position.addVectors(boxMax, boxMin).multiplyScalar(0.5);
  beam.renderOrder = 10;
  beam.frustumCulled = false;
  scene.add(beam);

  // poussière en suspension
  const ND = 2600;
  const dg = new THREE.BufferGeometry();
  const pos = new Float32Array(ND * 3), seed = new Float32Array(ND * 4);
  for (let i = 0; i < ND; i++) {
    pos[i * 3] = lerp(-1.5, 0.8, hash(i * 1.13));
    pos[i * 3 + 1] = lerp(0.02, 1.9, hash(i * 2.71));
    pos[i * 3 + 2] = lerp(-0.85, 1.2, hash(i * 3.97));
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = hash(i * 7.31 + k * 1.7);
  }
  dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dg.setAttribute("seed", new THREE.BufferAttribute(seed, 4));
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
    vertexShader: DUST_VS, fragmentShader: DUST_FS,
    uniforms: { ...shared, uSize: { value: 0.0035 }, uPx: { value: 1 }, uFocus: { value: 1 }, uAperture: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  dust.frustumCulled = false;
  dust.renderOrder = 11;
  scene.add(dust);

  // ---------------------------------------------------------------- caméra et typographie
  const cam = camera(W, H, V ? 50 : 31, 0.01, 30);
  // Poses : début (porte), référence (juste avant la plongée)
  const P0 = V ? new THREE.Vector3(0.3, 0.72, 1.32) : new THREE.Vector3(0.56, 0.6, 1.4);
  const P1 = V ? new THREE.Vector3(0.22, 0.62, 1.08) : new THREE.Vector3(0.42, 0.52, 1.18);
  const heroScreenPos = new THREE.Vector3();
  hero.updateMatrixWorld(true);
  hero.userData.screenMesh.getWorldPosition(heroScreenPos);
  // l'écran du portable apparaît là, à l'image (juste avant la plongée)
  const AIM = V ? { nx: 0.42, ny: 0.0 } : { nx: 0.46, ny: 0.06 };
  const qRef = new THREE.Quaternion(), qDive = new THREE.Quaternion();
  function aimedQuat(P, nx, ny, out) {
    cam.position.copy(P);
    cam.up.set(0, 1, 0);
    cam.lookAt(heroScreenPos);
    const hf = Math.atan(Math.tan(THREE.MathUtils.DEG2RAD * cam.fov * 0.5) * cam.aspect);
    cam.rotateY(Math.atan(nx * Math.tan(hf)));
    cam.rotateX(-Math.atan(ny * Math.tan(THREE.MathUtils.DEG2RAD * cam.fov * 0.5)));
    return out.copy(cam.quaternion);
  }
  aimedQuat(P1, AIM.nx, AIM.ny, qRef);
  const qStart = new THREE.Quaternion();
  aimedQuat(P0, AIM.nx * 0.55, AIM.ny + 0.18, qStart);

  // Plan du texte : perpendiculaire à l'axe de visée de référence, à 58 % du chemin vers l'écran
  cam.position.copy(P1);
  cam.quaternion.copy(qRef);
  cam.updateMatrixWorld();
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(qRef);
  const toScreen = heroScreenPos.clone().sub(P1);
  const dScreen = toScreen.dot(fwd);
  const dText = dScreen * 0.58;
  const G = P1.clone().add(toScreen.clone().multiplyScalar(0.58)); // la caméra passe par ici
  const textGroup = new THREE.Group();
  textGroup.quaternion.copy(qRef);
  scene.add(textGroup);
  const fw = frameW(cam, dText);
  // tailles : « DORMENT. » (ou la ligne entière en 16:9) occupe ~86 % de la largeur
  const size = V ? (0.84 * fw) / measure("black", "DORMENT.") : (0.86 * fw) / measure("black", "ILS DORMENT.");
  const opts = { size, color: C.white, segs: 14 };
  const ils = new Text("black", "ILS", opts);
  const dormant = new Text("black", "DORMENT.", opts);
  const valent = new Text("black", "VALENT $", opts);
  const cap = ils.cap;
  // x de l'espace entre « VALENT » et « $ » (repère de la ligne de « VALENT $ »)
  const gapX = measure("black", "VALENT", size) + (measure("black", "VALENT $", size) - measure("black", "VALENT", size) - measure("black", "$", size)) / 2;
  // coordonnées locales (repère texte) du point G
  const inv = new THREE.Matrix4().compose(P1.clone().add(fwd.clone().multiplyScalar(dText)), qRef, new THREE.Vector3(1, 1, 1)).invert();
  const gLocal = G.clone().applyMatrix4(inv);
  const lineX = gLocal.x - gapX; // début de la ligne « VALENT $ »
  const lineY = gLocal.y - cap / 2; // ligne de base
  const spaceW = measure("black", "ILS DORMENT.", size) - measure("black", "ILS", size) - measure("black", "DORMENT.", size);
  if (V) {
    ils.position.set(lineX, lineY + cap * 1.16, 0);
    dormant.position.set(lineX, lineY, 0);
    valent.position.set(lineX, lineY, 0);
  } else {
    const ilsW = measure("black", "ILS", size);
    ils.position.set(lineX - spaceW - ilsW, lineY, 0);
    dormant.position.set(lineX, lineY, 0);
    valent.position.set(lineX, lineY, 0);
  }
  textGroup.position.copy(P1).add(fwd.clone().multiplyScalar(dText));
  textGroup.add(ils, dormant, valent);
  const dollar = valent.glyphs[valent.glyphs.length - 1].userData.mesh.material;
  dollar.color.copy(C.green).multiplyScalar(1.5);
  for (const t of [ils, dormant, valent]) t.setClip(-cap * 0.12, cap * 1.12);

  // ---------------------------------------------------------------- animation
  const S0 = K.ilsIn;
  function letters(text, t, start, stagger, mode) {
    text.glyphs.forEach((g, i) => {
      const ti = start + i * stagger;
      const b = g.userData.base;
      if (mode === "in") {
        const k = spring(t - ti, 2.6, 0.58);
        g.position.set(b.x, b.y - (1 - k) * cap * 1.25, 0);
        g.rotation.x = (1 - clamp(k)) * 0.6;
      } else if (mode === "out") {
        const k = cubicInOut(invLerp(ti, ti + 0.17, t));
        g.position.set(b.x, b.y + k * cap * 1.3, 0);
        g.rotation.x = -k * 0.9;
      } else if (mode === "rollin") {
        const k = spring(t - ti, 3.1, 0.5);
        g.position.set(b.x, b.y - (1 - k) * cap * 1.3, 0);
        g.rotation.x = (1 - k) * 0.9;
      }
    });
  }

  function update(t) {
    // porte : s'ouvre vite puis ralentit, avec un petit rebond de la porte
    const open = clamp(Math.pow(clamp(invLerp(K.door, K.door + 1.1, t)), 0.55) * (1 + 0.05 * Math.sin(clamp(t - K.door, 0, 3) * 13) * Math.exp(-2.5 * Math.max(0, t - K.door))));
    drawCookie(open);
    spot.intensity = 95 * smooth(K.door, K.door + 0.12, t);
    shared.uOpen.value = open;
    shared.uTime.value = t;
    spot.updateMatrixWorld();
    spot.target.updateMatrixWorld();
    spot.shadow.updateMatrices(spot);
    shared.uLightM.value.copy(spot.shadow.matrix);

    // écran du portable : clignote puis s'allume, enfin éblouit
    const wake = t < K.wake ? 0 : (t < K.wake + 0.16 ? (Math.sin((t - K.wake) * 90) > 0 ? 0.6 : 0.1) : 0.9 + 4 * expoIn(invLerp(K.dive + 0.2, K.whiteout, t)));
    heroScreen.emissiveIntensity = wake * 1.4;

    // caméra : lente poussée (0 → plongée), puis rampe de vitesse dans l'écran
    let pos, quat = new THREE.Quaternion();
    if (t < K.dive) {
      const k = cubicInOut(invLerp(0, K.dive, t));
      pos = P0.clone().lerp(P1, k);
      quat.slerpQuaternions(qStart, qRef, smooth(0, K.dive, t));
      pos.x += fbm1(t * 0.6, 4) * 0.012;
      pos.y += fbm1(t * 0.5, 5) * 0.01;
      cam.fov = V ? 50 : 31;
    } else {
      const k = Math.pow(invLerp(K.dive, K.whiteout + 0.02, t), 2.4);
      const end = heroScreenPos.clone().add(new THREE.Vector3(0, 0, 0.02).applyQuaternion(hero.quaternion));
      pos = P1.clone().lerp(end, k);
      const c = 1 - smooth(K.dive, K.whiteout - 0.1, t);
      aimedQuat(pos, AIM.nx * c, AIM.ny * c, qDive);
      quat.copy(qDive);
      cam.fov = (V ? 50 : 31) + 10 * k;
    }
    cam.position.copy(pos);
    cam.quaternion.copy(quat);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // typographie
    letters(ils, t, S0, 0.045, "in");
    const dIn = V ? S0 + 0.14 : S0 + 0.14;
    const swap = K.valent - 0.08;
    if (t < swap + 0.6) letters(dormant, t, t < swap ? dIn : swap, 0.04, t < swap ? "in" : "out");
    dormant.visible = t < swap + 0.6;
    valent.visible = t >= swap + 0.02;
    if (valent.visible) letters(valent, t, swap + 0.1, 0.04, "rollin");
    // le « $ » respire en vert
    const pulse = t > K.argent ? 0.25 * Math.sin((t - K.argent) * 9) * Math.exp(-(t - K.argent) * 2) : 0;
    dollar.color.copy(C.green).multiplyScalar(1.5 + pulse + 1.2 * smooth(K.valent + 0.3, K.valent + 0.5, t) * (1 - smooth(K.valent + 0.5, K.valent + 1.0, t)));
    for (const tx of [ils, dormant, valent]) tx.updateClip();

    // mise au point : sur le texte, puis tirée vers l'écran pendant la plongée
    const dT = textGroup.position.clone().sub(cam.position).dot(new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion));
    const dS = heroScreenPos.clone().sub(cam.position).length();
    const focus = t < K.dive ? Math.max(0.05, dT) : lerp(Math.max(0.05, dT), dS, smooth(K.dive, K.dive + 0.35, t));
    const aperture = V ? 0.006 : 0.007;
    const du = dust.material.uniforms;
    du.uFocus.value = Math.max(0.03, focus);
    du.uAperture.value = aperture;
    du.uPx.value = H / 2 / Math.tan(THREE.MathUtils.DEG2RAD * cam.fov * 0.5);
    return { scene, camera: cam, focus: Math.max(0.03, focus), aperture };
  }
  return { update, scene, cam };
}
