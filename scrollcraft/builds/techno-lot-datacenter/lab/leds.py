"""
Extraction des voyants de la photo de l'allée.

Entrée : une image de l'allée (photo maîtresse ou première image de la vidéo).
Sorties, dans le dossier donné :
  - <nom>-dark.png   : la même image, voyants effacés (plaque sombre)
  - <nom>-leds.png   : la lumière des voyants seule (image - plaque), sur noir
  - <nom>-leds.json  : un voyant par pic : centre, rayon, contraste, boîte de
                       son empreinte dans <nom>-leds.png
  - <nom>-mask.png   : le masque d'effacement (contrôle visuel)

Principe : un voyant est un PIC, pas une région. Deux passes, chacune avec
son propre fond local (ouverture morphologique juste plus large que les
voyants qu'elle cherche) :
  - petits voyants, partout : fond pris à ~9 px, rayon plafonné à ~6 px ;
  - grosses taches floues des baies proches, seulement loin du point de
    fuite (au fond, les faces de baies texturées tromperaient un grand fond).
On garde les maxima locaux nettement plus clairs que leur fond ; le rayon est
le premier anneau dont le 30e centile retombe sous 35 % du pic (le centile,
pas la moyenne, pour que les voisins serrés ne gonflent pas la mesure). Un
pic compte s'il est vert OU très clair (coeurs presque blancs des voyants
proches).

python3 -I leds.py <image> <dossier-sortie> <nom>
"""
import json
import sys

import cv2
import numpy as np

src, outdir, name = sys.argv[1], sys.argv[2], sys.argv[3]
img = cv2.imread(src, cv2.IMREAD_COLOR)
h, w = img.shape[:2]
s = w / 2720.0  # réglages faits sur la photo de 2720 px
VPX = 1368 * s


def disc(d):
    d = max(3, int(round(d * s)) | 1)
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (d, d))


f = img.astype(np.float32)
b, g, r = f[..., 0], f[..., 1], f[..., 2]
lum = 0.2 * r + 0.6 * g + 0.2 * b
lum_s = cv2.GaussianBlur(lum, (0, 0), 0.9 * s)
colour_ok = ((g > r * 1.08) & (g > b * 0.95)) | (lum > 165)
xs_all = np.arange(w)[None, :].repeat(h, 0)


def detect(open_d, thr, rmax, region):
    bg = cv2.morphologyEx(lum_s, cv2.MORPH_OPEN, disc(open_d))
    bg = cv2.GaussianBlur(bg, (0, 0), max(1.0, open_d * s / 10))
    c = lum_s - bg
    pk = (c >= cv2.dilate(c, disc(5))) & (c > thr) & colour_ok & region
    ys, xs = np.nonzero(pk)
    order = np.argsort(-c[ys, xs])
    rmax = max(2, int(round(rmax * s)))
    yy, xx = np.mgrid[-rmax:rmax + 1, -rmax:rmax + 1]
    dist = np.sqrt(yy * yy + xx * xx)
    rings = [(dist >= k - 0.5) & (dist < k + 0.5) for k in range(rmax + 1)]
    cpad = cv2.copyMakeBorder(c, rmax, rmax, rmax, rmax, cv2.BORDER_REFLECT)
    out = []
    for y, x in zip(ys[order], xs[order]):
        p = float(c[y, x])
        win = cpad[y:y + 2 * rmax + 1, x:x + 2 * rmax + 1]
        rad = None
        for k in range(1, rmax + 1):
            if np.percentile(win[rings[k]], 30) < 0.35 * p:
                rad = k
                break
        if rad is None:  # pas un point : un dégradé large (brume, reflet)
            continue
        out.append((float(x), float(y), float(rad), p))
    return out


far = np.abs(xs_all - VPX) > 560 * s
cands = detect(55, 30, 26, far) + detect(9, 10, 6, np.ones((h, w), bool))

# Un seul enregistrement par voyant : les plus gros d'abord, puis tout pic qui
# tombe dans un voyant déjà retenu est écarté.
cands.sort(key=lambda t: (-t[2], -t[3]))
taken = np.zeros((h, w), np.uint8)
leds = []
for x, y, rad, p in cands:
    if taken[int(y), int(x)]:
        continue
    cv2.circle(taken, (int(x), int(y)), int(rad * 1.6 + 2), 1, -1)
    leds.append((x, y, rad, p))

# Masque d'effacement : un disque par voyant, halo compris.
mask = np.zeros((h, w), np.uint8)
for x, y, rad, p in leds:
    cv2.circle(mask, (int(round(x)), int(round(y))), int(round(rad * 1.9 + 2 * s + 1)), 255, -1)
dark = cv2.inpaint(img, mask, 4, cv2.INPAINT_TELEA)

light = np.clip(f - dark.astype(np.float32), 0, 255) * (mask[..., None] / 255.0)
cv2.imwrite(f"{outdir}/{name}-dark.png", dark)
cv2.imwrite(f"{outdir}/{name}-leds.png", light.astype(np.uint8))
cv2.imwrite(f"{outdir}/{name}-mask.png", mask)

out = []
for x, y, rad, p in leds:
    R = int(round(rad * 1.9 + 2 * s + 1))
    bx, by = max(0, int(x) - R), max(0, int(y) - R)
    out.append({
        "x": round(x, 1), "y": round(y, 1), "r": round(rad, 1), "p": round(p, 1),
        "bx": bx, "by": by, "bw": min(w, int(x) + R + 1) - bx, "bh": min(h, int(y) + R + 1) - by,
    })
json.dump({"w": w, "h": h, "leds": out}, open(f"{outdir}/{name}-leds.json", "w"))
print(f"{len(out)} voyants, image {w}x{h}, masque {int((mask > 0).sum())} px")
big = sorted(out, key=lambda l: -l["r"])[:6]
print("plus gros :", [(l["x"], l["y"], l["r"]) for l in big])
