# BRIEF : technolot.ca, nouvelle page d'accueil

**Statut :** interview partielle. Une partie des réponses est de l'utilisateur
(citées telles quelles). Pour les quatre questions restées sans réponse, la
décision par défaut recommandée a été retenue et marquée **[décision par défaut]**.
L'utilisateur a demandé de ne pas se faire reposer ces questions.

Portée retenue par l'utilisateur : « Page d'accueil (Recommandé) : Refaire
l'accueil dans le site Next.js actuel ; formulaire, autres pages et admin restent
intacts. » Le site reste bilingue (FR à la racine, EN sous `/en`). L'en-tête et
le pied de page globaux du site restent en place (hors portée).

---

## Les huit sujets

1. **Ambiance.** Choix de l'utilisateur : « Précis, calme, industriel ».
   Description de l'option choisie : « Noir profond, gros plans de métal et de
   circuits, lumière de studio, très peu de mots. Esprit Apple Pro / Bang &
   Olufsen. » Demande d'origine : « premium, trusted », « straight from a
   Awwward looking website rather than a bunch of different AI slop-generated
   assets », « more premium than ever and interactive with scrolling
   activities ». Références : la présentation Apple Pro, les objets Bang &
   Olufsen.
2. **Parcours, section par section.** [décision par défaut] « Problème →
   solution » : le lot qui dort dans l'entrepôt, ce que ça coûte de le garder,
   comment ça marche, l'avant/après où le lot part, puis le formulaire de
   soumission. L'avant/après est placé juste avant le formulaire parce que dans
   la grammaire choisie (scène partagée) l'effondrement du séparateur est la
   fin, et le pic a besoin d'un moment calme devant lui.
3. **Énergie.** [décision par défaut] « Calme → pic → calme » : ouverture lente
   et silencieuse, montée jusqu'à l'avant/après, fin posée et rassurante sur le
   formulaire.
4. **Émotion et LE moment.** Choix de l'utilisateur : « Avant / après du lot :
   Un entrepôt encombré se vide au défilement : le lot part, l'argent arrive. »
5. **Ce que ce site fait qu'aucun autre ne fait.** Le même choix : le lot qui
   se vide sous la main du visiteur, et l'argent qui arrive à la place.
6. **Distance avec le premium-minimal.** « Précis, calme, industriel » :
   premium-minimal sombre, vocabulaire industriel (étiquettes, filets, palette,
   béton), aucune décoration.
7. **Un monde continu ou des scènes ?** L'utilisateur : « not like a world
   that we'd be flying through ». Donc des scènes distinctes, pas de
   worldflight.
8. **Visuels existants.** Choix de l'utilisateur : « Mix réel + généré
   (Recommandé) : Les photos actuelles du site plus des images/vidéos kie.ai
   cohérentes pour le hero et le moment signature. » Logo vert (#5ECB33,
   flèche circulaire avec $), photos de banque du site (une seule s'accorde au
   monde choisi : le disque dur ouvert, `datacenter.jpg`).

Autres décisions :

- **Chiffres.** [décision par défaut] Seulement les faits déjà publiés sur le
  site : réponse en 24 heures, ramassage gratuit, la moitié du paiement au
  ramassage, inspection en 15 jours ouvrables au maximum, entreprise unique au
  Québec. Aucun compteur animé, aucun chiffre inventé, aucun prix.
- **Couleurs.** [décision par défaut] « Garder noir + vert #5ECB33 » : le vert
  sert d'accent rare (le séparateur, les statuts du bordereau, le bouton).
- **Libellé de l'action.** « Faire une soumission », partout (règle du site).
- **Formulation.** Jamais « paiement avant notre départ » : « paiement rapide
  et garanti ». Aucun tiret cadratin visible.

## Étape 1

1. **Quoi, pour qui.** Techno Lot rachète les lots de matériel informatique et
   électronique usagé des entreprises du Québec (serveurs, portables, réseau,
   stockage, postes de travail, et tout le reste).
2. **Ce que le visiteur doit croire à la fin.** [décision par défaut] « Techno
   Lot me rachète mon vieux matériel rapidement, sans tracas, avec un paiement
   garanti. »
3. **L'action suivante.** Faire une soumission (le formulaire est à la fin de
   la page, et le bouton du hero mène à `/soumission`).
4. **Ce qu'on a.** Logo, vert de marque, faits publiés sur le site, une photo
   réelle utilisable (disque dur ouvert).
5. **Direction artistique.** Monde photographique « low-key » industriel :
   studio sombre, une seule lumière au-dessus, béton, poussière réelle.

## Le parcours

```
1  Reconnaissance   le lot sous une lampe, dans un entrepôt sombre
2  Tension          ce que ça coûte de le garder : l'espace, la valeur, les données
3  Substance        trois gestes de votre côté, le reste du nôtre
4  Bascule (pic)    le lot traverse la ligne, pièce par pièce, et devient une offre
5  Engagement       l'espace est libre, le formulaire est là
```

---

## Grammaire : scène partagée (split stage)

Deux colonnes tenues en tension sur toute la page : **à gauche l'avant**
(photographique, sombre, le matériel qui dort), **à droite l'après** (un
bordereau sobre, typographique, le service). Le séparateur est la seule chrome
propre à la page : une ligne verticale avec les libellés des deux côtés et la
progression de l'argument. Il glisse vers la gauche à mesure que l'argument
penche du côté de l'après, puis il s'effondre au bord gauche à la fin :
l'après prend toute la largeur et le formulaire s'y trouve.

Pourquoi les sept autres ont perdu :

- **Filmique en un plan.** Un argument linéaire porté par une vidéo : le choix
  de l'utilisateur est une comparaison avant/après, pas un film. Et c'est la
  forme par défaut à éviter.
- **Éditorial en chapitres.** Pour du contenu long. L'offre tient en cinq
  phrases.
- **Surface vivante.** Le produit est un service, pas un logiciel ; l'option
  « estimation en direct » n'a pas été choisie.
- **Monde continu.** Refusé explicitement par l'utilisateur.
- **Affiche typographique.** L'utilisateur veut du métal, des circuits et de
  la lumière de studio, pas une page faite seulement de mots.
- **Galerie / catalogue.** La vraie question du visiteur n'est pas « quelles
  options », c'est « est-ce que ça vaut la peine de vendre ».
- **Découpe rythmique.** Énergique et rapide : l'inverse de « calme ».

Contraintes de la grammaire respectées : rien en plein cadre avant la
résolution, pas de texte centré, pas de héros ancré dans un coin en plein
cadre, fermeture asymétrique, pas de `pan`, pas de `spotlight`, pas de
`magnet`, au plus un `scrub` (zéro ici), pas de `drift` (deux fonds, un par
côté, qui tiennent). Écart assumé : la barre de navigation globale du site
reste en place, parce que l'en-tête est hors portée (il sert tout le site).

## Signature : « La ligne de rachat »

Le séparateur est une ligne de conversion. Au pic, le lot (une palette
empilée de portables, de commutateurs, de serveurs et de postes de travail)
se défait couche par couche : chaque couche glisse vers la droite, touche la
ligne et disparaît en la traversant, et **à la hauteur exacte où elle a
traversé**, une ligne du bordereau sort de la ligne : « Portables. Rachetés. »
La palette part en dernier et devient « Ramassage et transport. Gratuit. »
Puis les conditions de paiement s'inscrivent, et la ligne s'effondre au bord
gauche. Codé dans la page (JS local qui lit la progression de l'acte), le
moteur reste intact.

## Barrière des empreintes

Registre vide (premier projet de cet utilisateur) : rien à franchir. La ligne
de cette construction sera ajoutée après la livraison.

---

## La courbe des émotions

```
1  Reconnaissance   le lot sous une seule lampe, la poussière dans le faisceau,
                    une phrase qui le nomme simplement
2  Malaise          les coûts nommés un à un pendant que chaque photo s'ouvre
                    comme un inventaire qu'on préférerait ne pas voir
3  Assurance        trois gestes de votre côté, le reste du nôtre ; seul le
                    texte bouge, rien d'autre (le calme avant le pic)
4  Émerveillement   chaque pièce traverse la ligne et devient une ligne de
   puis soulagement l'offre ; l'entrepôt se vide sous la main du visiteur
5  Résolution       la ligne a disparu, l'espace est libre, le formulaire attend
```

**Le pic (acte 4).** Ce qu'un visiteur dirait à un ami : « Je faisais défiler
et mes vieux serveurs glissaient un par un de l'autre côté d'une ligne, et
chacun devenait une ligne de l'offre de rachat. »

**La phrase.** « C'est le site où ton vieux matériel traverse une ligne et
devient une offre. »

**Silence assumé.** Au tout début de l'acte 4 (progression 0 à 0,06), le lot
reste immobile sous sa lampe ; seule la poussière dérive et le titre du
bordereau est posé. Ce n'est pas du défilement mort : c'est l'inspiration
avant le pic.

## Partition

| Acte | Battement | Dispositif | Durée | Pourquoi celui-là |
|---|---|---|---|---|
| 1 Hero | Reconnaissance | `parallax` (plans indépendants, poussée lente, réponse au pointeur) dans une scène épinglée courte + titre `kinetic` en accueil | pin 1,5 vh | Le lot doit être physique, posé dans un vrai lieu ; la scène partagée dit l'offre au premier écran |
| 2 Le coût | Tension | `reveal` (chaque photo s'ouvre d'un balayage), réponse en face | flow, ~1,9 vh | Chaque coût est un changement d'état dans l'image ; la réponse apparaît de l'autre côté |
| 3 Le processus | Substance | `kinetic` (titre double qui s'assemble) + `flow` + `in` | flow, ~1,2 vh | Calme et sûr ; c'est le silence avant le pic |
| 4 La ligne | Bascule, pic | `pin` + signature (couches qui traversent, bordereau, effondrement) | pin 3,6 vh, le plus long | Le lot part physiquement et devient une offre |
| 5 Le formulaire | Engagement | `flow` + `in` | flow, ~1,4 vh | La page cesse de bouger ; le formulaire est dans l'espace libéré |

Cinq familles (parallax, reveal, kinetic, pin, flow), jamais deux fois de
suite, zéro `scrub`, le pic a la plus grande durée, total d'environ 9,6 hauteurs
d'écran sur cinq actes.

## Contrat de couches du hero

| Plan | Visuel et profondeur | Mouvement indépendant | Règle de contact / occlusion |
|---|---|---|---|
| Fond | Plaque de la pièce vide (béton, une lampe) | Le plus faible (poussée 1,00 → 1,03) | Aucun lot dans la plaque |
| Atmosphère arrière | Cône de lumière et poussière fine, fusion « screen » | Dérive lente propre | Ne délave pas le lot |
| Sujet | Le lot détouré (alpha réel) + ombre de contact | Poussée 1,00 → 1,07, pointeur ±7 px | L'ombre reste sous la palette |
| Avant-plan | Grosses poussières floues près de l'objectif, « screen » | Le plus fort (1,00 → 1,20, pointeur ±18 px) | Jamais sur le texte |
| Typographie | HTML réel : phrase avant (sur la photo), titre après (sur le bordereau) | Stable | Le titre reste lisible du début à la fin |

Ouverture : la scène est déjà complète avant le défilement. Milieu : la caméra
avance doucement vers le lot, la poussière proche passe devant, une étiquette
de musée apparaît à côté du lot. Sortie : la scène remonte d'un bloc et laisse
place aux lignes du coût, le séparateur continue.

Mobile : la scène partagée devient verticale (la photo en haut, le bordereau
en bas, séparateur horizontal) ; au pic, les couches sortent par la droite et
les lignes du bordereau s'ajoutent en dessous.

## Préambule de style (verbatim dans chaque requête d'image)

> Industrial still-life photography on a medium-format camera with a long
> 150mm lens from far away, so perspective is flat and frontal. One soft
> overhead key light directly above and slightly in front of the subject, a
> dim cool ambient fill, deep falloff into near-black shadow. Grade: graphite
> black, cold steel greys, a faint warm tungsten edge on the highlights,
> desaturated mid-tones. Texture: fine film grain, real dust on matte metal,
> small scuffs, honest wear. Photographic realism. NOT 3D render, NOT CGI, NOT
> illustration, NOT clay, no digital glow, no plastic sheen, no readable text,
> no stickers, no logos, no brand names.
