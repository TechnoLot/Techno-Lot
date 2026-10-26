// Registre d'inventaire d'une entreprise (le « lot ») : tableau monospace dessiné
// en texture, posé sur un plan. Un seul shader gère l'apparition des lignes, la
// sélection « tout le lot » (fond vert), et l'évaluation (✓ + valeur) révélée
// par le balayage laser. Sert à l'ouverture et au temps « ÉVALUATION GRATUITE ».
import * as THREE from "three";
import { MONO, MONO_M } from "./textures.js";
import { C } from "./palette.js";

// Article, quantité, état — neuf ET usagé, de tout ce qui est informatique ou électronique
const ITEMS = [
  ["PORTABLE 14 PO", 18, "USAGÉ"], ["PORTABLE 15 PO", 12, "NEUF"], ["ÉCRAN 24 PO", 20, "USAGÉ"], ["ÉCRAN 27 PO", 8, "NEUF"],
  ["TOUR DE BUREAU", 16, "USAGÉ"], ["MINI-PC", 10, "NEUF"], ["SERVEUR 1U", 3, "USAGÉ"], ["SERVEUR 2U", 2, "USAGÉ"],
  ["COMMUTATEUR 48 PORTS", 4, "USAGÉ"], ["ROUTEUR", 3, "NEUF"], ["BORNE WI-FI", 9, "USAGÉ"], ["CELLULAIRE", 25, "NEUF"],
  ["TABLETTE", 11, "USAGÉ"], ["TÉLÉPHONE IP", 30, "USAGÉ"], ["IMPRIMANTE LASER", 5, "USAGÉ"], ["STATION D'ACCUEIL", 22, "NEUF"],
  ["CLAVIER", 40, "NEUF"], ["SOURIS", 40, "NEUF"], ["CASQUE D'ÉCOUTE", 18, "NEUF"], ["DISQUE DUR 2 TO", 36, "USAGÉ"],
  ["SSD 1 TO", 24, "NEUF"], ["BARRETTE MÉMOIRE", 48, "USAGÉ"], ["ONDULEUR", 4, "USAGÉ"], ["PROJECTEUR", 3, "USAGÉ"],
  ["TÉLÉVISEUR 65 PO", 2, "NEUF"], ["CAMÉRA IP", 12, "NEUF"], ["CÂBLE RÉSEAU", 120, "NEUF"], ["CARTE GRAPHIQUE", 6, "USAGÉ"],
  ["PROCESSEUR", 14, "USAGÉ"], ["BLOC D'ALIMENTATION", 16, "USAGÉ"], ["NUMÉRISEUR", 2, "USAGÉ"], ["CONSOLE DE JEU", 4, "NEUF"],
  ["PORTABLE 13 PO", 9, "NEUF"], ["ÉCRAN 32 PO", 6, "USAGÉ"], ["TOUR DE BUREAU", 21, "USAGÉ"], ["CELLULAIRE", 14, "USAGÉ"],
  ["TABLETTE", 8, "NEUF"], ["BAIE DE STOCKAGE", 1, "USAGÉ"], ["PARE-FEU", 2, "USAGÉ"], ["COMMUTATEUR 24 PORTS", 6, "NEUF"],
  ["WEBCAM", 15, "NEUF"], ["HAUT-PARLEUR", 10, "NEUF"], ["CHARGEUR USB-C", 60, "NEUF"], ["ADAPTATEUR HDMI", 35, "NEUF"],
  ["LECTEUR CODE-BARRES", 7, "USAGÉ"], ["TERMINAL DE PAIEMENT", 5, "USAGÉ"], ["PORTABLE 16 PO", 7, "USAGÉ"], ["ÉCRAN 22 PO", 12, "USAGÉ"],
  ["DISQUE DUR 4 TO", 18, "NEUF"], ["SSD 512 GO", 30, "USAGÉ"], ["BARRETTE MÉMOIRE", 32, "NEUF"], ["IMPRIMANTE MULTIFONCTION", 3, "USAGÉ"],
  ["TÉLÉPHONE IP", 18, "NEUF"], ["STATION D'ACCUEIL", 12, "USAGÉ"], ["MONTRE CONNECTÉE", 6, "NEUF"], ["LIVRE NUMÉRIQUE", 4, "NEUF"],
  ["SERVEUR LAME", 4, "USAGÉ"], ["CARTE RÉSEAU", 20, "USAGÉ"], ["ROUTEUR", 2, "USAGÉ"], ["MICRO-CASQUE", 25, "NEUF"],
  ["CLAVIER", 28, "USAGÉ"], ["SOURIS", 31, "USAGÉ"], ["TÉLÉVISEUR 55 PO", 3, "USAGÉ"], ["PORTABLE 14 PO", 15, "NEUF"],
];
export const ROWS = 32; // lignes par colonne (deux colonnes)
const TW = 4096, TH = 2048;
const HEAD = 96; // en-tête de chaque colonne (px de texture)
const ROW_H = (TH - HEAD) / ROWS;

function draw(evaluated) {
  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const g = c.getContext("2d");
  g.clearRect(0, 0, TW, TH);
  g.fillStyle = "#fff";
  g.textBaseline = "middle";
  for (let col = 0; col < 2; col++) {
    const x0 = col * (TW / 2) + 70;
    if (!evaluated) {
      g.globalAlpha = 1;
      g.font = `36px ${MONO}`;
      g.fillText("N°", x0, HEAD / 2);
      g.fillText("ARTICLE", x0 + 170, HEAD / 2);
      g.fillText("QTÉ", x0 + 1110, HEAD / 2);
      g.fillText("ÉTAT", x0 + 1290, HEAD / 2);
      g.globalAlpha = 0.35;
      g.fillRect(x0 - 20, HEAD - 4, TW / 2 - 100, 3);
    }
    for (let r = 0; r < ROWS; r++) {
      const i = col * ROWS + r;
      const [name, qty, state] = ITEMS[i % ITEMS.length];
      const y = HEAD + (r + 0.5) * ROW_H;
      if (!evaluated) {
        g.globalAlpha = 0.55;
        g.font = `34px ${MONO_M}`;
        g.fillText(String(i + 1).padStart(4, "0"), x0, y);
        g.globalAlpha = 1;
        g.font = `38px ${MONO}`;
        g.fillText(name, x0 + 170, y);
        g.font = `38px ${MONO_M}`;
        g.fillText(`×${qty}`, x0 + 1110, y);
        g.globalAlpha = state === "NEUF" ? 1 : 0.6;
        g.font = `34px ${MONO}`;
        g.fillText(state, x0 + 1290, y);
        g.globalAlpha = 0.12;
        g.fillRect(x0 - 20, HEAD + (r + 1) * ROW_H - 1, TW / 2 - 100, 2);
      } else {
        // évaluation : crochet + valeur, colonne de droite
        g.globalAlpha = 1;
        g.font = `38px ${MONO}`;
        const v = Math.round((40 + ((i * 7919) % 260)) * Math.max(1, qty / 6) / 10) * 10;
        g.fillText(`✓ ${v.toLocaleString("fr-CA").replace(/ | /g, " ")} $`, x0 + 1560, y);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 16;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

const VS = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FS = /* glsl */ `
uniform sampler2D uBase, uEval;
uniform float uRows, uHead, uIn, uSel, uLaser, uLaserOn, uFade;
uniform vec3 uText, uGreen, uBg, uSelBg;
varying vec2 vUv;
void main() {
  float yTex = (1.0 - vUv.y);                 // 0 en haut
  float row = floor((yTex - uHead) / ((1.0 - uHead) / uRows));
  float col = step(0.5, vUv.x);
  float idx = row + col * uRows;              // 0 … 2·rows−1 (−1 : en-tête)
  float total = 2.0 * uRows;
  float a = texture2D(uBase, vUv).a;
  // les lignes se remplissent (de haut en bas, colonne de gauche puis de droite)
  float vis = row < 0.0 ? step(0.02, uIn) : 1.0 - smoothstep(-1.0, 0.0, idx - uIn * total);
  // « tout le lot » : chaque ligne passe au vert, en vague
  float sel = row < 0.0 ? 0.0 : 1.0 - smoothstep(-2.0, 0.0, idx - uSel * total);
  vec3 bg = mix(uBg, uSelBg, sel * vis);
  vec3 txt = mix(uText, uGreen * 1.1, sel); // lignes sélectionnées : texte vert
  vec3 c = bg + txt * a * vis;
  // évaluation : ✓ + valeur révélés derrière le laser
  float e = texture2D(uEval, vUv).a * step(vUv.x, uLaser);
  c += uGreen * e * 1.25;
  // trace du laser sur la feuille
  float d = abs(vUv.x - uLaser);
  c += uGreen * (exp(-d * d / 0.0000035) * 5.0 + exp(-d * d / 0.0004) * 0.5) * uLaserOn;
  gl_FragColor = vec4(c * uFade, 1.0);
}`;

export function makeInventory({ width = 8, depthFade = true } = {}) {
  const height = width * (TH / TW);
  const uniforms = {
    uBase: { value: draw(false) },
    uEval: { value: draw(true) },
    uRows: { value: ROWS },
    uHead: { value: HEAD / TH },
    uIn: { value: 0 },
    uSel: { value: 0 },
    uLaser: { value: -1 },
    uLaserOn: { value: 0 },
    uFade: { value: 1 },
    uText: { value: new THREE.Color().copy(C.white).multiplyScalar(0.62) },
    uGreen: { value: new THREE.Color().copy(C.green) },
    uBg: { value: new THREE.Color(0.006, 0.006, 0.006) },
    uSelBg: { value: new THREE.Color().copy(C.green).multiplyScalar(0.07) },
  };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms }));
  mesh.userData = { uniforms, width, height };
  void depthFade;
  return mesh;
}
