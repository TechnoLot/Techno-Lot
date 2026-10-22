// Modèles procéduraux (unités : mètres). Aucun fichier 3D externe.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as TX from "./textures.js";
import { hash } from "./ease.js";

const { Mesh, Group, PlaneGeometry, BoxGeometry, CylinderGeometry, MeshStandardMaterial: Std, MeshPhysicalMaterial: Phys } = THREE;
const rbox = (w, h, d, r, s = 3) => new RoundedBoxGeometry(w, h, d, s, r);
const HALF = Math.PI / 2;

function shadow(o, cast = true, receive = true) {
  o.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
    }
  });
  return o;
}
// Plaque décorative posée sur une face (z local = avant)
function face(w, h, mat, z) {
  const m = new Mesh(new PlaneGeometry(w, h), mat);
  m.position.z = z;
  return m;
}

// ------------------------------------------------------------------ objets modernes (espace blanc)
export function laptop({ old = false } = {}) {
  const g = new Group();
  const shell = old
    ? new Std({ color: "#1d1d1c", roughness: 0.62, metalness: 0.05, roughnessMap: TX.grimeTex(256, 3) })
    : new Phys({ color: "#c2c2be", metalness: 1, roughness: 0.3 });
  const th = old ? 0.028 : 0.014;
  const base = new Mesh(rbox(0.31, th, 0.215, old ? 0.008 : 0.005), shell);
  base.position.y = th / 2;
  const kb = new Mesh(new PlaneGeometry(0.27, 0.105), new Std({ map: TX.keyboardTex(old ? "#2a2a28" : "#a9a9a5", old ? "#161615" : "#0c0c0c", old ? "#3a3a37" : "#8d8d89"), roughness: 0.65 }));
  kb.rotation.x = -HALF;
  kb.position.set(0, th + 0.0002, -0.035);
  const pad = new Mesh(new PlaneGeometry(0.11, 0.065), old ? new Std({ color: "#262624", roughness: 0.5 }) : new Phys({ color: "#b0b0ac", metalness: 1, roughness: 0.2 }));
  pad.rotation.x = -HALF;
  pad.position.set(0, th + 0.0002, 0.06);
  const hinge = new Group();
  hinge.position.set(0, th, -0.104);
  const lidT = old ? 0.012 : 0.005;
  const lid = new Mesh(rbox(0.31, 0.205, lidT, old ? 0.005 : 0.0035), shell);
  lid.position.set(0, 0.1025, -lidT / 2);
  const screenMat = new Phys({ color: "#030303", roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, emissive: "#ffffff", emissiveIntensity: 0, emissiveMap: TX.screenTex(!old) });
  const screen = new Mesh(new PlaneGeometry(0.284, 0.178), screenMat);
  screen.position.set(0, 0.105, 0.0004);
  hinge.add(lid, screen);
  hinge.rotation.x = -0.3;
  g.add(base, kb, pad, hinge);
  g.userData = { hinge, screen: screenMat, screenMesh: screen };
  return shadow(g);
}

export function towerModern() {
  const g = new Group();
  const body = new Mesh(rbox(0.2, 0.44, 0.42, 0.01), new Phys({ color: "#1c1c1c", metalness: 0.75, roughness: 0.36 }));
  body.position.y = 0.22;
  const front = face(0.17, 0.41, new Std({ map: TX.perfTex(256, 620, 4, 3, "#2b2b2a", "#030303"), roughness: 0.5, metalness: 0.5 }), 0.2105);
  front.position.y = 0.22;
  const led = new Mesh(new THREE.TorusGeometry(0.008, 0.0016, 8, 32), new Std({ color: "#000", emissive: "#5ECB33", emissiveIntensity: 2.2 }));
  led.position.set(0, 0.405, 0.2115);
  const glass = new Mesh(new PlaneGeometry(0.38, 0.38), new Phys({ color: "#050505", roughness: 0.05, transmission: 0, clearcoat: 1, metalness: 0.2 }));
  glass.rotation.y = HALF;
  glass.position.set(0.1006, 0.225, 0);
  g.add(body, front, led, glass);
  return shadow(g);
}

export function server1U() {
  const g = new Group();
  const steel = new Phys({ color: "#a9a9a6", metalness: 1, roughness: 0.34 });
  const body = new Mesh(rbox(0.44, 0.0435, 0.62, 0.0015, 2), steel);
  const ft = TX.serverFrontTex();
  const frontMat = new Std({ map: ft.map, emissiveMap: TX.serverLedTex(), emissive: "#ffffff", emissiveIntensity: 2.0, metalness: 0.6, roughness: 0.42 });
  const front = face(0.482, 0.0435, frontMat, 0.3102);
  const sticker = new Mesh(new PlaneGeometry(0.11, 0.07), new Std({ map: TX.hddLabelTex(), roughness: 0.7 }));
  sticker.rotation.x = -HALF;
  sticker.position.set(0.12, 0.0219, 0.12);
  // LCD : centre (repère local) pour le zoom de transition
  const lcdU = (ft.lcd.u0 + ft.lcd.u1) / 2, lcdV = (ft.lcd.v0 + ft.lcd.v1) / 2;
  const lcd = new THREE.Vector3((lcdU - 0.5) * 0.482, (0.5 - lcdV) * 0.0435, 0.3104);
  g.add(body, front, sticker);
  g.userData = { lcd, lcdSize: [(ft.lcd.u1 - ft.lcd.u0) * 0.482, (ft.lcd.v1 - ft.lcd.v0) * 0.0435], steel, frontMat };
  return shadow(g);
}

export function switch1U() {
  const g = new Group();
  const body = new Mesh(rbox(0.44, 0.0435, 0.26, 0.0015, 2), new Phys({ color: "#1a1a1a", metalness: 0.6, roughness: 0.4 }));
  const front = face(0.482, 0.0435, new Std({ map: TX.switchFrontTex(), emissiveMap: TX.switchLedTex(), emissive: "#ffffff", emissiveIntensity: 2.2, roughness: 0.5, metalness: 0.4 }), 0.1302);
  g.add(body, front);
  return shadow(g);
}

export function monitor() {
  const g = new Group();
  const dark = new Phys({ color: "#0e0e0e", metalness: 0.4, roughness: 0.38 });
  const alu = new Phys({ color: "#bdbdb9", metalness: 1, roughness: 0.3 });
  const panel = new Mesh(rbox(0.62, 0.37, 0.016, 0.004), dark);
  panel.position.y = 0.36;
  const screen = new Mesh(new PlaneGeometry(0.604, 0.34), new Phys({ color: "#020202", roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, emissive: "#ffffff", emissiveIntensity: 0.05, emissiveMap: TX.screenTex(true) }));
  screen.position.set(0, 0.367, 0.0082);
  const back = new Mesh(rbox(0.3, 0.2, 0.03, 0.01), alu);
  back.position.set(0, 0.36, -0.02);
  const neck = new Mesh(rbox(0.05, 0.25, 0.018, 0.006), alu);
  neck.position.set(0, 0.17, -0.04);
  neck.rotation.x = -0.12;
  const foot = new Mesh(rbox(0.22, 0.008, 0.16, 0.003), alu);
  foot.position.set(0, 0.004, -0.02);
  g.add(panel, screen, back, neck, foot);
  return shadow(g);
}

// ------------------------------------------------------------------ vieux matériel (placard)
const plastic = (c, seed) => new Std({ color: c, roughness: 0.78, metalness: 0, roughnessMap: TX.grimeTex(256, seed, 1.4) });

export function oldTower(seed = 1) {
  const g = new Group();
  const body = new Mesh(rbox(0.19, 0.42, 0.44, 0.012), plastic("#bdbbb3", seed));
  body.position.y = 0.21;
  const front = face(0.175, 0.405, new Std({ map: TX.oldTowerFrontTex(), roughness: 0.8 }), 0.2205);
  front.position.y = 0.21;
  g.add(body, front);
  return shadow(g);
}

export function crt(seed = 2) {
  const g = new Group();
  const mat = plastic("#c3c1b9", seed);
  const bezel = new Mesh(rbox(0.42, 0.38, 0.07, 0.02), mat);
  bezel.position.set(0, 0.19, 0.0);
  const rearGeo = new CylinderGeometry(0.15, 0.27, 0.34, 4, 1);
  rearGeo.rotateY(Math.PI / 4);
  const rear = new Mesh(rearGeo, mat);
  rear.rotation.x = -HALF;
  rear.scale.set(1.0, 1, 0.9);
  rear.position.set(0, 0.18, -0.2);
  // verre bombé
  const sg = new PlaneGeometry(0.34, 0.27, 24, 24);
  const p = sg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / 0.17, y = p.getY(i) / 0.135;
    p.setZ(i, 0.012 * (1 - 0.5 * (x * x + y * y)));
  }
  sg.computeVertexNormals();
  const glass = new Mesh(sg, new Phys({ color: "#181a18", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  glass.position.set(0, 0.2, 0.034);
  g.add(bezel, rear, glass);
  return shadow(g);
}

export function oldKeyboard(seed = 4) {
  const g = new Group();
  const base = new Mesh(rbox(0.46, 0.028, 0.17, 0.006), plastic("#c7c5bd", seed));
  base.position.y = 0.014;
  const keyGeo = rbox(0.0165, 0.01, 0.0165, 0.002, 1);
  const keys = new THREE.InstancedMesh(keyGeo, plastic("#d2d0c8", seed + 1), 6 * 18);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 18; c++) {
      m.makeTranslation(-0.2 + c * 0.0225 + (r % 2) * 0.004, 0.032, -0.06 + r * 0.0225);
      keys.setMatrixAt(k++, m);
    }
  g.add(base, keys);
  return shadow(g);
}

export function cable(points, r = 0.006) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const m = new Mesh(new THREE.TubeGeometry(curve, 64, r, 8, false), new Std({ color: "#121212", roughness: 0.55 }));
  return shadow(m);
}

// ------------------------------------------------------------------ disque dur 3,5 po (plan signature)
// Repère : y vers le haut, plateau centré en (0, z = −0,022) ; parts.* pour la vue éclatée
export function hdd() {
  const g = new Group();
  const W = 0.1016, L = 0.147, H = 0.026;
  const cast = new Std({ color: "#7a7b78", metalness: 0.85, roughness: 0.52, roughnessMap: TX.grimeTex(256, 9, 0.6) });
  const steel = new Phys({ color: "#d4d4d0", metalness: 1, roughness: 0.18 });
  const parts = {};

  // Châssis (fond + parois)
  const base = new Group();
  const floor = new Mesh(rbox(W, 0.004, L, 0.0015, 2), cast);
  floor.position.y = 0.002;
  base.add(floor);
  for (const [w, d, x, z] of [[0.004, L, W / 2 - 0.002, 0], [0.004, L, -W / 2 + 0.002, 0], [W, 0.004, 0, L / 2 - 0.002], [W, 0.004, 0, -L / 2 + 0.002]]) {
    const wall = new Mesh(rbox(w, H - 0.004, d, 0.001, 1), cast);
    wall.position.set(x, 0.004 + (H - 0.004) / 2, z);
    base.add(wall);
  }
  // fond intérieur légèrement plus sombre, avec bossage du moteur
  const well = new Mesh(new THREE.CircleGeometry(0.049, 64), new Std({ color: "#3d3e3c", metalness: 0.7, roughness: 0.6 }));
  well.rotation.x = -HALF;
  well.position.set(0, 0.0042, -0.022);
  base.add(well);
  parts.base = base;

  // Plateaux (anneau extrudé, UV recalculés pour la carte anisotrope)
  const R = 0.0475, r0 = 0.0125, T = 0.00127;
  const ring = new THREE.Shape();
  ring.absarc(0, 0, R, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, r0, 0, Math.PI * 2, true);
  ring.holes.push(hole);
  const pg = new THREE.ExtrudeGeometry(ring, { depth: T, bevelEnabled: false, curveSegments: 128 });
  pg.rotateX(-HALF);
  {
    const p = pg.attributes.position, uv = pg.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * R) + 0.5, -p.getZ(i) / (2 * R) + 0.5);
  }
  const platterMat = new Phys({
    color: "#dcdcd9", metalness: 1, roughness: 1, roughnessMap: TX.platterRoughTex(),
    anisotropy: 0.9, anisotropyMap: TX.radialAnisoTex(), clearcoat: 0.6, clearcoatRoughness: 0.04,
  });
  parts.platters = [0, 1].map((k) => {
    const pl = new Group();
    const m = new Mesh(pg, platterMat);
    pl.add(m);
    pl.position.set(0, 0.009 + k * 0.0055, -0.022);
    return pl;
  });
  const spacer = new Mesh(new CylinderGeometry(0.0128, 0.0128, 0.0042, 48), steel);
  spacer.position.set(0, 0.0125, -0.022);
  parts.spacer = spacer;

  // Moyeu + bride de serrage à 6 vis (se voit tourner)
  const clamp = new Group();
  const hub = new Mesh(new CylinderGeometry(0.0158, 0.0158, 0.0026, 64), steel);
  clamp.add(hub);
  const cap = new Mesh(new CylinderGeometry(0.0062, 0.0062, 0.0036, 48), new Phys({ color: "#bdbdb9", metalness: 1, roughness: 0.25 }));
  cap.position.y = 0.0008;
  clamp.add(cap);
  const screwGeo = new CylinderGeometry(0.0016, 0.0016, 0.0012, 16);
  const screwMat = new Phys({ color: "#2a2a2a", metalness: 1, roughness: 0.35 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const s = new Mesh(screwGeo, screwMat);
    s.position.set(Math.cos(a) * 0.0108, 0.0016, Math.sin(a) * 0.0108);
    clamp.add(s);
  }
  clamp.position.set(0, 0.0175, -0.022);
  parts.clamp = clamp;

  // Bras de lecture (pivot dans le coin) : bras effilé, tête au bout
  const arm = new Group();
  arm.position.set(0.034, 0.0105, 0.046);
  const bearing = new Mesh(new CylinderGeometry(0.0058, 0.0058, 0.016, 32), steel);
  arm.add(bearing);
  const armShape = new THREE.Shape();
  armShape.moveTo(0, -0.006);
  armShape.lineTo(0.05, -0.0016);
  armShape.lineTo(0.0535, 0);
  armShape.lineTo(0.05, 0.0016);
  armShape.lineTo(0, 0.006);
  armShape.lineTo(-0.008, 0.009);
  armShape.lineTo(-0.02, 0.014);
  armShape.lineTo(-0.024, 0);
  armShape.lineTo(-0.02, -0.014);
  armShape.lineTo(-0.008, -0.009);
  armShape.closePath();
  const armGeo = new THREE.ExtrudeGeometry(armShape, { depth: 0.0009, bevelEnabled: false });
  armGeo.rotateX(-HALF);
  const armMat = new Phys({ color: "#cfcfcb", metalness: 1, roughness: 0.22 });
  for (const y of [-0.0028, 0.0012, 0.0052]) {
    const a = new Mesh(armGeo, armMat);
    a.position.y = y;
    arm.add(a);
    const slider = new Mesh(new BoxGeometry(0.0016, 0.0006, 0.0014), new Std({ color: "#111", roughness: 0.4 }));
    slider.position.set(0.0525, y - 0.0005, 0);
    arm.add(slider);
  }
  // l'armature pointe vers le plateau
  arm.userData.rest = Math.atan2(-0.022 - 0.046, 0 - 0.034) * -1;
  parts.arm = arm;

  // Aimant de la bobine (plaque sombre au-dessus du pivot)
  const magnet = new Mesh(rbox(0.032, 0.0035, 0.026, 0.002, 1), new Phys({ color: "#2b2c2b", metalness: 0.9, roughness: 0.3 }));
  magnet.position.set(0.03, 0.0215, 0.062);
  parts.magnet = magnet;

  // Capot (alu brossé) + étiquette
  const cover = new Group();
  const lid = new Mesh(rbox(W, 0.0009, L, 0.0012, 1), new Phys({ color: "#c8c8c4", metalness: 1, roughness: 0.3 }));
  cover.add(lid);
  const label = new Mesh(new PlaneGeometry(0.07, 0.096), new Std({ map: TX.hddLabelTex(), roughness: 0.75 }));
  label.rotation.x = -HALF;
  label.position.set(0.004, 0.00047, 0.02);
  cover.add(label);
  for (const [x, z] of [[-0.046, -0.068], [0.046, -0.068], [-0.046, 0.068], [0.046, 0.068], [0, -0.022]]) {
    const s = new Mesh(screwGeo, screwMat);
    s.position.set(x, 0.0006, z);
    cover.add(s);
  }
  cover.position.y = H + 0.0005;
  parts.cover = cover;

  // Circuit imprimé sous le châssis
  const pcb = new Mesh(rbox(0.096, 0.0016, 0.122, 0.001, 1), new Std({ map: TX.pcbTex(), roughness: 0.55, metalness: 0.2 }));
  pcb.position.set(0, -0.0012, 0.008);
  parts.pcb = pcb;

  g.add(base, ...parts.platters, spacer, clamp, arm, magnet, cover, pcb);
  for (const [k, v] of Object.entries(parts)) {
    for (const o of Array.isArray(v) ? v : [v]) o.userData.home = o.position.clone();
    void k;
  }
  g.userData = { parts, platterMat, R, center: new THREE.Vector3(0, 0.0175, -0.022) };
  return shadow(g);
}

// Cube noir laqué (compression)
export function blackCube(size = 1) {
  return shadow(new Mesh(rbox(size, size, size, size * 0.018, 4), new Phys({ color: "#070707", metalness: 0.2, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 })));
}

// Environnement « studio sombre » : quelques boîtes à lumière pour les reflets métalliques
export function darkStudioEnv(renderer, strength = 1) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x000000);
  const box = (w, h, x, y, z, ry, rx, I) => {
    const m = new Mesh(new PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(I, I, I), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    s.add(m);
  };
  box(6, 1.2, 0, 5, -1, 0, HALF, 6 * strength); // bande haute
  box(1.0, 5, -6, 1.5, 0, HALF, 0, 4 * strength); // latérale gauche
  box(0.6, 4, 6, 1, -2, -HALF, 0, 2.5 * strength); // latérale droite
  box(8, 0.5, 0, 0.6, -7, 0, 0, 1.6 * strength); // fond
  box(3, 3, 3, 4, 5, Math.PI * 0.8, 0.5, 1.0 * strength);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return env;
}

export function brightStudioEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.85, 0.85, 0.84);
  const box = (w, h, x, y, z, ry, rx, I) => {
    const m = new Mesh(new PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(I, I, I), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    s.add(m);
  };
  // sol plus sombre pour donner du modelé aux métaux
  const floor = new Mesh(new PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.25, 0.25), side: THREE.DoubleSide }));
  floor.rotation.x = -HALF;
  floor.position.y = -3;
  s.add(floor);
  box(8, 3, 0, 6, 0, 0, HALF, 4);
  box(2, 6, -7, 2, 0, HALF, 0, 2.2);
  box(2, 6, 7, 2, 1, -HALF, 0, 1.6);
  for (let i = 0; i < 6; i++) box(0.4, 6, -5 + i * 2, 2, -8, 0, 0, 0.12 + 0.2 * hash(i));
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  return env;
}
