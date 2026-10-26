// Outils communs aux plans : caméra, placement de texte face caméra, lignes, points.
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { fbm1 } from "./ease.js";

export function camera(W, H, fov = 35, near = 0.01, far = 100) {
  return new THREE.PerspectiveCamera(fov, W / H, near, far);
}

// Place la caméra : position, cible, roulis (rad), dérive « à l'épaule » (amplitude en m)
const _v = new THREE.Vector3();
export function aim(cam, pos, target, { roll = 0, drift = 0, t = 0, fov } = {}) {
  cam.position.copy(pos);
  if (drift) cam.position.add(_v.set(fbm1(t * 0.35, 1), fbm1(t * 0.31, 2), fbm1(t * 0.27, 3)).multiplyScalar(drift));
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(target);
  if (fov !== undefined) cam.fov = fov;
  cam.updateProjectionMatrix();
}

// Hauteur / largeur visibles à la distance d
export const frameH = (cam, d) => 2 * d * Math.tan(THREE.MathUtils.DEG2RAD * cam.fov * 0.5);
export const frameW = (cam, d) => frameH(cam, d) * cam.aspect;

// Point du monde situé en (nx, ny) ∈ [−1, 1] de l'écran, à la distance d de la caméra
export function screenPoint(cam, nx, ny, d, out = new THREE.Vector3()) {
  cam.updateMatrixWorld();
  const h = frameH(cam, d) / 2, w = h * cam.aspect;
  out.set(nx * w, ny * h, -d).applyMatrix4(cam.matrixWorld);
  return out;
}

// Projection d'un point du monde en coordonnées écran normalisées (−1..1)
export function project(cam, p, out = new THREE.Vector3()) {
  return out.copy(p).project(cam);
}

// Ligne épaisse (largeur en pixels), révélable par « dash » : setProgress(0..1)
export function fatLine(points, { color = 0x000000, width = 2, W = 1920, H = 1080, opacity = 1, worldUnits = false } = {}) {
  const geo = new LineGeometry();
  geo.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
  const mat = new LineMaterial({ color, linewidth: width, worldUnits, transparent: true, opacity, dashed: true, dashSize: 1e6, gapSize: 1e6, dashOffset: 0 });
  mat.resolution.set(W, H);
  const line = new Line2(geo, mat);
  line.computeLineDistances();
  let total = 0;
  for (let i = 1; i < points.length; i++) total += points[i].distanceTo(points[i - 1]);
  line.userData.total = total;
  line.setProgress = (k) => {
    // tiret de longueur k·total, puis un trou plus long que la ligne
    mat.dashSize = Math.max(1e-6, k * total);
    mat.gapSize = total * 2 + 1;
    line.visible = k > 0.0005;
  };
  line.frustumCulled = false;
  return line;
}

// Disque plat (pastille), toujours face à son groupe parent
export function disc(r, color, segs = 48) {
  return new THREE.Mesh(new THREE.CircleGeometry(r, segs), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
}
export function ring(r0, r1, color, segs = 64) {
  return new THREE.Mesh(new THREE.RingGeometry(r0, r1, segs), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
}

// Trait à extrémités rondes (coche, logo) : chaîne de pastilles instanciées
export function strokePath(points, width, color, { spacing = 0.22 } = {}) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const l = points[i].distanceTo(points[i - 1]);
    seg.push(l);
    total += l;
  }
  const step = width * spacing;
  const n = Math.ceil(total / step) + 1;
  const mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(width / 2, 20), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }), n);
  const pos = [];
  let acc = 0, si = 0;
  for (let k = 0; k < n; k++) {
    const d = Math.min(total, k * step);
    while (si < seg.length - 1 && acc + seg[si] < d) acc += seg[si++];
    const f = seg[si] ? (d - acc) / seg[si] : 0;
    pos.push(points[si].clone().lerp(points[si + 1], f));
  }
  const m = new THREE.Matrix4();
  mesh.setProgress = (p) => {
    const shown = Math.floor(p * (n - 1)) + (p > 0 ? 1 : 0);
    mesh.count = shown;
    for (let k = 0; k < shown; k++) {
      m.makeTranslation(pos[k].x, pos[k].y, pos[k].z);
      mesh.setMatrixAt(k, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = shown > 0;
  };
  mesh.setProgress(0);
  mesh.frustumCulled = false;
  return mesh;
}
