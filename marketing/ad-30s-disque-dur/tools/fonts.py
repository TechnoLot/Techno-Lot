"""Fige les polices variables (OFL) en instances statiques lisibles par opentype.js.

Usage : venv/Scripts/python -I tools/fonts.py <dossier_des_polices_variables> assets/fonts
"""
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)

INSTANCES = [
    # (source, sortie, axes)
    ("Archivo-var.ttf", "Archivo-XCondBlack.ttf", {"wdth": 62, "wght": 900}),
    ("Archivo-var.ttf", "Archivo-CondBold.ttf", {"wdth": 75, "wght": 700}),
    ("JetBrainsMono-var.ttf", "JetBrainsMono-Medium.ttf", {"wght": 500}),
    ("JetBrainsMono-var.ttf", "JetBrainsMono-Bold.ttf", {"wght": 700}),
]
for s, d, axes in INSTANCES:
    f = TTFont(src / s)
    ranges = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in f["fvar"].axes}
    loc = {k: min(max(v, ranges[k][0]), ranges[k][2]) for k, v in axes.items()}
    inst = instancer.instantiateVariableFont(f, loc, updateFontNames=False)
    inst.save(dst / d)
    print(f"{d:28} axes {ranges} → {loc}")
