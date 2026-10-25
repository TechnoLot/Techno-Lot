"""
Pose le vrai logo Techno Lot sur le flanc du Sprinter (image de fin de la
vidéo). Le logo n'est jamais généré : on prend la marque et le mot-symbole du
site, on les assemble en version horizontale, on les plaque en perspective sur
la bande basse du flanc, puis on les éclaire comme la carrosserie (lumière
verte ambiante, un peu de grain), pour un lettrage de vinyle et non un
autocollant posé sur la photo.

python3 -I van-lettrage.py <image-camion> <sortie>
"""
import sys

import cv2
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
van = cv2.imread(src).astype(np.float32)
P = "/home/user/Techno-Lot/public/accueil/"
mark = cv2.imread(P + "logo-marque.png", cv2.IMREAD_UNCHANGED).astype(np.float32)
word = cv2.imread(P + "logo-mot.png", cv2.IMREAD_UNCHANGED).astype(np.float32)

# --- logo horizontal : la boucle, puis « TECHNO LOT » à mi-hauteur ---------
mh, mw = mark.shape[:2]
wh = int(round(mh * 0.5))
ww = int(round(word.shape[1] * wh / word.shape[0]))
word = cv2.resize(word, (ww, wh), interpolation=cv2.INTER_AREA)
gap = int(round(mh * 0.18))
W, H = mw + gap + ww, mh
lock = np.zeros((H, W, 4), np.float32)
lock[:, :mw] = mark
y0 = (H - wh) // 2
lock[y0:y0 + wh, mw + gap:] = word

# --- la bande du flanc (pixels de l'image du camion) -----------------------
# Entre la moulure (haut) et le bas de caisse (bas), après la roue arrière ;
# les lignes descendent un peu vers l'avant (perspective mesurée).
top = ((1166, 759), (1500, 767))
bot = ((1166, 841), (1500, 851))


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


# On centre le logo dans la bande en gardant ses proportions, avec une marge.
band_h = ((bot[0][1] - top[0][1]) + (bot[1][1] - top[1][1])) / 2
logo_h = band_h * 0.86
logo_w = logo_h * W / H
band_w = top[1][0] - top[0][0]
t0 = (band_w - logo_w) / 2 / band_w
t1 = 1 - t0
v0 = (1 - 0.86) / 2
v1 = 1 - v0


def at(t, v):
    a = lerp(top[0], top[1], t)
    b = lerp(bot[0], bot[1], t)
    return lerp(a, b, v)


quad = np.float32([at(t0, v0), at(t1, v0), at(t1, v1), at(t0, v1)])
rect = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
M = cv2.getPerspectiveTransform(rect, quad)
h, w = van.shape[:2]
warp = cv2.warpPerspective(lock, M, (w, h), flags=cv2.INTER_AREA, borderValue=(0, 0, 0, 0))
alpha = warp[..., 3:4] / 255.0
col = warp[..., :3]

# --- éclairage : vinyle sous la lumière verte de la cour --------------------
# Un peu plus sombre que l'original, teinté par l'ambiance, plus clair vers le
# haut (les néons du mur sont au-dessus), avec le grain de la photo.
ys = np.arange(h, dtype=np.float32)[:, None, None]
grad = np.clip(1.0 - (ys - quad[:, 1].min()) / max(1.0, float(np.ptp(quad[:, 1]))) * 0.18, 0.78, 1.0)
tint = np.array([0.86, 1.0, 0.88], np.float32)  # BGR : un soupçon de vert
lit = col * 0.74 * grad * tint
rng = np.random.default_rng(5)
lit += rng.normal(0, 3.2, lit.shape).astype(np.float32)
alpha = cv2.GaussianBlur(alpha[..., 0], (0, 0), 0.55)[..., None]
lit = cv2.GaussianBlur(lit, (0, 0), 0.5)
out = van * (1 - alpha) + lit * alpha
cv2.imwrite(dst, np.clip(out, 0, 255).astype(np.uint8))
print("logo posé, quadrilatère :", quad.round(1).tolist())
