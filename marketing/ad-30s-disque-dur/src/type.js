// Typographie en vraie géométrie : chaque glyphe est un maillage plat tiré du
// contour vectoriel de la police (crénage GPOS appliqué). Le texte vit dans la
// scène 3D : il reçoit la profondeur de champ, le flou de bougé, et la caméra
// peut passer à travers les lettres sans aucune perte de netteté.
import * as THREE from "three";
import opentype from "opentype";
import { area, cleanLoop, splitLoop, loopsToShapes } from "./contours.js";

export const FONTS = {};
const FILES = {
  black: "Archivo-XCondBlack.ttf", // grotesque condensée ultra-grasse (titres)
  bold: "Archivo-CondBold.ttf",
  mono: "JetBrainsMono-Medium.ttf", // données
  monoBold: "JetBrainsMono-Bold.ttf",
};

export async function loadFonts(base = "assets/fonts/") {
  await Promise.all(
    Object.entries(FILES).map(async ([k, f]) => {
      const buf = await (await fetch(base + f)).arrayBuffer();
      FONTS[k] = opentype.parse(buf);
    })
  );
}

const geoCache = new Map();
function glyphGeometry(fontKey, glyph, segs) {
  const key = `${fontKey}:${glyph.index}:${segs}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const sp = new THREE.ShapePath();
  for (const c of glyph.getPath(0, 0, 1).commands) {
    if (c.type === "M") sp.moveTo(c.x, -c.y);
    else if (c.type === "L") sp.lineTo(c.x, -c.y);
    else if (c.type === "Q") sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
    else if (c.type === "C") sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
  }
  // Contours dont le croisement forme un trou (« 8 » de JetBrains Mono) : boucles
  // simples, sinon toShapes() bouche les trous. Les autres glyphes ne changent pas.
  const loops = sp.subPaths.map((p) => cleanLoop(p.getPoints(segs)));
  const split = loops.map(splitLoop);
  const shapes = split.some((s) => s.length > 1 && s.some((l) => area(l) > 0))
    ? loopsToShapes(split.flat()).map(({ outer, holes }) => {
        const s = new THREE.Shape(outer);
        s.holes = holes.map((h) => new THREE.Path(h));
        return s;
      })
    : sp.toShapes(false);
  const geo = sp.subPaths.length ? new THREE.ShapeGeometry(shapes, segs) : new THREE.BufferGeometry();
  geoCache.set(key, geo);
  return geo;
}

export function metrics(fontKey) {
  const f = FONTS[fontKey];
  const os2 = f.tables.os2;
  return { cap: (os2.sCapHeight || 0.7 * f.unitsPerEm) / f.unitsPerEm, xh: (os2.sxHeight || 0.5 * f.unitsPerEm) / f.unitsPerEm };
}

// Contre-forme d'un glyphe (le plus petit contour fermé, ex. l'intérieur du « O »),
// en em, repère y vers le haut : { cx, cy, rx, ry }
export function glyphHole(fontKey, ch) {
  const g = FONTS[fontKey].charToGlyph(ch);
  const subs = [];
  let cur = null;
  for (const c of g.getPath(0, 0, 1).commands) {
    if (c.type === "M") subs.push((cur = []));
    if (c.x !== undefined) cur.push([c.x, -c.y]);
  }
  const box = (pts) => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  const boxes = subs.map(box).sort((a, b) => (a[2] - a[0]) * (a[3] - a[1]) - (b[2] - b[0]) * (b[3] - b[1]));
  const [x0, y0, x1, y1] = boxes[0];
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, adv: g.advanceWidth / FONTS[fontKey].unitsPerEm };
}

// Mesure sans construire (pour la mise en page)
export function measure(fontKey, str, size = 1, tracking = 0) {
  const f = FONTS[fontKey];
  const gs = f.stringToGlyphs(str);
  let x = 0;
  for (let i = 0; i < gs.length; i++) {
    x += gs[i].advanceWidth / f.unitsPerEm;
    if (i < gs.length - 1) x += f.getKerningValue(gs[i], gs[i + 1]) / f.unitsPerEm + tracking;
  }
  return x * size;
}

// Ligne de texte : un groupe, un maillage par glyphe (pivot au centre du glyphe).
//   size     : corps (em) en unités monde
//   tracking : interlettrage en em
//   align    : "left" | "center" | "right"
export class Text extends THREE.Group {
  constructor(fontKey, str, { size = 1, color = 0xf2f2ee, opacity = 1, tracking = 0, align = "left", segs = 10, lit = false, additive = false, depthWrite = true } = {}) {
    super();
    const f = FONTS[fontKey];
    this.str = str;
    this.size = size;
    const m = metrics(fontKey);
    this.cap = m.cap * size;
    const gs = f.stringToGlyphs(str);
    const chars = [...str];
    let x = 0;
    const items = [];
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i];
      const adv = (g.advanceWidth / f.unitsPerEm) * size;
      items.push({ g, x, adv, ch: chars[i] ?? "" });
      x += adv;
      if (i < gs.length - 1) x += (f.getKerningValue(g, gs[i + 1]) / f.unitsPerEm + tracking) * size;
    }
    this.width = x;
    const shift = align === "center" ? -x / 2 : align === "right" ? -x : 0;
    const Mat = lit ? THREE.MeshStandardMaterial : THREE.MeshBasicMaterial;
    this.glyphs = items.map((it, i) => {
      const mat = new Mat({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        ...(lit ? { roughness: 0.6, metalness: 0 } : {}),
      });
      const geo = glyphGeometry(fontKey, it.g, segs);
      const mesh = new THREE.Mesh(geo, mat);
      // Pivot au centre de la chasse et de la hauteur de capitale
      mesh.geometry = geo;
      const pivot = new THREE.Group();
      mesh.position.set(-it.adv / 2, -this.cap / 2, 0);
      mesh.scale.setScalar(size);
      pivot.add(mesh);
      pivot.position.set(shift + it.x + it.adv / 2, this.cap / 2, 0);
      pivot.userData = { base: pivot.position.clone(), adv: it.adv, ch: it.ch, i, mesh };
      this.add(pivot);
      return pivot;
    });
    this.left = shift;
    this.clipPlanes = null;
  }

  // Couleur / opacité de toute la ligne
  setColor(c) {
    for (const g of this.glyphs) g.userData.mesh.material.color.set(c);
  }
  setOpacity(o) {
    for (const g of this.glyphs) g.userData.mesh.material.opacity = o;
  }

  // Fenêtre de révélation (repère local) : seul ce qui est dans [x0, x1] × [y0, y1] est visible
  setClip(y0, y1, x0 = -1e6, x1 = 1e6) {
    if (!this.clipPlanes) {
      this.clipPlanes = [new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane()];
      for (const g of this.glyphs) g.userData.mesh.material.clippingPlanes = this.clipPlanes;
    }
    this.clipY = [y0, y1];
    this.clipX = [x0, x1];
  }
  setClipX(x0, x1) {
    if (!this.clipPlanes) this.setClip(-1e6, 1e6);
    this.clipX = [x0, x1];
  }
  updateClip() {
    if (!this.clipPlanes) return;
    this.updateWorldMatrix(true, false); // parents compris : sinon plans faux à la première image
    const m = this.matrixWorld;
    const up = new THREE.Vector3().setFromMatrixColumn(m, 1).normalize();
    const right = new THREE.Vector3().setFromMatrixColumn(m, 0).normalize();
    const at = (x, y) => new THREE.Vector3(x, y, 0).applyMatrix4(m);
    this.clipPlanes[0].setFromNormalAndCoplanarPoint(up, at(0, this.clipY[0]));
    this.clipPlanes[1].setFromNormalAndCoplanarPoint(up.clone().negate(), at(0, this.clipY[1]));
    this.clipPlanes[2].setFromNormalAndCoplanarPoint(right, at(this.clipX[0], 0));
    this.clipPlanes[3].setFromNormalAndCoplanarPoint(right.clone().negate(), at(this.clipX[1], 0));
  }
}

// Bloc de lignes (interlignage en multiples de la hauteur de capitale)
export function textBlock(fontKey, lines, { size = 1, leading = 1.18, align = "left", ...opts } = {}) {
  const g = new THREE.Group();
  g.lines = lines.map((s, i) => {
    const t = new Text(fontKey, s, { size, align, ...opts });
    t.position.y = -i * t.cap * leading;
    g.add(t);
    return t;
  });
  g.cap = g.lines[0]?.cap ?? 0;
  g.height = g.cap + (lines.length - 1) * g.cap * leading;
  g.width = Math.max(...g.lines.map((l) => l.width));
  return g;
}
