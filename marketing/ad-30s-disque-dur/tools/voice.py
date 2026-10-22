"""Exécute voice/voix.ssml avec la voix neuronale Azure fr-CA-ThierryNeural.

Le point d'accès gratuit (edge-tts) n'accepte pas le SSML personnalisé : chaque <s>
est donc synthétisée seule (avec le débit de son <prosody>) et chaque <break>
devient un silence exact entre la fin d'une phrase et le début de la suivante.

Sorties :
  voice/vo.wav          narration seule, 48 kHz mono, 30,0 s
  voice/timings.json    début/fin de chaque phrase et de chaque mot (s, absolus)

Usage : venv/Scripts/python tools/voice.py
"""
import asyncio
import hashlib
import json
import subprocess
import sys
import wave
import xml.etree.ElementTree as ET
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SSML = ROOT / "voice" / "voix.ssml"
CACHE = ROOT / "voice" / "cache"
SR = 48000
DURATION = 30.0
NS = "{http://www.w3.org/2001/10/synthesis}"
FF = imageio_ffmpeg.get_ffmpeg_exe()


def parse(path):
    """Liste ordonnée de ('break', s) et ('s', id, texte, débit) ; voix du <voice>."""
    root = ET.parse(path).getroot()
    voice = root.find(f"{NS}voice")
    items = []

    def walk(node, rate):
        for el in node:
            tag = el.tag.replace(NS, "")
            if tag == "break":
                items.append(("break", float(el.get("time").rstrip("ms")) / 1000))
            elif tag == "prosody":
                walk(el, el.get("rate", rate))
            elif tag == "s":
                items.append(("s", el.get("id"), " ".join("".join(el.itertext()).split()), rate))

    walk(voice, "+0%")
    return voice.get("name"), items


async def synth(text, voice, rate):
    key = hashlib.sha1(f"{voice}|{rate}|{text}".encode()).hexdigest()[:12]
    mp3, meta = CACHE / f"{key}.mp3", CACHE / f"{key}.json"
    if not mp3.exists():
        comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
        words = []
        with open(mp3, "wb") as f:
            async for ch in comm.stream():
                if ch["type"] == "audio":
                    f.write(ch["data"])
                elif ch["type"] == "WordBoundary":
                    words.append({"text": ch["text"], "start": ch["offset"] / 1e7, "dur": ch["duration"] / 1e7})
        meta.write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
    return mp3, json.loads(meta.read_text(encoding="utf-8"))


def decode(mp3):
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-i", str(mp3), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


def speech_bounds(x):
    """Début/fin de la parole : enveloppe RMS 5 ms, seuil à −42 dB du pic."""
    win = SR // 200
    n = len(x) // win
    e = 10 * np.log10(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    on = np.nonzero(e > e.max() - 42)[0]
    return on[0] * win / SR, (on[-1] + 1) * win / SR


async def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    voice, items = parse(SSML)
    out = np.zeros(int(SR * DURATION), dtype=np.float32)
    t = 0.0
    sentences = []
    PRE, POST = 0.03, 0.12  # marge gardée avant l'attaque / après la fin (souffle, chute)
    for it in items:
        if it[0] == "break":
            t += it[1]
            continue
        _, sid, text, rate = it
        mp3, words = await synth(text, voice, rate)
        x = decode(mp3)
        on, off = speech_bounds(x)
        a, b = max(0, int((on - PRE) * SR)), min(len(x), int((off + POST) * SR))
        clip = x[a:b].copy()
        fade = int(0.008 * SR)
        clip[:fade] *= np.linspace(0, 1, fade)
        clip[-fade:] *= np.linspace(1, 0, fade)
        start = int((t - (on - a / SR)) * SR)
        out[start:start + len(clip)] += clip[: len(out) - start]
        # Mots : le premier mot annoncé coïncide avec l'attaque mesurée
        w0 = words[0]["start"]
        ws = [{"text": w["text"], "start": round(t + w["start"] - w0, 3), "end": round(t + w["start"] - w0 + w["dur"], 3)}
              for w in words]
        sentences.append({"id": sid, "text": text, "rate": rate, "start": round(t, 3), "end": round(t + off - on, 3), "words": ws})
        t += off - on
    if t > DURATION - 1.2:
        print(f"ATTENTION : la narration finit à {t:.2f} s", file=sys.stderr)

    pcm = (np.clip(out, -1, 1) * 32767).astype("<i2")
    with wave.open(str(ROOT / "voice" / "vo.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    (ROOT / "voice" / "timings.json").write_text(
        json.dumps({"voice": voice, "sentences": sentences}, ensure_ascii=False, indent=1), encoding="utf-8")
    for s in sentences:
        print(f'{s["id"]:11} {s["start"]:6.2f} → {s["end"]:6.2f}  ' + "  ".join(f'{w["text"]}@{w["start"]:.2f}' for w in s["words"]))


asyncio.run(main())
