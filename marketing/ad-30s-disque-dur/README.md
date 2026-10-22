# Pub 30 s — Techno Lot, version entreprises

Publicité Techno Lot (technolot.ca) pour tests A/B en publicité payante (Meta, Instagram, TikTok),
pensée pour les entreprises qui renouvellent leur parc. Plan-séquence simulé, sans coupe franche :
registre d'inventaire (noir) → mur « TOUT » (blanc) → trois temps (évaluation, offre, cueillette)
→ macro du disque, destruction en cube → paiement → carton de fin. Raccords : plongées dans le
« O » de « LOT. » et de « TOUT », dans le « $ », iris dans des pastilles, morphing cube → notification.

## Livrables

| Fichier | Contenu |
| --- | --- |
| `out/technolot-30s-16x9.mp4` | 1920×1080, 30 i/s, H.264 + AAC 48 kHz, 30,0 s, −14 LUFS |
| `out/technolot-30s-9x16.mp4` | 1080×1920, même minutage et même son, mise en page verticale dédiée |
| `out/technolot-30s-voix.wav` | narration seule (traitée), 48 kHz |
| `out/technolot-30s-couverture-16x9.png`, `…-9x16.png` | miniature conseillée : « ON RACHÈTE EN LOT. ✓ NEUF ✓ USAGÉ » |
| `voice/vo.wav` | narration brute, calée sur la ligne de temps |
| `out/planche-contact-*.png` | images clés de contrôle (tirées des MP4 livrés) |
| `out/controle-*.json` | rapport ffprobe + loudness du fichier livré |

## Narration (Azure fr-CA-ThierryNeural)

| Début | Réplique |
| --- | --- |
| 0,30 s | Votre entreprise renouvelle son parc informatique? |
| 3,40 s | On rachète votre équipement en lot, neuf ou usagé. |
| 6,80 s | Chez Technolot, on achète tout ce qui est informatique ou électronique. |
| 11,45 s | Évaluation gratuite, |
| 13,45 s | offre rapide, |
| 15,05 s | cueillette partout au Québec. |
| 17,25 s | Et vos données? |
| 18,31 s | On les détruit gratuitement, de façon sécurisée. |
| 22,15 s | Paiement rapide et garanti. |
| 25,30 s | Technolot point C A, on s'occupe de tout. |

« Technolot » est écrit en un seul mot pour la voix : en deux mots (« Techno Lot »), elle accentuait
« Lot » (saut de mélodie de 6 à 9 demi-tons). En un mot, la mélodie reste lisse (saut maximal de
2,5 et 3,2 demi-tons, comme un nom propre ordinaire) et le « t » final est muet.

## Textes à l'écran

- Ouverture : registre d'inventaire d'une entreprise (64 lignes : portables, écrans, serveurs,
  cellulaires, téléviseurs, câbles, imprimantes, consoles… avec quantité et état neuf/usagé),
  « POUR LES ENTREPRISES », « VOTRE PARC INFORMATIQUE? » → « ON RACHÈTE EN LOT. » pendant que tout
  le registre se sélectionne en vert, pastilles « ✓ NEUF » « ✓ USAGÉ ».
- « TECHNO LOT » → « TOUT » sur un mur de mots (PORTABLES … INVENTAIRE, NEUF, USAGÉ, EN LOT) ;
  INFORMATIQUE et ÉLECTRONIQUE passent au vert quand la voix les dit.
- « ÉVALUATION GRATUITE » (le laser balaie le registre et chiffre chaque ligne) + relevé
  « ANALYSE … 100 % », « NEUF ET USAGÉ … OUI », « VALEUR … CALCULÉE ».
- « OFFRE RAPIDE » + compteur « 3 480 $ ».
- « CUEILLETTE PARTOUT AU QUÉBEC » + carte du Grand Montréal : Montréal, Laval, Longueuil, Brossard,
  Boucherville, Terrebonne, Repentigny, Saint-Jérôme, Blainville, Mirabel, Saint-Eustache,
  Vaudreuil-Dorion, Châteauguay, Saint-Jean-sur-Richelieu, siège « TECHNO LOT · MASCOUCHE », et en
  16:9 un médaillon du Québec. (En 9:16, Mirabel et Saint-Eustache, collées au bord, sont omises.)
- « VOS DONNÉES. DÉTRUITES. GRATUITEMENT. » + « Effacement sécurisé · Confidentialité garantie » ;
  fichiers « Clients.xlsx · 48 Ko », « Paie_2024.pdf · 1,2 Mo », « Courriels · 3 214 messages ».
- « PAIEMENT RAPIDE ET GARANTI. » + notification « Paiement reçu · 3 480,00 $ · maintenant ».
- Carton : logo, « TECHNO LOT », « Paiement rapide et garanti », « technolot.ca »,
  « Rachat de matériel informatique · Partout au Québec ».

**Le montant 3 480 $ (compteur et notification) est fictif.** Règles de rédaction : jamais
« paiement avant notre départ » (seulement « paiement rapide et garanti »), aucun « certificat de
destruction », aucun délai chiffré.

## Refaire la vidéo (Windows)

Prérequis : Node 20+, Python 3.11, Google Chrome (rendu GPU).

```bash
python -m venv venv
venv/Scripts/python -m pip install edge-tts imageio-ffmpeg numpy fonttools
npm install
venv/Scripts/python tools/voice.py          # voix → voice/vo.wav + voice/timings.json
node tools/audio.mjs                        # musique + bruitages + mixage → audio/mix.wav
node tools/render.mjs video 16x9            # image → build/16x9.mp4 (≈ 7 min)
node tools/render.mjs video 9x16            # image → build/9x16.mp4
node tools/finalize.mjs 16x9                # assemblage + contrôles → out/
node tools/finalize.mjs 9x16
```

Changer un texte de la voix : modifier `voice/voix.ssml`, puis `venv/Scripts/python tools/voice.py --solve`
recalcule les `<break>` pour que chaque réplique commence à son instant cible (`voice/targets.json`),
et relancer `voice.py`, `audio.mjs` et le rendu : toute l'animation suit les nouveaux minutages.

Images de contrôle : `node tools/render.mjs frames 16x9 2.5,7.0,19.5` (→ `build/frames/`),
puis `node tools/sheet.mjs planche.png 4 480 build/frames/*.png`. Planche tirée du MP4 livré :
`node tools/contact.mjs 16x9`. Synchro voix / image : `node tools/sync-check.mjs`.

## Comment c'est fait

- **Rendu** (`src/`) : Three.js dans Chrome sans interface, image par image. Chaque image est la
  moyenne de 24 à 44 sous-images décalées dans le temps (flou de bougé, obturateur 180°), sur la
  pupille (vraie profondeur de champ) et d'une fraction de pixel (anticrénelage), puis halo,
  vignette, grain et remappage sur la palette stricte noir #050505 / blanc cassé #F2F2EE / vert #5ECB33.
  Choisi plutôt que Remotion : le flou de bougé et la profondeur de champ par accumulation
  demandent de piloter soi-même le rendu WebGL, sous-image par sous-image.
- **Typographie** : vraie géométrie tirée des contours des polices (crénage GPOS), dans la scène 3D :
  la caméra passe entre les lettres, qui reçoivent le flou de bougé et la profondeur de champ.
  Archivo ExtraCondensed Black (titres) et JetBrains Mono (données), licence SIL OFL (`assets/fonts`).
  `src/contours.js` coupe en boucles simples les contours qui se croisent (le « 8 » de JetBrains
  Mono est dessiné en deux traits en huit ; sans ça, ses trous étaient bouchés).
- **Plans** : `src/shots/` (un fichier par plan : `hook`, `tout`, `scan`, `counter`, `map`, `disk`,
  `end`), enchaînés par `src/film.js` ; tous les instants viennent de `src/timeline.js`, lui-même
  calé sur les minutages mesurés de la voix. Le registre d'inventaire est `src/inventory.js`.
- **Modèles** : 100 % procéduraux (`src/models.js`), aucun fichier 3D externe. Le film n'utilise plus
  que le disque dur et le cube ; plus aucun modèle de produit (tour, serveur…), pour dire « tout »
  par les mots plutôt que par quelques objets.
- **Carte** : villes et rivières du Grand Montréal placées en longitude/latitude, contour du Québec
  Natural Earth 1:50 M (domaine public) pour le médaillon, projection Québec Lambert (`tools/geo.py`).
  Le siège affiché est Mascouche (adresse du site).
- **Voix** (`voice/voix.ssml`, `tools/voice.py`) : le point d'accès gratuit utilisé (edge-tts) refuse
  le SSML personnalisé : `voice.py` lit donc le fichier SSML, synthétise chaque `<s>` avec le débit
  de son `<prosody>` et transforme chaque `<break>` en silence exact. Avec une clé Azure Speech, le
  même `voix.ssml` peut être envoyé tel quel.
- **Son** (`tools/audio.mjs`) : tout est synthétisé (aucun échantillon, aucun droit) : musique
  110 BPM calée sur l'impact, ré mineur (registre) → si bémol / fa (« TOUT ») → groove des trois
  temps, courte retenue sur « Et vos données? », drop sur l'écrasement du cube (18,2 s), résolution
  en fa majeur sur le carton. Bruitages : un tic par ligne du registre, roulements des titres,
  laser, rouleaux du compteur, pings de la carte, moteur du disque, impact, « ding » de paiement.
  Ducking −8 dB sous la voix, limiteur, normalisation −14 LUFS (crête vraie ≤ −1 dBTP).

## Pièges de ce poste

Le contrôle d'application Windows bloque certains exécutables : toujours lancer Python par
`venv/Scripts/python -m …` (pas les `.exe` des venv). Le ffmpeg complet vient d'`imageio-ffmpeg`,
ffprobe du paquet npm `ffprobe-static`. Texte posé sur une forme (pilule « technolot.ca ») : plan
proche de la caméra à 0,5 et texte sans test de profondeur, sinon le texte scintille.
