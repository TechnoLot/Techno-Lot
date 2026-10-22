// Textures procédurales (canvas 2D) : perforations, claviers, baies, ports,
// poussière, carte de direction anisotrope du plateau. Aucune image externe.
import * as THREE from "three";
import { hash } from "./ease.js";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}
function tex(c, color = true, rep = null) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (rep) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
  }
  t.needsUpdate = true;
  return t;
}
export const MONO = "TLMono";
export const MONO_M = "TLMonoM";
export async function loadCanvasFonts() {
  const f = new FontFace(MONO, "url(assets/fonts/JetBrainsMono-Bold.ttf)");
  document.fonts.add(await f.load());
  const m = new FontFace(MONO_M, "url(assets/fonts/JetBrainsMono-Medium.ttf)");
  document.fonts.add(await m.load());
  const g = new FontFace("TLBlack", "url(assets/fonts/Archivo-XCondBlack.ttf)");
  document.fonts.add(await g.load());
}

// Grain de surface (poussière, salissures) : niveaux de gris, pour roughness/couleur
export function grimeTex(size = 512, seed = 1, contrast = 1) {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const n =
        0.5 * hash(Math.floor(x / 64) * 7.1 + Math.floor(y / 64) * 13.7 + seed) +
        0.3 * hash(Math.floor(x / 16) * 3.3 + Math.floor(y / 16) * 9.1 + seed * 2) +
        0.2 * hash(x * 1.7 + y * 3.1 + seed * 3);
      const v = Math.max(0, Math.min(255, 128 + (n - 0.5) * 200 * contrast));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  // flou léger pour casser le motif
  g.filter = "blur(2px)";
  g.drawImage(c, 0, 0);
  return tex(c, false, [1, 1]);
}

// Perforation hexagonale (façades de serveur / tour) : fond clair, trous sombres
export function perfTex(w = 512, h = 128, r = 5, gap = 3, bg = "#9c9c98", hole = "#0b0b0b") {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = hole;
  const dx = 2 * r + gap, dy = dx * 0.866;
  for (let y = 0, row = 0; y < h + dy; y += dy, row++)
    for (let x = row % 2 ? dx / 2 : 0; x < w + dx; x += dx) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  return tex(c);
}

// Façade de serveur 1U : 8 tiroirs de disques, grille, écran LCD, voyants
export function serverFrontTex() {
  const W = 2048, H = 204;
  const [c, g] = canvas(W, H);
  const metal = g.createLinearGradient(0, 0, 0, H);
  metal.addColorStop(0, "#b8b8b4");
  metal.addColorStop(1, "#8e8e8a");
  g.fillStyle = metal;
  g.fillRect(0, 0, W, H);
  // oreilles de baie
  g.fillStyle = "#6e6e6a";
  g.fillRect(0, 0, 70, H);
  g.fillRect(W - 70, 0, 70, H);
  for (const x of [35, W - 35]) for (const y of [55, 150]) {
    g.fillStyle = "#1a1a1a";
    g.beginPath();
    g.arc(x, y, 13, 0, Math.PI * 2);
    g.fill();
  }
  // tiroirs de disques 2,5 po
  const bx = 110, bw = 150, gap = 10;
  for (let i = 0; i < 8; i++) {
    const x = bx + i * (bw + gap);
    g.fillStyle = "#1b1b1b";
    g.fillRect(x, 22, bw, H - 44);
    g.fillStyle = "#2c2c2c";
    g.fillRect(x + 8, 30, bw - 16, H - 60);
    // poignée et fente d'aération
    g.fillStyle = "#4a4a48";
    g.fillRect(x + 14, H - 58, bw - 28, 14);
    for (let k = 0; k < 6; k++) {
      g.fillStyle = "#101010";
      g.fillRect(x + 18 + k * 20, 44, 10, 70);
    }
  }
  // grille d'aération
  const vx = bx + 8 * (bw + gap) + 20;
  g.fillStyle = "#151515";
  for (let y = 26; y < H - 26; y += 16)
    for (let x = vx + ((y / 16) % 2) * 8; x < vx + 240; x += 16) {
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.fill();
    }
  // écran LCD (zone de zoom du plan « offre »)
  const lx = vx + 270;
  g.fillStyle = "#050505";
  g.fillRect(lx, 40, 200, H - 80);
  // boutons et voyants
  g.fillStyle = "#222";
  g.beginPath();
  g.arc(lx + 250, H / 2, 26, 0, Math.PI * 2);
  g.fill();
  return { map: tex(c), lcd: { u0: lx / W, u1: (lx + 200) / W, v0: 40 / H, v1: (H - 40) / H } };
}

// Voyants (carte d'émission) pour la façade du serveur : vert sur noir
export function serverLedTex() {
  const W = 2048, H = 204;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#5ECB33";
  const bx = 110, bw = 150, gap = 10;
  for (let i = 0; i < 8; i++) {
    const x = bx + i * (bw + gap);
    g.fillRect(x + bw - 30, 34, 10, 10);
  }
  const lx = bx + 8 * (bw + gap) + 20 + 270;
  g.beginPath();
  g.arc(lx + 250, H / 2, 8, 0, Math.PI * 2);
  g.fill();
  return tex(c);
}

// Commutateur : 2 × 12 prises RJ45, 4 cages SFP, voyants
export function switchFrontTex() {
  const W = 2048, H = 204;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#1c1c1c";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#2a2a2a";
  g.fillRect(0, 0, 70, H);
  g.fillRect(W - 70, 0, 70, H);
  const pw = 92, ph = 62;
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 12; i++) {
      const x = 160 + i * (pw + 14) + Math.floor(i / 6) * 30, y = 30 + row * (ph + 18);
      g.fillStyle = "#050505";
      g.fillRect(x, y, pw, ph);
      g.fillStyle = "#3a3a3a";
      g.fillRect(x + 28, row ? y + ph - 14 : y, 36, 14);
      g.fillStyle = "#121212";
      g.fillRect(x + 6, y + 8, pw - 12, ph - 16);
    }
  for (let i = 0; i < 4; i++) {
    g.fillStyle = "#0a0a0a";
    g.fillRect(1560 + i * 100, 60, 84, 70);
    g.fillStyle = "#555";
    g.fillRect(1560 + i * 100, 60, 84, 8);
  }
  return tex(c);
}
export function switchLedTex() {
  const W = 2048, H = 204;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#5ECB33";
  const pw = 92;
  for (let i = 0; i < 12; i++) {
    const x = 160 + i * (pw + 14) + Math.floor(i / 6) * 30;
    if (hash(i * 3.1) > 0.25) g.fillRect(x + 4, 18, 12, 8);
    if (hash(i * 7.3) > 0.3) g.fillRect(x + pw - 16, 178, 12, 8);
  }
  return tex(c);
}

// Clavier (touches sombres sur fond) — portable moderne
export function keyboardTex(bg = "#1a1a1a", key = "#0c0c0c", edge = "#2b2b2b") {
  const W = 1024, H = 420;
  const [c, g] = canvas(W, H);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const rows = [14, 14, 13, 12, 11];
  const kh = 64, gap = 12;
  rows.forEach((n, r) => {
    const kw = (W - 40 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const x = 20 + i * (kw + gap), y = 20 + r * (kh + gap);
      g.fillStyle = edge;
      g.fillRect(x - 1, y - 1, kw + 2, kh + 2);
      g.fillStyle = key;
      g.fillRect(x, y, kw, kh);
    }
  });
  g.fillStyle = edge;
  g.fillRect(250, 20 + 5 * (kh + gap), 520, kh - 8);
  return tex(c);
}

// Façade de vieille tour : baies 5,25 po, lecteur de disquette, bouton
export function oldTowerFrontTex() {
  const W = 512, H = 1024;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#c9c7c0";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) {
    const y = 60 + i * 120;
    g.fillStyle = "#b4b2aa";
    g.fillRect(40, y, W - 80, 100);
    g.fillStyle = "#9e9c94";
    g.fillRect(40, y + 96, W - 80, 4);
    if (i === 0) {
      g.fillStyle = "#3a3a38";
      g.fillRect(90, y + 44, W - 180, 12);
    }
  }
  g.fillStyle = "#b4b2aa";
  g.fillRect(140, 440, 230, 70);
  g.fillStyle = "#2a2a28";
  g.fillRect(160, 470, 190, 8);
  g.fillStyle = "#a9a79f";
  g.beginPath();
  g.arc(W / 2, 640, 40, 0, Math.PI * 2);
  g.fill();
  for (let y = 760; y < H - 40; y += 22) {
    g.fillStyle = "#8c8a83";
    g.fillRect(70, y, W - 140, 9);
  }
  return tex(c);
}

// Écran du portable (moderne) : fond sombre et léger dégradé
export function screenTex(dark = true) {
  const [c, g] = canvas(512, 320);
  const gr = g.createLinearGradient(0, 0, 512, 320);
  gr.addColorStop(0, dark ? "#0d0f0d" : "#e8e8e4");
  gr.addColorStop(1, dark ? "#020302" : "#ffffff");
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 320);
  return tex(c);
}

// Carte de direction anisotrope : brossage circulaire (plateaux de disque dur)
export function radialAnisoTex(size = 512) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size - 0.5, v = (y + 0.5) / size - 0.5;
      const l = Math.hypot(u, v) || 1;
      const tx = -v / l, ty = u / l;
      const i = (y * size + x) * 4;
      data[i] = Math.round((tx * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((ty * 0.5 + 0.5) * 255);
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// Rugosité du plateau : traces concentriques fines + quelques marques (on voit qu'il tourne)
export function platterRoughTex(size = 1024) {
  const [c, g] = canvas(size, size);
  g.fillStyle = "#2a2a2a";
  g.fillRect(0, 0, size, size);
  const cx = size / 2;
  for (let r = size * 0.13; r < size * 0.5; r += 1.5) {
    const v = 30 + 40 * hash(r * 0.37);
    g.strokeStyle = `rgb(${v},${v},${v})`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cx, r, 0, Math.PI * 2);
    g.stroke();
  }
  // marques non symétriques : la rotation se lit dans le reflet
  for (let k = 0; k < 7; k++) {
    const a = hash(k * 9.1) * Math.PI * 2, r = size * (0.2 + 0.25 * hash(k * 4.7));
    g.strokeStyle = "rgba(160,160,160,0.55)";
    g.lineWidth = 3 + 6 * hash(k);
    g.beginPath();
    g.arc(cx, cx, r, a, a + 0.25 + 0.5 * hash(k * 2.3));
    g.stroke();
  }
  return tex(c, false);
}

// Étiquette du disque dur (dessus du capot)
export function hddLabelTex() {
  const W = 512, H = 700;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#e4e4e0";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#111";
  g.font = `bold 44px ${MONO}`;
  g.fillText("HDD 3,5 po", 36, 80);
  g.font = `28px ${MONO}`;
  g.fillText("2 To · 7200 tr/min", 36, 130);
  g.fillText("SATA 6 Gb/s", 36, 170);
  g.fillStyle = "#111";
  for (let i = 0; i < 46; i++) {
    const w = 2 + Math.round(hash(i * 3.7) * 6);
    g.fillRect(36 + i * 9.5, 230, w, 90);
  }
  g.font = `22px ${MONO}`;
  g.fillText("S/N  WX41A7C0Q9", 36, 360);
  g.strokeStyle = "#111";
  g.lineWidth = 3;
  g.strokeRect(36, 400, W - 72, 240);
  g.font = `20px ${MONO}`;
  ["NE PAS OUVRIR", "GARANTIE ANNULÉE", "SI RETIRÉ"].forEach((s, i) => g.fillText(s, 60, 460 + i * 40));
  return tex(c);
}

// Circuit imprimé (sombre) sous le disque
export function pcbTex() {
  const W = 512, H = 700;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#0e0f0e";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "#232523";
  g.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const x = hash(i) * W, y = hash(i + 50) * H;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (hash(i + 7) - 0.5) * 300, y);
    g.lineTo(x + (hash(i + 7) - 0.5) * 300, y + (hash(i + 9) - 0.5) * 300);
    g.stroke();
  }
  g.fillStyle = "#050505";
  g.fillRect(140, 200, 150, 150);
  g.fillRect(320, 420, 110, 110);
  g.fillRect(80, 480, 90, 60);
  g.fillStyle = "#cfcfcb";
  g.font = `18px ${MONO}`;
  g.fillText("U1", 145, 190);
  g.fillText("U4", 325, 410);
  return tex(c);
}
