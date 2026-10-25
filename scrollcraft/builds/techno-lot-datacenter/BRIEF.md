# BRIEF : technolot.ca, page d'accueil v2 « Le centre de données »

**Statut :** interview réelle, deuxième tour. La v1 (« la ligne de rachat »,
`builds/techno-lot-accueil`) a été rejetée en entier par l'utilisateur ; ce
brief repart de ses réponses à ce rejet. Les citations sont verbatim.

Portée inchangée : la page d'accueil du site Next.js (FR à la racine, EN sous
`/en`). L'en-tête et le pied de page globaux restent (hors portée). Rien n'est
poussé sans demander : « ne push pas », puis « Oui, sauf ce travail-ci ».

---

## Ce que l'utilisateur a dit de la v1

« Qu'est-ce qui ne va pas ? » : **Le concept, Le style, L'animation, Le texte
ou la mise en page.** Tout est donc à refaire, y compris le ton du texte.

## Les huit sujets

1. **Ambiance.** « Couleur theme vert et noir informatique », « Sombre mais
   plus vivant », « Effets 3D », « Vidéo plein écran ». Demande d'origine
   toujours valable : « premium, trusted », « straight from a Awwward looking
   website rather than a bunch of different AI slop-generated assets »,
   « interactive with scrolling activities ».
2. **Parcours.** Choisi sur maquettes : « C. Le centre de données ». Une allée
   de serveurs plein écran, voyants verts ; au défilement les baies
   disparaissent jusqu'à « Votre espace est libre. », puis le formulaire.
   Les deux sections du milieu (ce qu'on rachète, comment ça marche) reprennent
   le contenu déjà publié sur le site.
3. **Énergie.** Vivant dès le premier écran (les voyants clignotent avant tout
   défilement), calme au milieu, le pic quand l'allée s'éteint, une fin posée.
4. **Émotion et LE moment.** L'allée pleine qui se vide : « Votre espace est
   libre. »
5. **Ce que ce site fait qu'aucun autre ne fait.** Le visiteur éteint un
   centre de données en faisant défiler : les voyants meurent baie par baie,
   l'allée tombe dans le noir, la lumière revient sur une salle vide et le logo
   s'allume au fond.
6. **Distance avec le premium-minimal.** Sombre, mais plus de lumière et plus
   de mouvement que la v1 : le vert est une lumière dans la scène, pas
   seulement un accent de bouton.
7. **Monde continu ou scènes ?** Des scènes distinctes (« not like a world
   that we'd be flying through »). Le travelling du hero est un seul plan dans
   un seul acte, pas un vol à travers toute la page.
8. **Visuels existants.** Le logo, à mettre en valeur : « garde le logo techno
   lot en valeur aussi. » La police et la phrase du site actuel : « Garde cette
   police et cette phrase. » (Chakra Petch, « Vos lots informatiques ont de la
   valeur », « de la valeur » en vert souligné). Les deux images de la
   maquette C (allée pleine, salle vide), que l'utilisateur a choisies.

Règles du site : « Faire une soumission » partout comme libellé d'action ;
jamais « paiement avant notre départ » (dire « paiement rapide et garanti ») ;
aucun tiret cadratin visible ; seulement des faits publiés : réponse en 24 h,
ramassage gratuit, la moitié au ramassage, inspection de 15 jours ouvrables au
maximum puis le solde sans délai, destruction des données avec certificat
(confirmé par l'utilisateur), entreprise unique au Québec.

## Étape 1

1. **Quoi, pour qui.** Techno Lot rachète le matériel informatique et
   électronique usagé des entreprises du Québec.
2. **Ce que le visiteur doit croire à la fin.** « Mon vieux matériel vaut
   quelque chose, et Techno Lot me libère de tout, sans tracas. »
3. **L'action.** Faire une soumission.
4. **Ce qu'on a.** Le logo (marque verte en boucle avec $, mot-symbole
   « TECHNO LOT »), Chakra Petch + Inter, le vert #5ECB33, les faits publiés.
5. **Direction artistique.** Centre de données photographique, nuit verte :
   brume, voyants, reflets sur le plancher technique. Objets en studio noir
   avec un liseré vert pour le rail.

## Le parcours

```
1  Reconnaissance  l'allée vivante : votre matériel a de la valeur
2  Étendue         ce que nous rachetons, objet par objet
3  Assurance       comment ça marche, quatre étapes, des faits
4  Bascule (pic)   l'allée s'éteint, la lumière revient sur une salle vide
5  Engagement      le formulaire
```

---

## Grammaire : filmique en un plan

Choisie parce que l'utilisateur a demandé explicitement une « vidéo plein
écran » et a choisi une direction qui est un seul argument continu (l'allée
pleine, puis vide). Pourquoi les sept autres ont perdu :

- **Éditorial en chapitres** : interdit le hero plein cadre en vidéo.
- **Surface vivante** : interdit la photo plein cadre et le scrub ; Techno Lot
  vend un service, pas un logiciel.
- **Monde continu** : refusé par l'utilisateur (« not like a world that we'd
  be flying through »).
- **Affiche typographique** : interdit le fond photographique ; l'utilisateur
  veut de la vidéo et de la 3D.
- **Galerie / catalogue** : interdit la phrase-titre unique du hero, que
  l'utilisateur veut garder.
- **Scène partagée** : c'était la v1, rejetée.
- **Découpe rythmique** : énergie de marque de sport, contraire à « premium,
  trusted ».

Contraintes tenues : aucune numérotation visible, aucune coupe franche entre
deux fonds (les fonds glissent), une seule entrée. Écart assumé : la barre de
navigation globale du site reste (hors portée).

## Signature : « La mise hors tension »

Chaque voyant de l'allée est un point vivant, extrait de la photo (2 439
voyants, position, rayon et lumière propre) et redessiné sur un canevas
au-dessus de la plaque « voyants effacés ». Ils clignotent comme de vrais
voyants d'activité ; sous le pointeur, les voyants proches s'emballent comme
un disque qu'on lit. Au pic, le défilement met l'allée hors tension baie par
baie, de la plus proche à la plus lointaine : chaque voyant clignote une
dernière fois et meurt, la face de la baie retombe dans le noir. Quand tout est
noir, la lumière revient sur une salle vide, et la boucle du logo se dessine
au fond, là où l'allée finissait. Codé dans la page (canevas + SVG lus depuis
la progression de l'acte), moteur intact.

## Barrière des empreintes (contre `techno-lot-accueil`)

| Dimension | v1 | v2 | Différent |
|---|---|---|---|
| Grammaire | Scène partagée | Filmique en un plan | oui |
| Navigation | Le séparateur AVANT/APRÈS comme chrome | L'en-tête global seul, transparent sur la vidéo ; aucun chrome propre à la page | oui |
| Hero | Photo en plans épinglée dans une moitié | Vidéo plein cadre sous la main + voyants vivants + logo au point de fuite | oui |
| Séquence | `pin > flow x5 > pin > flow`, 8 actes, 10,2 vh | `scrub > pan > flow > pin > flow`, 5 actes, ~12,3 vh | oui |
| Fermeture | Le séparateur s'effondre, formulaire | La salle vide éclairée, logo allumé, puis le formulaire | oui |
| Signature | La ligne de rachat | La mise hors tension | oui |

6 sur 6. Passe.

---

## La courbe des émotions

```
1  Émerveillement  une allée de serveurs vivante, la caméra avance sous la main,
                   le logo sort de la brume au fond
2  Appétit         « ah, ça aussi » : chaque objet arrive de côté et tourne un
                   peu sous le pointeur, avec son étiquette
3  Assurance       quatre étapes, des faits, aucune image ; l'acte le plus
                   calme (le silence avant le pic)
4  Tension, puis   les voyants meurent baie par baie, le noir avance vers le
   soulagement     fond ; puis la lumière revient sur une salle vide et le logo
                   se dessine
5  Résolution      le formulaire, dans l'espace libéré
```

**Le pic (acte 4).** Ce qu'un visiteur dirait à un ami : « En faisant défiler,
j'éteignais un centre de données baie par baie, tout devenait noir, puis la
lumière revenait sur une salle vide avec le logo au fond. »

**La phrase.** « C'est le site où tu éteins un centre de données en faisant
défiler. »

**Silence assumé.** Acte 4, progression ~0,56 à 0,62 : tout est noir sauf la
brume au fond de l'allée. Ce n'est pas du défilement mort : c'est le noir
avant la lumière.

## Partition

| Acte | Battement | Dispositif | Durée | Pourquoi |
|---|---|---|---|---|
| 1 Hero | Émerveillement | `scrub` (travelling kling) + titre en accueil + voyants vivants au repos + logo au point de fuite | 2,6 vh | La vidéo plein écran demandée, sous la main du visiteur |
| 2 Rachats | Appétit | `pan` (rail latéral) + `tilt` 3D et rotation au défilement | 3,4 vh | Le latéral se lit comme un éventail de choix |
| 3 Étapes | Assurance | `flow` + `in` | naturel, ~1,2 vh | Le calme avant le pic ; l'information se compresse |
| 4 Hors tension | Pic | `pin` + signature (canevas des voyants, plaques, SVG du logo) | 4,2 vh, le plus long | Le moment à raconter |
| 5 Formulaire | Résolution | `flow` + `in` | naturel | La page cesse de bouger |

Familles : scrub, pan, tilt, flow/in, pin, kinetic, signature. Jamais deux
fois de suite la même. Un seul `scrub`. Le pic a la plus grande durée et
l'acte d'avant est le plus calme. Total ~12,3 vh sur 5 actes, pied de page
exclu (hors de la bande 13,6-13,8 vh).

## Contrat de couches du hero

| Plan | Visuel | Mouvement propre | Règle |
|---|---|---|---|
| Fond | La vidéo (travelling avant dans l'allée) | Avance sous la main | Exposition constante (2e génération, tête et queue imposées) |
| Voyants | Canevas : la lumière propre des voyants de la 1re image | Clignotent au repos ; s'effacent dès que la vidéo avance | Seulement au repos : posés exactement sur l'image 0 |
| Sujet | Le logo au point de fuite, dans la brume | Grossit à mesure que la caméra approche | Brume devant, reflet doux au sol dessous |
| Atmosphère | Brume avant (dégradé, fusion « screen ») | Dérive lente, grossit plus vite que le fond | Jamais sur le texte |
| Texte | h1 (Chakra Petch), sous-titre, bouton | Stable, puis monte et s'efface | Lisible à l'ouverture, voile seulement sous le texte |

## Préambule des objets (verbatim, dans `lab/kie3.mjs`)

> Studio product photograph of a single piece of used business computer
> equipment floating in a pure black seamless void. One soft white key light
> from above and slightly in front, low intensity, and one thin cool green rim
> light (#5ECB33) grazing the far edges from behind, so the silhouette
> separates from the black. Shot on a medium-format camera with a 120mm lens,
> three-quarter view, slightly from above, the whole object in frame with
> generous empty margins on every side. Grade: deep blacks, graphite and
> charcoal plastics, brushed aluminium, honest light wear and tiny scuffs, fine
> film grain. Photographic realism. NOT 3D render, NOT CGI, NOT illustration,
> no glow, no neon, no reflections of a floor, no readable text, no stickers,
> no logos, no brand names.

## Visuels générés (kie.ai)

- `c1` / `c2` : les deux images de la maquette C choisies par l'utilisateur.
- `hero-a` (kling, 5 s, tête seule) : rejeté. Bon début, mais la brume se
  dissipe et l'exposition triple (luminance du centre 45 → 139) : la fin
  ressemble à un couloir 3D de banque d'images.
- `hero-b` (kling, 5 s, tête = c1, queue = image 22 de hero-a) : retenu.
  Luminance stable (centre 44,5 → 46,6 → 44,5), avance régulière.
- `vide-a` (seedream, image-à-image depuis c1) : la salle vide, même lumière.
- `obj-*` : six objets (serveur, portable, commutateur, disques, écran, poste).
- Voyants : extraits par `lab/leds.py` (OpenCV), pas générés.

---

## Construction : ce qui a changé en route

- **Lumière plutôt que glissement.** Le premier plan du pic faisait glisser
  les baies hors de l'allée (découpes 2.5D). Remplacé avant d'écrire le code :
  les baies s'éteignent et tombent dans le noir, puis la lumière revient sur
  la salle vide. Plus physique, et sans découpe qui trahirait le montage.
- **Vidéo du hero.** La 1re génération s'éclaircissait jusqu'à un couloir 3D
  de banque d'images ; la 2e (tête et queue imposées) garde la brume.
- **Voyants.** Extraction par pics (pas par régions : la brume du fond
  fusionnait en une seule « tache » de 287 000 px). La photo est d'abord
  étalonnée sur la 1re image de la vidéo (écart 2,4 niveaux), puis les
  voyants sont redessinés par-dessus la plaque « voyants effacés » : à
  intensité 1, on retrouve exactement la photo.
- **Logo.** La marque n'est jamais redessinée : un masque SVG suit la ligne
  médiane de son trait (tracée sur l'image du logo) et révèle la vraie image,
  du bout ouvert jusqu'à la flèche, puis le $ et le mot-symbole.
- **En-tête.** Le site décale tout le contenu de 80 px (main pt-20) ; l'accueil
  remonte d'autant pour que la vidéo passe sous l'en-tête transparent.
- **Noir sans coutures.** Les zones assombries se chevauchaient mal (bandes
  claires entre deux baies, colonne claire au centre) : un seul profil
  horizontal d'obscurité, plus le milieu de l'allée, avec la brume du fond
  protégée.
- **Téléphone.** Le recadrage portrait cache les baies proches : la vague
  d'extinction est recalée sur les baies visibles. Les boutons remontent au-
  dessus du bouton d'appel flottant du site.
- **Rail.** Le noir des photos est remonté au fond exact de la page (plus de
  halo) ; la lueur du plancher passe au-dessus des objets ; images chargées
  d'emblée (en glissant, le chargement paresseux arrivait en retard).
- **Mouvement réduit et sans JavaScript.** Le rail n'est plus épinglé : il
  devient une grille. Les scènes ont une taille d'écran par défaut avec une
  spécificité nulle (`:where`), pour que la règle collante du moteur gagne.

## Vérification

Outil du skill (`shoot.mjs`, Chromium 1243, H.264 vérifié : « probably »,
image peinte), 6 positions par acte, sur le **build de production**
(`npm run build` avec le script de CSS critique, puis `npm start`).

| Passe | Défilement mort | Vidéo | Contraste (pire image) |
|---|---|---|---|
| Bureau 1440 x 900 | aucun | avance tant qu'elle est à l'écran | tous ≥ 4,5:1 (min 6,16) |
| Téléphone 390 x 844 | aucun | avance tant qu'elle est à l'écran | tous ≥ 4,5:1 (min 4,9) |
| Mouvement réduit | aucun | affiche seulement (pas de vidéo) | tous ≥ 4,5:1 (min 5,75) |

Même contournement qu'en v1 pour la mesure : l'en-tête global a
`transition-all`, l'outil le photographie encore pendant qu'il le masque. Une
règle temporaire coupait cette transition pendant les trois passes ; elle est
retirée, le build final est refait sans elle.

Autres contrôles sur le paquet final :

- Les trois scènes épinglées sont bien collantes ; aucun avertissement du
  moteur, aucune erreur console (FR et EN, trois essais chacun). Un message
  console isolé est apparu une seule fois sur /en juste après un démarrage,
  sans être reproduit ensuite (ni à froid) ; son texte n'a pas été capturé.
- Clavier : en-tête, bouton du hero, lien du rail (ramené à l'écran), bouton
  du pic, puis le formulaire (atteint après le défilement doux du site).
- Sans JavaScript : page complète (hero, grille des objets, étapes, état final
  du pic avec la salle vide et le logo, formulaire).
- Version anglaise : mêmes passes visuelles.
- Images servies en AVIF (salle vide : 31 Ko à 1920 px).

Non vérifié : un vrai iPhone (décodage vidéo de Safari iOS, mode économie
d'énergie) et le déploiement Hostinger.

## Test de ressenti (à froid, un mot par acte)

| Acte | Prévu | Ressenti |
|---|---|---|
| 1 L'allée vivante | Émerveillement | Immersion (le logo au fond, la caméra avance) |
| 2 Rachats | Appétit | Curiosité, objet par objet |
| 3 Étapes | Assurance | Calme, le plus silencieux |
| 4 Hors tension | Tension puis soulagement | Tension (le noir avance), silence, puis soulagement à la lumière |
| 5 Formulaire | Résolution | Résolution |

Le pic a la plus grande durée (4,2 hauteurs d'écran) et l'acte d'avant est le
plus calme. La fin ne s'efface pas : « Votre espace est libre. » sous le logo,
puis le formulaire. Le dernier écran du pic répond au premier écran du site
(le logo au fond de l'allée, puis au fond de la salle vide).

## Crédits kie.ai

546 → 348 (198 débités) : deux vidéos kling (dont une rejetée), la salle vide,
six objets.
