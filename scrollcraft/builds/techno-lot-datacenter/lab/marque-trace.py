"""
Trace la ligne médiane de la marque du logo (boucle + flèche), pour un
masque SVG qui la « dessine » au défilement. On garde la vraie image du logo :
le masque ne fait que la révéler, donc la marque reste exacte.

Sorties : lab/marque-trace.json (chemins en coordonnées de marque.png) et une
image de contrôle.
"""
import json
import cv2
import numpy as np

m = cv2.imread('proto/marque.png', cv2.IMREAD_UNCHANGED)
a = (m[..., 3] > 127).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(a, 8)
loop = (lab == 1).astype(np.uint8)  # la boucle et la flèche (la plus grande)
dollar = (lab == 2).astype(np.uint8)

def zhang_suen(img):
    img = img.copy().astype(np.uint8)
    changed = True
    while changed:
        changed = False
        for step in (0, 1):
            P = np.pad(img, 1)
            p2, p3, p4 = P[:-2, 1:-1], P[:-2, 2:], P[1:-1, 2:]
            p5, p6, p7 = P[2:, 2:], P[2:, 1:-1], P[2:, :-2]
            p8, p9 = P[1:-1, :-2], P[:-2, :-2]
            nb = [p2, p3, p4, p5, p6, p7, p8, p9]
            B = sum(x.astype(int) for x in nb)
            seq = nb + [p2]
            A = sum(((seq[i] == 0) & (seq[i + 1] == 1)).astype(int) for i in range(8))
            if step == 0:
                c = (p2 * p4 * p6 == 0) & (p4 * p6 * p8 == 0)
            else:
                c = (p2 * p4 * p8 == 0) & (p2 * p6 * p8 == 0)
            rm = (img == 1) & (B >= 2) & (B <= 6) & (A == 1) & c
            if rm.any():
                img[rm] = 0
                changed = True
    return img

sk = zhang_suen(loop)
ys, xs = np.nonzero(sk)
pts = set(zip(xs.tolist(), ys.tolist()))
def nbrs(p):
    x, y = p
    return [(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (x + dx, y + dy) in pts]
deg = {p: len(nbrs(p)) for p in pts}
ends = [p for p, d in deg.items() if d == 1]
print('extrémités', ends)

# Le début : l'extrémité en haut à droite (le bout ouvert de la boucle).
start = min(ends, key=lambda p: (p[1] - 0) ** 2 + (p[0] - 600) ** 2)
# Plus court chemin (BFS) du début à chaque point ; la pointe de la flèche est
# le point de branchement le plus haut sur le côté droit.
from collections import deque
prev = {start: None}
dq = deque([start])
while dq:
    p = dq.popleft()
    for q in nbrs(p):
        if q not in prev:
            prev[q] = p
            dq.append(q)
def path_to(t):
    out = []
    while t is not None:
        out.append(t)
        t = prev[t]
    return out[::-1]
# Les deux barbes de la flèche : les chemins vers leurs extrémités partagent
# la boucle et la tige ; ils se séparent à la pointe de la flèche.
others = [e for e in ends if e != start]
paths = [path_to(e) for e in others]
k = 0
while all(k < len(pp) for pp in paths) and len({pp[k] for pp in paths}) == 1:
    k += 1
main = paths[0][:k]
barbs = [pp[k - 1:] for pp in paths]
print('pointe', main[-1], 'longueur principale', len(main), ' barbes', [len(b) for b in barbs])

def rdp(points, eps):
    pts_ = np.array(points, float)
    def rec(lo, hi):
        if hi <= lo + 1:
            return [lo, hi]
        a_, b_ = pts_[lo], pts_[hi]
        d = b_ - a_
        nrm = np.hypot(*d) or 1
        v = pts_[lo + 1:hi] - a_
        dist = np.abs(d[0] * v[:, 1] - d[1] * v[:, 0]) / nrm
        i = int(dist.argmax())
        if dist[i] > eps:
            left = rec(lo, lo + 1 + i)
            return left[:-1] + rec(lo + 1 + i, hi)
        return [lo, hi]
    idx = rec(0, len(pts_) - 1)
    return [tuple(map(int, pts_[i])) for i in idx]

main_s = rdp(main, 1.2)
barbs_s = [rdp(b, 1.2) for b in barbs]
ys, xs = np.nonzero(dollar)
out = {
    "w": int(m.shape[1]), "h": int(m.shape[0]),
    "stroke": round(float(cv2.distanceTransform(loop, cv2.DIST_L2, 5)[loop > 0].max()) * 2, 1),
    "main": main_s, "barbs": barbs_s,
    "dollar": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
}
json.dump(out, open('marque-trace.json', 'w'))
print('points :', len(main_s), [len(b) for b in barbs_s], 'trait', out['stroke'], '$', out['dollar'])

vis = cv2.cvtColor(a * 80, cv2.COLOR_GRAY2BGR)
cv2.polylines(vis, [np.array(main_s, np.int32)], False, (0, 0, 255), 2)
for b in barbs_s:
    cv2.polylines(vis, [np.array(b, np.int32)], False, (255, 0, 0), 2)
cv2.circle(vis, start, 8, (0, 255, 0), -1)
cv2.imwrite('/tmp/claude-0/-home-user-Techno-Lot/4f3b296c-1dec-51e7-be29-11572255c5d8/scratchpad/v2/marque-trace.png', vis)
