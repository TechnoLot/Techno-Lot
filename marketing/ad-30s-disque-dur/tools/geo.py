"""Contour du Québec (Natural Earth 1:50 M, domaine public) → assets/quebec.json.

Projection conique conforme de Lambert « Québec Lambert » (EPSG:32198 : parallèles 46° et 60°,
origine 44° N, méridien central −68,5°), simplification Douglas-Peucker, coordonnées
normalisées : x vers l'est, y vers le nord, la hauteur du territoire vaut 2.

Usage : venv/Scripts/python -I -X utf8 tools/geo.py <ne_50m_admin_1.geojson> assets/quebec.json
"""
import json
import math
import sys

src, dst = sys.argv[1], sys.argv[2]
fc = json.load(open(src, encoding="utf-8"))
qc = next(f for f in fc["features"] if f["properties"].get("iso_3166_2") == "CA-QC")

P1, P2, P0, L0 = (math.radians(v) for v in (46, 60, 44, -68.5))
n = math.log(math.cos(P1) / math.cos(P2)) / math.log(math.tan(math.pi / 4 + P2 / 2) / math.tan(math.pi / 4 + P1 / 2))
F = math.cos(P1) * math.tan(math.pi / 4 + P1 / 2) ** n / n
R0 = F / math.tan(math.pi / 4 + P0 / 2) ** n


def proj(lon, lat):
    r = F / math.tan(math.pi / 4 + math.radians(lat) / 2) ** n
    a = n * (math.radians(lon) - L0)
    return r * math.sin(a), R0 - r * math.cos(a)


def area(ring):
    return 0.5 * sum(ring[i][0] * ring[i - 1][1] - ring[i - 1][0] * ring[i][1] for i in range(len(ring)))


def dp(pts, eps):
    """Douglas-Peucker itératif."""
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = pts[a], pts[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-12
        best, bi = 0, -1
        for i in range(a + 1, b):
            d = abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / L
            if d > best:
                best, bi = d, i
        if best > eps:
            keep[bi] = True
            stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]


polys = qc["geometry"]["coordinates"] if qc["geometry"]["type"] == "MultiPolygon" else [qc["geometry"]["coordinates"]]
rings = [[proj(lon, lat) for lon, lat in poly[0]] for poly in polys]
rings.sort(key=lambda r: -abs(area(r)))
xs = [p[0] for p in rings[0]]
ys = [p[1] for p in rings[0]]
cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
s = 2 / (max(ys) - min(ys))
big = abs(area(rings[0]))
out = []
for r in rings:
    if abs(area(r)) < big * 0.0015:  # garde le continent, Anticosti, les Îles-de-la-Madeleine…
        continue
    ring = [((x - cx) * s, (y - cy) * s) for x, y in r]
    # Anneau fermé : on le coupe au point le plus éloigné du départ avant de simplifier
    m = max(range(len(ring)), key=lambda i: math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]))
    pts = dp(ring[: m + 1], 0.0022)[:-1] + dp(ring[m:], 0.0022)
    out.append([[round(x, 4), round(y, 4)] for x, y in pts])

CITIES = {
    "Mascouche": (-73.601, 45.746), "Montréal": (-73.567, 45.502), "Québec": (-71.208, 46.814),
    "Gatineau": (-75.701, 45.477), "Sherbrooke": (-71.893, 45.404), "Trois-Rivières": (-72.543, 46.343),
    "Saguenay": (-71.069, 48.428), "Rimouski": (-68.523, 48.449), "Rouyn-Noranda": (-79.023, 48.237),
    "Sept-Îles": (-66.381, 50.212), "Gaspé": (-64.487, 48.832), "Val-d'Or": (-77.783, 48.098),
    "Chibougamau": (-74.367, 49.917), "Baie-Comeau": (-68.150, 49.222), "Drummondville": (-72.483, 45.883),
    "Alma": (-71.650, 48.550), "Matane": (-67.533, 48.850), "Saint-Jérôme": (-74.003, 45.780),
}
cities = {}
for k, (lon, lat) in CITIES.items():
    x, y = proj(lon, lat)
    cities[k] = [round((x - cx) * s, 4), round((y - cy) * s, 4)]

# Grand Montréal, Laurentides, Rive-Sud : villes et cours d'eau (tracés à la main,
# précision ~2 km, suffisante à cette échelle), même projection et même normalisation.
METRO_CITIES = {
    "Montréal": (-73.567, 45.502), "Laval": (-73.730, 45.570), "Longueuil": (-73.518, 45.531),
    "Brossard": (-73.466, 45.458), "Terrebonne": (-73.648, 45.701), "Repentigny": (-73.450, 45.742),
    "Saint-Jérôme": (-74.004, 45.780), "Blainville": (-73.880, 45.673), "Saint-Eustache": (-73.906, 45.565),
    "Mirabel": (-74.086, 45.650), "Boucherville": (-73.436, 45.591), "Châteauguay": (-73.749, 45.380),
    "Vaudreuil-Dorion": (-74.033, 45.400), "Saint-Jean-sur-Richelieu": (-73.263, 45.307), "Mascouche": (-73.601, 45.746),
}
METRO_RIVERS = {
    "Saint-Laurent": [(-74.40, 45.20), (-74.17, 45.26), (-74.02, 45.34), (-73.92, 45.39), (-73.80, 45.41), (-73.68, 45.42),
                      (-73.60, 45.43), (-73.54, 45.48), (-73.53, 45.52), (-73.50, 45.58), (-73.47, 45.63), (-73.43, 45.69),
                      (-73.35, 45.77), (-73.25, 45.86), (-73.15, 45.97), (-73.11, 46.04)],
    "Outaouais": [(-74.50, 45.58), (-74.38, 45.56), (-74.20, 45.50), (-74.05, 45.47), (-73.95, 45.455), (-73.92, 45.42), (-73.92, 45.39)],
    "Rivière des Prairies": [(-73.89, 45.49), (-73.82, 45.51), (-73.75, 45.53), (-73.68, 45.57), (-73.62, 45.60), (-73.55, 45.65),
                             (-73.50, 45.68), (-73.47, 45.70)],
    "Rivière des Mille Îles": [(-73.90, 45.53), (-73.83, 45.57), (-73.78, 45.60), (-73.70, 45.63), (-73.64, 45.66), (-73.56, 45.69),
                               (-73.50, 45.71), (-73.47, 45.72)],
    "Richelieu": [(-73.11, 46.04), (-73.13, 45.95), (-73.17, 45.85), (-73.20, 45.73), (-73.21, 45.60), (-73.25, 45.45),
                  (-73.26, 45.31), (-73.27, 45.15)],
}
norm = lambda lon, lat: [round((proj(lon, lat)[0] - cx) * s, 5), round((proj(lon, lat)[1] - cy) * s, 5)]
metro = {
    "cities": {k: norm(*v) for k, v in METRO_CITIES.items()},
    "rivers": {k: [norm(lon, lat) for lon, lat in pts] for k, pts in METRO_RIVERS.items()},
}
w = (max(xs) - min(xs)) * s
json.dump({"aspect": round(w / 2, 4), "rings": out, "cities": cities, "metro": metro}, open(dst, "w", encoding="utf-8"), ensure_ascii=False)
print(f"{len(out)} contours, points : {[len(r) for r in out]}, largeur/hauteur = {w / 2:.3f}")
