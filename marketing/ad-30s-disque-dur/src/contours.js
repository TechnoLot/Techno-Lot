// Contours de glyphes qui se croisent. Certaines polices dessinent d'un seul trait en
// huit le bord d'une boucle et le trou de l'autre (ex. le « 8 » de JetBrains Mono :
// deux contours, chacun « extérieur du bas + trou du haut » ou l'inverse). La
// triangulation de Three.js prend chaque contour pour une surface pleine et bouche les
// trous : on coupe ces contours en boucles simples, puis on rattache chaque trou à la
// plus petite surface pleine qui le contient. Points { x, y }, y vers le haut.

export function area(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

// Point d'intersection propre des segments [a, b] et [c, d], ou null
function hit(a, b, c, d) {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-14) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return null;
  return { x: a.x + t * rx, y: a.y + t * ry };
}

// Boucle fermée (sans répétition du premier point) → boucles simples
export function splitLoop(pts) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // segments voisins par la fermeture
      const x = hit(pts[i], pts[i + 1], pts[j], pts[(j + 1) % n]);
      if (x) return [...splitLoop([x, ...pts.slice(i + 1, j + 1)]), ...splitLoop([x, ...pts.slice(j + 1), ...pts.slice(0, i + 1)])];
    }
  }
  return [pts];
}

// Enroulement non nul d'un point par rapport à une boucle
export function inside(pts, x, y) {
  let w = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const s = (q.x - p.x) * (y - p.y) - (x - p.x) * (q.y - p.y);
    if (p.y <= y) { if (q.y > y && s > 0) w++; }
    else if (q.y <= y && s < 0) w--;
  }
  return w !== 0;
}

// Points d'un contour sans doublons (ni consécutifs, ni de fermeture)
export function cleanLoop(pts) {
  const out = [];
  for (const p of pts) {
    const l = out[out.length - 1];
    if (!l || Math.abs(l.x - p.x) > 1e-9 || Math.abs(l.y - p.y) > 1e-9) out.push(p);
  }
  while (out.length > 1 && Math.abs(out[0].x - out[out.length - 1].x) <= 1e-9 && Math.abs(out[0].y - out[out.length - 1].y) <= 1e-9) out.pop();
  return out;
}

// Boucles simples → [{ outer, holes: [] }] (sens TrueType : horaire = plein)
export function loopsToShapes(loops) {
  const solids = [], holes = [];
  for (const l of loops) if (l.length >= 3 && Math.abs(area(l)) > 1e-9) (area(l) < 0 ? solids : holes).push(l);
  const shapes = solids.map((outer) => ({ outer, holes: [], a: -area(outer) }));
  for (const h of holes) {
    // sommet du milieu : le premier peut être le point de croisement, sur le bord
    const p = h[Math.floor(h.length / 2)];
    let best = null;
    for (const s of shapes) if (inside(s.outer, p.x, p.y) && (!best || s.a < best.a)) best = s;
    if (best) best.holes.push(h);
  }
  return shapes;
}
