# BRIEF : technolot.ca, page d'accueil v2 « Le centre de données »

**Statut :** interview réelle, deuxième tour, puis un troisième tour de
retouches sur la v2 (voir « Troisième tour » plus bas : il remplace la mise
hors tension par l'arrivée du fourgon). La v1 (« la ligne de rachat »,
`builds/techno-lot-accueil`) a été rejetée en entier par l'utilisateur ; ce
brief repart de ses réponses à ce rejet. Les citations sont verbatim.

Portée inchangée : la page d'accueil du site Next.js (FR à la racine, EN sous
`/en`). L'en-tête et le pied de page globaux restent (hors portée). Poussée :
« Pousse sur dev » pour la v2, puis « Apres push sur dev » pour ce tour-ci.

---

## Troisième tour : ce que l'utilisateur a dit de la v2

> « le logo dans la hero doit etre plus gros et imposant. Quand on scroll la
> phrase : Rachat de lots informatiques et électroniques Unique au Québec elle
> doit etre plus espacé et le logo doit etre plus gros et avoir la meme
> animation de fading pour l'onglet plus bas (On s'occupe de tout.) quand on
> scroll par en bas. Ce que nous rachetons ( met le mot Rachetons en vert).
> Plus bas a : Comment ça marche Change la phrase pour : Notre Fonctionnement.
> Rend les 4 étape plus friendly user et intéractif. La plus bas : On s'occupe
> de tout, enleve le scrolling animation et remplace le pour montrer que nous
> prenont le client en charge que c'est simple et efficace paiment garantie
> tout en était intéractif et visuel attrayant si y faut génere des photos ou
> vidéo d'un sprinter van lettré avec notre logo qui arrive dans le frame et
> qui a de la fumé aux pneu d'en arriere. »

Ce qui a été fait, point par point :

1. **Logo du hero** : de 250 à 420 px de large au plus (26vw / 36vh), une
   nappe sombre derrière lui pour qu'il se détache de la brume, voile vert
   plus léger. Il grandit davantage en approchant (x 1,55 au lieu de x 1,4).
2. **La ligne** : lettres espacées (0,30em au lieu de 0,16em), deux lignes
   plus aérées, plus loin du logo, bande d'ombre douce dessous. Le logo et sa
   ligne s'effacent sur le dernier quart du hero avec la courbe des repères
   du moteur (fondu et 2,4vh de descente), le geste qu'avait « On s'occupe de
   tout. » dans la v2.
3. **« rachetons »** en vert (EN « buy »).
4. **« Notre fonctionnement »** (casse de phrase française ; EN « How we
   work »). Les quatre étapes deviennent une frise : pastille et icône par
   étape, un fait clé en étiquette (En ligne, 24 h, Gratuit, Garanti), une
   ligne verte qui avance au défilement et allume chaque étape au passage
   (en colonne sur téléphone), survol qui soulève l'étape.
5. **« On s'occupe de tout. »** : la mise hors tension (défilement) est
   retirée. À la place, une scène plein écran où le Sprinter lettré Techno
   Lot entre par la gauche, freine en fumant des pneus arrière et s'arrête
   (vidéo jouée une fois quand la scène est à l'écran, jamais liée au
   défilement, bouton « Revoir l'arrivée »), puis trois engagements en
   onglets : Simple (une case pour vous, cinq pour nous), Efficace (emballer,
   charger, transporter), Paiement garanti (la barre en deux moitiés).
6. **« Votre espace est libre. »** gardé comme fin, plus court : la salle vide
   dans le noir, les néons se rallument, la boucle du logo se dessine.

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
3  Assurance       notre fonctionnement : une étape pour vous, trois pour nous
4  Prise en charge le fourgon arrive ; simple, efficace, paiement garanti
5  Bascule         la salle vide s'allume, le logo se dessine : votre espace
                   est libre
6  Engagement      le formulaire
```

(v2 : l'acte 4 était la mise hors tension de l'allée, et il n'y avait pas de
scène du fourgon.)

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

## Signature (troisième tour) : « L'espace libéré »

Le Sprinter lettré entre dans la cour, fume des pneus arrière et se gare ;
plus bas, la salle vide est dans le noir, les néons se rallument avec leur
clignotement et la boucle du logo se dessine le long de son propre trait (le
masque SVG de la v2, gardé). Les voyants vivants du hero restent (au repos,
sous le pointeur) ; leur extinction au défilement est retirée à la demande de
l'utilisateur, avec la plaque « voyants effacés » qui la servait.

## Signature (v2, remplacée) : « La mise hors tension »

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
| Séquence | `pin > flow x5 > pin > flow`, 8 actes, 10,2 vh | `scrub > pan > flow > flow > pin > flow`, 6 actes, ~12,6 vh (v2 : `scrub > pan > flow > pin > flow`, 5 actes, ~12,3 vh) | oui |
| Fermeture | Le séparateur s'effondre, formulaire | La salle vide éclairée, logo allumé, puis le formulaire | oui |
| Signature | La ligne de rachat | L'espace libéré (v2 : la mise hors tension) | oui |

6 sur 6. Passe (vérifié de nouveau après le troisième tour).

---

## La courbe des émotions (troisième tour)

```
1  Émerveillement  une allée de serveurs vivante, la caméra avance sous la main,
                   le logo, imposant, sort de la brume puis s'efface
2  Appétit         « ah, ça aussi » : chaque objet arrive de côté et tourne un
                   peu sous le pointeur, avec son étiquette
3  Assurance       une ligne verte qui avance et allume quatre étapes ; une
                   seule est pour le visiteur
4  Pic : prise     le fourgon lettré entre en fumant des pneus et se gare ; on
   en charge       touche les trois engagements
5  Soulagement     noir, les néons se rallument sur la salle vide, le logo se
                   dessine : « Votre espace est libre. »
6  Résolution      le formulaire
```

**Le pic (acte 4).** Ce qu'un visiteur dirait à un ami : « Un fourgon Techno
Lot arrive en faisant fumer ses pneus, et tout est expliqué en trois onglets ;
après, la lumière revient sur une salle vide avec le logo. »

**Écart assumé.** Le pic n'a plus la plus grande durée de défilement : sur
demande (« enleve le scrolling animation »), il est joué dans le temps (la
vidéo démarre quand la scène est à l'écran), pas épinglé. Le pin qui suit
(2,4 vh) n'est que la résolution.

**Silence assumé.** Acte 5, progression 0 à 0,10 : la salle dans le noir,
seule la brume du fond éclaire. C'est le noir avant la lumière.

(v2 : le pic était la mise hors tension, 4,2 vh, avec son silence de 0,56 à
0,62.)

## Partition

| Acte | Battement | Dispositif | Durée | Pourquoi |
|---|---|---|---|---|
| 1 Hero | Émerveillement | `scrub` (travelling kling) + titre en accueil + voyants vivants au repos + logo au point de fuite, effacé sur le dernier quart | 2,6 vh | La vidéo plein écran demandée, sous la main du visiteur |
| 2 Rachats | Appétit | `pan` (rail latéral) + `tilt` 3D et rotation au défilement | 3,4 vh | Le latéral se lit comme un éventail de choix |
| 3 Fonctionnement | Assurance | `flow` + `in` + frise allumée au défilement | naturel, ~1,1 vh | Calme ; l'information se compresse |
| 4 Fourgon | Pic | `flow` + vidéo jouée à l'écran (une fois) + onglets | naturel, ~1,7 vh | Demandé sans animation de défilement |
| 5 Espace libre | Soulagement | `pin` + néons (interrupteur) + SVG du logo | 2,4 vh | La lumière revient, la fin du film |
| 6 Formulaire | Résolution | `flow` + `in` | naturel | La page cesse de bouger |

Familles : scrub, pan, tilt, flow/in, vidéo dans le temps, pin, signature.
Jamais deux fois de suite le même dispositif (les deux `flow` du milieu
portent l'un une frise au défilement, l'autre une vidéo dans le temps). Un
seul `scrub`. Total ~12,6 vh sur 6 actes au bureau, pied de page exclu.

## Contrat de couches du hero

| Plan | Visuel | Mouvement propre | Règle |
|---|---|---|---|
| Fond | La vidéo (travelling avant dans l'allée) | Avance sous la main | Exposition constante (2e génération, tête et queue imposées) |
| Voyants | Canevas : la lumière propre des voyants de la 1re image | Clignotent au repos ; s'effacent dès que la vidéo avance | Seulement au repos : posés exactement sur l'image 0 |
| Sujet | Le logo au point de fuite, dans la brume (jusqu'à 420 px) | Grossit à mesure que la caméra approche (x 1,55), puis s'efface sur le dernier quart avec sa ligne | Nappe sombre derrière, voile vert léger, la ligne au-dessus d'une bande d'ombre |
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
- Troisième tour, le fourgon :
  - `van-vide` (seedream) : la cour de chargement de nuit, vide (bande de
    néons verts, asphalte mouillé, quai à droite).
  - `van-arret-a` (seedream, image-à-image) : le Sprinter noir à toit haut
    garé au centre, phares allumés, fumée aux pneus arrière ; décor aligné
    sur `van-vide` à 0,56 px près.
  - Lettrage : le logo n'est jamais généré. `lab/van-lettrage.py` assemble la
    vraie marque et le vrai mot-symbole en version horizontale, les plaque en
    perspective sur la bande basse du flanc et les éclaire comme la
    carrosserie (teinte verte, dégradé, grain).
  - `van-a` (kling, 5 s, tête = cour vide, queue = fourgon lettré, recadrés
    en 16:9) : retenu du premier coup. Le fourgon entre par la gauche,
    décélère, s'arrête vers 3,1 s ; la fumée continue jusqu'à 5 s ; le
    lettrage reste lisible pendant tout le freinage.
  - `lab/publish-van.mjs` : `van.mp4` (1920 x 1080, 1,6 Mo), `van-m.mp4`
    (carré 864 px centré sur le fourgon garé, 0,5 Mo) et leurs affiches
    (première et dernière image des fichiers encodés).

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

Troisième tour :

- **Fondu du logo.** Un premier essai posait un repère du moteur sur tout le
  bloc du logo : l'outil de vérification mesurait alors le texte de la ligne
  sur toute la surface du bloc (image comprise) et signalait un faux échec de
  contraste. Le logo est maintenant estompé par HomeExperience, avec la même
  courbe que le moteur, et la ligne par son propre repère (« 0.3 1 0.25
  0.343 » : fondu à partir de 0,76, comme le logo).
- **Voile de la ligne.** Plus large qu'en v2, la ligne agrandie passait sur
  des voyants vifs aux deux bouts (3,5:1). Le voile radial est remplacé par
  une bande d'ombre pleine sur toute la ligne, fondue sur les bords ; le logo
  passe au-dessus de la bande (sinon elle grisait le mot-symbole). La largeur
  de la ligne est bornée pour tenir dans l'écran une fois agrandie (la ligne
  anglaise débordait sur téléphone).
- **Frise des étapes.** Chaque étape porte le tronçon de ligne qui mène à la
  suivante (piste + remplissage), horizontal au bureau, vertical sur
  téléphone ; la position le long de la ligne est calculée en « numéros
  d'étape » (rangée : de 80 % à 38 % de l'écran ; colonne : curseur à 62 %).
  Les étapes en veille gardent leur contraste (seule la pastille s'éteint).
- **Le fourgon.** Joué une fois à 60 % de visibilité, chargé un écran plus
  tôt ; la cour vide s'affiche dessous en attendant (même image que la
  première de la vidéo : aucun saut) ; si la lecture est refusée ou le
  fichier illisible, on montre le fourgon garé avec « Voir l'arrivée ».
  Mouvement réduit et sans JavaScript : le fourgon garé, sans lecture
  automatique. Mise en page empilée (titre, vidéo carrée, onglets) sur
  téléphone et sur les écrans plus hauts que larges.
- **Titre sur la vidéo.** Sur un portable 1280 x 720, la bande de néons du mur
  passe sous le sous-titre : une ombre douce derrière le bloc titre le
  protège quel que soit le cadrage (11,6:1 au pire).
- **Onglets.** Sur ordinateur, les trois panneaux occupent la même case (la
  hauteur ne saute pas) et chaque schéma se centre dans la place qui reste ;
  sur téléphone, la hauteur suit le panneau ouvert. Le moteur ne mesure la
  position des actes qu'au montage et au redimensionnement : un
  ResizeObserver sur la page lui fait remesurer quand le contenu change de
  hauteur, sinon le pic serait décalé.
- **Clavier.** Le bouton du pic recevait le focus invisible (le moteur centre
  l'élément, sans effet dans une scène collante) : au focus, l'acte est amené
  à 80 %, où le bouton est pleinement là.
- **Nettoyage.** Le canevas d'extinction, les bandes de baies, l'ombre du pic
  et la plaque `allee-sombre.webp` sont retirés ; `led-field.ts` ne garde que
  les voyants du hero.

## Vérification (troisième tour)

Même outil, mêmes conditions (build de production, 6 positions par acte, règle
temporaire sur la transition de l'en-tête pendant les passes, retirée ensuite).

| Passe | Défilement mort | Vidéo | Contraste (pire image) |
|---|---|---|---|
| Bureau 1440 x 900 (FR) | aucun | avance tant qu'elle est à l'écran | tous ≥ 4,5:1 (min 8,56 ; ligne du logo 12,92) |
| Téléphone 390 x 844 | aucun | avance tant qu'elle est à l'écran | tous ≥ 4,5:1 (min 6,9) |
| Mouvement réduit | aucun | affiche seulement (pas de vidéo) | tous ≥ 4,5:1 (min 9,03) |
| Bureau 1440 x 900 (EN) | aucun | avance tant qu'elle est à l'écran | tous ≥ 4,5:1 (min 8,56) |

Autres contrôles :

- Titre du fourgon sur la vidéo (l'outil ne mesure que les repères du
  moteur) : `lab/care-contrast.cjs`, à l'arrivée et une fois garé, en
  1280 x 720, 1366 x 768, 1440 x 900, 1920 x 950, 1024 x 1366 et 390 x 844 :
  titre ≥ 16,9:1, sous-titre ≥ 11,6:1.
- Onglets (`lab/tabs.cjs`) : clic, flèches (avec retour au début), Fin, Tab
  vers le panneau ; hauteur stable au bureau (432 px), variable sur
  téléphone ; aucune erreur console.
- Clavier (`lab/kbd.cjs`, FR et EN) : en-tête, bouton du hero, lien du rail,
  onglet puis panneau des engagements, bouton du pic (visible), formulaire ;
  aucun arrêt invisible.
- Captures par acte (`lab/look.cjs`) au bureau, sur téléphone, en mouvement
  réduit et en anglais ; sans JavaScript, page complète (les trois panneaux à
  la suite, le fourgon garé, l'état final du pic).
- `npx tsc --noEmit` propre ; aucune erreur console.

Non vérifié : un vrai iPhone (lecture automatique en mode économie
d'énergie : le repli sur le fourgon garé est prévu, pas observé) et le
déploiement Hostinger.

## Vérification (v2)

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

## Test de ressenti (troisième tour, à froid, un mot par acte)

| Acte | Prévu | Ressenti |
|---|---|---|
| 1 L'allée vivante | Émerveillement | Présence (le logo, imposant, vient vers soi puis laisse la place) |
| 2 Rachats | Appétit | Curiosité, objet par objet |
| 3 Fonctionnement | Assurance | Facilité (la ligne s'allume, une seule étape est pour moi) |
| 4 Fourgon | Pic | Surprise, puis confiance (« ils viennent, ils s'occupent de tout ») |
| 5 Espace libre | Soulagement | Soulagement à la lumière |
| 6 Formulaire | Résolution | Résolution |

## Test de ressenti (v2, à froid, un mot par acte)

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

- v2 : 546 → 348 (198 débités) : deux vidéos kling (dont une rejetée), la
  salle vide, six objets.
- Troisième tour : 348 → 270 (78 débités) : la cour vide, le fourgon garé,
  la vidéo kling de l'arrivée (retenue du premier coup).
