# Pub 30 s — « Le voyage d'un disque dur »

Publicité Techno Lot (technolot.ca) pour tests A/B en publicité payante (Meta, Instagram, TikTok).
Plan-séquence simulé : placard sombre → espace blanc → trois temps (évaluation, offre, cueillette)
→ macro du disque, destruction en cube → paiement → carton de fin. Aucune coupe franche :
plongée dans un écran, zoom dans un écran LCD, iris dans des pastilles, morphing cube → notification.

## Livrables

| Fichier | Contenu |
| --- | --- |
| `out/technolot-30s-16x9.mp4` | 1920×1080, 30 i/s, H.264 + AAC 48 kHz, 30,0 s, −14 LUFS |
| `out/technolot-30s-9x16.mp4` | 1080×1920, même minutage et même son, mise en page verticale dédiée |
| `out/technolot-30s-voix.wav` | narration seule (traitée), 48 kHz |
| `voice/vo.wav` | narration brute, calée sur la ligne de temps |
| `out/planche-contact-*.png` | images clés de contrôle |
| `out/controle-*.json` | rapport ffprobe + loudness du fichier livré |

## Textes à l'écran

Textes du brief, à l'identique : « ILS DORMENT. » → « ILS VALENT $ », « ÉVALUATION GRATUITE »,
« OFFRE RAPIDE », « CUEILLETTE PARTOUT AU QUÉBEC », « VOS DONNÉES. DÉTRUITES. GRATUITEMENT. »,
« Effacement sécurisé · Confidentialité garantie », « Paiement rapide et garanti »,
« technolot.ca », « Rachat de matériel informatique · Partout au Québec ».

Ajoutés pour la mise en scène (à valider, faciles à retirer dans `src/shots/`) : « TECHNO LOT » →
« ON RACHÈTE » (espace blanc), étiquettes « 01 PORTABLES » … « 05 COMMUTATEURS », relevé du scan
(« ANALYSE … 100 % », « MODÈLE … 1U · 2 CPU », « ÉTAT … A »), noms de villes et « TECHNO LOT ·
MASCOUCHE » sur la carte, tailles des fichiers (« 48 Ko », « 1,2 Mo », « 3 214 messages »),
« PAIEMENT RAPIDE ET GARANTI. » en grand pendant la notification, notification « Paiement reçu ·
3 480,00 $ · maintenant ». **Le montant 3 480 $ (compteur et notification) est fictif.**

## Refaire la vidéo (Windows)

Prérequis : Node 20+, Python 3.11, Google Chrome (rendu GPU).

```bash
python -m venv venv
venv/Scripts/python -m pip install edge-tts imageio-ffmpeg numpy fonttools
npm install
venv/Scripts/python tools/voice.py          # voix → voice/vo.wav + voice/timings.json
node tools/audio.mjs                        # musique + bruitages + mixage → audio/mix.wav
node tools/render.mjs video 16x9            # image → build/16x9.mp4 (≈ 6 min)
node tools/render.mjs video 9x16            # image → build/9x16.mp4
node tools/finalize.mjs 16x9                # assemblage + contrôles → out/
node tools/finalize.mjs 9x16
```

Images de contrôle : `node tools/render.mjs frames 16x9 2.5,7.0,19.5` (→ `build/frames/`),
puis `node tools/sheet.mjs planche.png 4 480 build/frames/*.png`. Planche tirée du MP4 livré :
`node tools/contact.mjs 16x9`. Synchro voix / image : `node tools/sync-check.mjs`.

## Comment c'est fait

- **Rendu** (`src/`) : Three.js dans Chrome sans interface, image par image. Chaque image est la
  moyenne de 24 à 48 sous-images décalées dans le temps (flou de bougé, obturateur 180°), sur la
  pupille (vraie profondeur de champ) et d'une fraction de pixel (anticrénelage), puis halo,
  vignette, grain et remappage sur la palette stricte noir #050505 / blanc cassé #F2F2EE / vert #5ECB33.
  Choisi plutôt que Remotion : le flou de bougé et la profondeur de champ par accumulation
  demandent de piloter soi-même le rendu WebGL, sous-image par sous-image.
- **Typographie** : vraie géométrie tirée des contours des polices (crénage GPOS), dans la scène 3D :
  la caméra passe entre les lettres, qui reçoivent le flou de bougé et la profondeur de champ.
  Archivo ExtraCondensed Black (titres) et JetBrains Mono (données), licence SIL OFL (`assets/fonts`).
- **Plans** : `src/shots/` (un fichier par plan), enchaînés par `src/film.js` ; tous les instants
  viennent de `src/timeline.js`, lui-même calé sur les minutages mesurés de la voix.
- **Modèles** : 100 % procéduraux (`src/models.js`, `src/textures.js`), aucun fichier 3D externe.
- **Carte** : contour du Québec Natural Earth 1:50 M (domaine public), projection Québec Lambert
  (`tools/geo.py`). Le siège affiché est Mascouche (adresse du site).
- **Voix** (`voice/voix.ssml`, `tools/voice.py`) : voix neuronale Azure **fr-CA-ThierryNeural**.
  Le point d'accès gratuit utilisé (edge-tts) refuse le SSML personnalisé : `voice.py` lit donc
  le fichier SSML, synthétise chaque `<s>` avec le débit de son `<prosody>` et transforme chaque
  `<break>` en silence exact. Avec une clé Azure Speech, le même `voix.ssml` peut être envoyé tel quel.
  Pour changer un calage : modifier les `<break>` puis relancer `voice.py`, `audio.mjs` et le rendu.
- **Son** (`tools/audio.mjs`) : tout est synthétisé (aucun échantillon, aucun droit) : musique
  110 BPM en ré mineur qui se résout en fa majeur, presque silence entre 16 et 19 s, drop sur
  l'écrasement du cube ; porte, clics mécaniques, laser, rouleaux, moteur du disque, impact,
  « ding » de paiement. Ducking −8 dB sous la voix, limiteur, normalisation −14 LUFS
  (crête vraie ≤ −1 dBTP).

## Pièges de ce poste

Le contrôle d'application Windows bloque certains exécutables : toujours lancer Python par
`venv/Scripts/python -m …` (pas les `.exe` des venv). Le ffmpeg complet vient d'`imageio-ffmpeg`,
ffprobe du paquet npm `ffprobe-static`.
