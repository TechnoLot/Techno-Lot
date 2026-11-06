---
name: Techno Lot
description: Le feu vert dans la nuit, pour le site public et pour l'admin
colors:
  bleu-nuit: "#0A0F1C"
  bleu-nuit-profond: "#060A14"
  bleu-nuit-releve: "#16203A"
  lime-signal: "#6BD63B"
  vert-soutenu: "#5ECB33"
  emeraude-degrade: "#34D399"
  vert-texte: "#2B7A10"
  vert-feuille: "#2E8B14"
  vert-profond: "#0E3A20"
  menthe-pale: "#E8F5E0"
  encre: "#0A0A0A"
  mousse: "#4F5650"
  blanc: "#FFFFFF"
  gris-vert-pale: "#F1F5EF"
  admin-fond: "#F4F7F2"
  admin-filet: "#E3EADF"
  admin-filet-fort: "#C9D6C3"
  admin-vert-action: "#257A10"
  admin-danger: "#B42318"
  admin-alerte: "#B54708"
typography:
  display:
    fontFamily: "Chakra Petch, sans-serif"
    fontSize: "5.5rem"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Chakra Petch, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Chakra Petch, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Chakra Petch, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.1em"
  admin-body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  admin-champ: "10px"
  champ: "14px"
  admin-carte: "16px"
  carte: "20px"
  panneau: "28px"
  pilule: "9999px"
spacing:
  gouttiere-mobile: "20px"
  gouttiere: "32px"
  chapitre-mobile: "80px"
  chapitre: "112px"
components:
  button-primary:
    backgroundColor: "{colors.vert-soutenu}"
    textColor: "{colors.encre}"
    typography: "{typography.label}"
    rounded: "{rounded.pilule}"
    padding: "0.95rem 1.75rem"
  button-primary-sur-lime:
    backgroundColor: "{colors.bleu-nuit}"
    textColor: "{colors.blanc}"
    rounded: "{rounded.pilule}"
    padding: "0.95rem 1.75rem"
  button-ink:
    backgroundColor: "{colors.bleu-nuit}"
    textColor: "{colors.blanc}"
    rounded: "{rounded.pilule}"
    padding: "0.95rem 1.75rem"
  button-ink-hover:
    backgroundColor: "{colors.bleu-nuit-releve}"
  admin-button-primary:
    backgroundColor: "{colors.admin-vert-action}"
    textColor: "{colors.blanc}"
    rounded: "{rounded.pilule}"
    padding: "0.625rem 1.25rem"
  admin-button-secondary:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.encre}"
    rounded: "{rounded.pilule}"
    padding: "0.625rem 1.25rem"
  champ-public:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.encre}"
    rounded: "{rounded.champ}"
    padding: "0.75rem 1rem"
    height: "3rem"
  admin-champ:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.encre}"
    rounded: "{rounded.admin-champ}"
    padding: "0.625rem 0.875rem"
  admin-carte:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.encre}"
    rounded: "{rounded.admin-carte}"
---

# Design System: Techno Lot

## Overview

**Creative North Star: "Le Signal Vert"**

Un feu vert dans la nuit. Le bleu nuit (#0A0F1C) tient le fond, et le lime (#6BD63B) arrive là où quelque chose se confirme : une action à faire, une valeur reconnue, un état réglé. Cette logique vaut pour tout le système. Sur le site public, elle devient spectacle mesuré ; dans l'admin, elle devient repère de travail.

Le système a deux registres. Le site public avance par chapitres de couleur pleine largeur, collés les uns aux autres, avec de très grands titres en Chakra Petch. L'admin est clair et précis par défaut, avec une version sombre en bleu nuit, une barre latérale bleu nuit dans les deux cas, et des filets plutôt que des ombres. Les deux partagent les polices, la pilule et le même vert.

Le ton est franc et rassurant : professionnel, accueillant et premium. Les éléments se voient du premier coup, disent ce qu'ils font et ne cherchent pas à impressionner par la complexité.

Le ciel du héros est un vrai ciel de nuit au-dessus de Montréal (catalogue Yale BSC5), en étoiles vertes. Quadrillages, taches vertes floues et réseaux de points reliés ont été écartés parce qu'ils faisaient « généré par IA ».

**Key Characteristics:**
- Le bleu nuit porte, le lime signale.
- Chapitres d'aplat pleine largeur, sans séparateur, sur le site public.
- Chakra Petch pour la voix, Inter pour le texte.
- La pilule pour tout ce qu'on clique.
- Admin sobre : filets, couleurs d'état, densité.

## Colors

Une palette bleu nuit et verts, où chaque vert a un rôle précis selon le fond qu'il touche.

### Primary
- **Lime Signal** (#6BD63B) : le vert du logo. Aplats de chapitre, élément actif du menu, sélection de texte, texte sur fond sombre (9,6:1 sur bleu nuit). Texte encre dessus (10,7:1), jamais blanc.
- **Vert Soutenu** (#5ECB33) : départ du dégradé des boutons principaux et accent `accent` historique.
- **Émeraude de Dégradé** (#34D399) : arrivée du dégradé `linear-gradient(120deg, #5ECB33, #34D399)`. Ne s'utilise que dans ce dégradé.

### Secondary
- **Vert Texte** (#2B7A10) : le vert lisible sur blanc (5,4:1). Liens, mots en accent et focus du site public sur fond clair.
- **Vert Profond** (#0E3A20) : chapitres sombres et héros verts (lime 7:1, blanc 12,8:1).
- **Vert Feuille** (#2E8B14) : poignée de la barre de défilement et usages moyens. Contraste juste (4,4:1 avec du blanc) : pas pour du petit texte.
- **Vert Action de l'Admin** (#257A10) : boutons principaux de l'admin, texte blanc (5,4:1). En sombre, le vert de rôle passe à #8BE95F.

### Tertiary
- **Bleu Relevé** (#16203A) : survol des boutons bleu nuit.
- Les teintes d'état de l'admin (`--a-tint-*`, ambre, rouge, bleu, violet, cyan, chacune avec son encre) servent seulement à porter un statut. La source complète, en clair et en sombre, est `app/admin/admin.css`.

### Neutral
- **Bleu Nuit** (#0A0F1C) : héros, chapitres `night`, barre latérale de l'admin, boutons foncés.
- **Bleu Nuit Profond** (#060A14) : fond de l'admin en sombre.
- **Encre** (#0A0A0A) : texte sur fond clair, barre de navigation publique.
- **Mousse** (#4F5650) : texte secondaire sur blanc.
- **Menthe Pâle** (#E8F5E0) : chapitres clairs.
- **Gris-Vert Pâle** (#F1F5EF) : bandes de surface sur blanc.
- **Fond de l'Admin** (#F4F7F2), **Filet** (#E3EADF) et **Filet Fort** (#C9D6C3) : la structure de l'admin clair.

### Named Rules
**La Règle du Feu Vert.** Le lime dit quelque chose : action, état actif, confirmation, valeur. S'il ne signale rien, il n'a rien à faire là.

**La Règle du Bon Vert.** Le vert se choisit selon le fond : lime sur sombre, #2B7A10 sur blanc, #1F630C sur menthe, #0E3A20 sur lime. Les variables de `data-theme` font ce choix : utiliser `text-emerald`, pas une valeur en dur.

**La Règle de l'Inversion.** Sur un aplat lime, le bouton principal passe en bleu nuit, texte blanc. Du vert sur du vert ne se lit pas.

## Typography

**Display Font:** Chakra Petch (repli sans-serif), graisses 400, 600 et 700 seulement
**Body Font:** Inter (repli ui-sans-serif, system-ui)

**Character:** Chakra Petch apporte des coins coupés, techniques, reconnaissables dès le logo. Inter reste neutre et travaille en silence, pour que la voix de la marque tienne dans les titres et les boutons.

### Hierarchy
- **Display** (700, 2.75rem à 5.5rem selon la largeur, 0.98, -0.03em) : titres des en-têtes de pages. Version compacte : 2.375rem à 3.75rem.
- **Headline** (700, 2.125rem à 3.5rem, 1.02, -0.025em) : titres de sections, avec `text-balance`.
- **Title** (700, 1.375rem, 1.15) : titres de cartes et d'étapes.
- **Body** (400, 17 à 19 px, 1.6) : introductions et texte courant, 42rem au plus de largeur pour le sous-titre.
- **Label** (600, 12 à 14 px, 0.1em, majuscules) : boutons publics en Chakra Petch.
- **Admin** (titre de page `.admin-h1` 28 à 32 px gras, titre de section `.admin-h2` 18 px semi-gras, Inter 13 à 15 px pour le contenu, chiffres alignés partout).

### Named Rules
**La Règle du Titre Seul.** Sur le site public, aucun surtitre au-dessus d'un titre. Le titre porte seul. Les props `eyebrow` qui restent dans le code sont ignorées et ne doivent pas être réactivées.

**La Règle du Français.** Toute échelle se teste avec le vrai texte français et anglais. Les mots québécois sont longs : ce sont eux qui décident si un titre tient.

## Layout

Conteneur centré commun à tout le site : `max-w-6xl` (72rem), gouttières de 20 px puis 32 px dès `sm`. Une section publique est un chapitre pleine largeur, `py-20` puis `sm:py-28`, collé au suivant sans séparateur. Le changement de couleur fait office de rythme.

L'en-tête public est fixe et toujours visible sur tous les formats : barre noire de 40 px, puis navigation de 72 px (`--site-header-h: 112px`). Il ne se masque jamais au défilement. Les héros passent dessous avec `data-under-header`.

L'admin garde une barre latérale de 248 px dès `lg`, et une barre haute avec menu coulissant plus petit. Ses pages utilisent un conteneur de 1400 px, gouttières 16, 32 puis 40 px, avec le même en-tête (`PageHeader` ou `.admin-h1`). Les points de rupture sont ceux de Tailwind par défaut. La mise en page change de structure à ces seuils, sans typographie fluide.

## Elevation & Depth

Le système est plat au repos. La profondeur vient d'abord du changement de couleur, entre chapitres sur le site public et entre filets dans l'admin. L'ombre n'apparaît que pour une raison : réponse au survol, élément flottant ou état actif.

### Shadow Vocabulary
- **Lueur de Bouton** (`box-shadow: 0 0 0 1px rgba(94,203,51,.35), 0 12px 34px -8px rgba(94,203,51,.55)`) : survol et focus du bouton principal seulement.
- **Ombre Bleu Nuit** (`box-shadow: 0 14px 30px -12px rgba(6,10,20,.6)`) : survol des boutons foncés.
- **Carte Publique** (`box-shadow: 0 1px 2px rgba(10,10,10,.04), 0 8px 28px rgba(10,10,10,.06)`) : cartes posées sur un chapitre clair.
- **Fenêtre Admin** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 24px 64px -20px rgba(2,6,16,.9)`) : surcouches et menus flottants de l'admin.

### Named Rules
**La Règle de la Lueur Méritée.** La lueur verte se gagne au survol. Rien ne brille au repos.

## Shapes

Trois familles de formes. La pilule (9999px) pour tout ce qui se clique ou se filtre : boutons, segments, statuts, langues. Les rayons doux pour ce qui contient : 16 px pour les cartes de l'admin, 20 px pour les cartes publiques, 28 px pour les grands panneaux comme le formulaire et les bandeaux d'appel. Les champs sont entre les deux : 14 px sur le site public, 10 px dans l'admin.

Le nom `.glass` de l'admin est historique : c'est une carte opaque, blanche, à filet. Aucun verre ni flou de décor.

## Components

### Buttons
Francs et rassurants : on les voit tout de suite, et ils disent ce qu'ils font.
- **Shape :** pilule (9999px).
- **Primary (public) :** dégradé lime → émeraude à 120°, texte encre, Chakra Petch 600, majuscules à 0.1em, padding 0.95rem × 1.75rem, flèche qui avance de 4 px au survol.
- **Hover / Focus :** Lueur de Bouton et `brightness(1.06)` ; au clic, `translateY(1px) scale(.98)`. Focus de 2 px décalé de 3 px.
- **Ghost :** contour de 1,5 px qui suit le thème, passe au vert au survol.
- **Ink :** bleu nuit texte blanc ; s'inverse en blanc sur les fonds sombres.
- **Pill :** libellé plus pastille ronde de 40 px avec flèche, pour un appel plus marqué.
- **Admin :** pilule #257A10, texte blanc, Inter semi-gras 14 px, sans majuscules, 150 ms. Secondaire blanc à Filet Fort. Version compacte `.admin-btn` à 12 px.

### Chips
- **Statuts de l'admin :** pilule teintée, point de 6 px, 12 px medium, couleur de la teinte d'état. Ambre négocié, vert acheté, bleu vendu, gris annulé.
- **Filtres :** `.admin-segment`, pilule à filet, défilement horizontal sans barre.

### Cards / Containers
- **Admin :** `.glass` et `.admin-card`, blanc, filet #E3EADF, 16 px, sans ombre ; le filet se renforce au survol.
- **Public :** 20 px ou 28 px ; au sein d'un chapitre, `bg-surface` suit le thème.
- **Bandeau d'appel :** panneau de 28 px, padding 40 à 56 px, aplat de chapitre.

### Inputs / Fields
- **Public (`.tlf-field`) :** hauteur 3rem, 14 px, Filet Fort du thème, fond blanc ou blanc à 4 % sur sombre.
- **Admin (`.field`) :** 10 px, texte 14 px, focus bordure lime et anneau lime à 40 %.
- **Erreur :** bordure #B42318 (#FDA29B sur fond sombre), message qui nomme le problème.

### Navigation
- **Public :** barre noire supérieure en lime (téléphone, phrase de marque, langue), navigation noire de 72 px, Chakra Petch 15 px ; lien actif en lime ; bouton Soumission toujours présent. Sur téléphone, menu plein écran.
- **Admin :** barre latérale bleu nuit, ligne active en pastille lime de 10 px de rayon, texte encre dessus ; icônes lucide-react sans tuile autour.

### Bande de chiffres
`.admin-stats` et `.admin-stat` : plusieurs chiffres dans une seule carte, séparés par des filets. Le chiffre clé passe en vert ; aucune tuile lime.

### Ciel et verre de l'admin (composant signature)
Tout l'admin est posé sur le ciel d'étoiles vertes, fixé derrière le contenu (`.admin-fond`) : matin menthe en clair, nuit en sombre. Il est animé sur l'accueil et fixe ailleurs, pour que le verre reste fluide. Toutes les cartes sont des plaques de verre, réglées d'un seul endroit dans `app/admin/admin.css` ; les fenêtres et les menus flottants restent opaques, et sur téléphone le verre devient plein. L'accueil montre « À faire aujourd’hui », puis « Nos profits » en double contour (`.admin-cadre` + `.admin-verre`), avec le profit comme plus grand chiffre de l'admin.

### Chapitres (composant signature)
`Section` et `data-theme` : `night`, `deep`, `lime`, `mint`, `light`, `dark`. Chaque thème redéfinit les variables `--tl-*` pour que texte, surfaces, filets et bouton s'accordent seuls. Les noms `sand` et `cream` sont du passé : ne pas les reprendre.

### Ciel d'Étoiles (composant signature)
`CielEtoiles` : canvas d'étoiles vertes au-dessus de Montréal, lueur d'horizon verte, image fixe en mouvement réduit. Dans les héros seulement. Les étoiles restent vertes.

## Do's and Don'ts

### Do:
- **Do** utiliser `text-mist`, `text-moss`, `text-emerald`, `bg-surface` et `border-line` sur le site public pour que le thème de section fasse le travail.
- **Do** utiliser les classes `admin-*` et les variables `--a-*` dans l'admin, pour que les modes clair et sombre tiennent sans effort.
- **Do** garder un contraste de 4,5:1 pour le texte courant ; les ratios sont notés à côté des couleurs dans `app/site.css` et `app/admin/admin.css`.
- **Do** dessiner les icônes avec lucide-react, en une seule épaisseur.
- **Do** respecter `prefers-reduced-motion` : le ciel devient une image fixe.
- **Do** faire les entrées du héros en CSS pur (`.hero-item`, `.hero-word`) : rien n'attend le JavaScript, pour protéger le LCP.
- **Do** livrer la version simple dans l'admin, dans le style existant.

### Don't:
- **Don't** mettre de surtitre au-dessus d'un titre public.
- **Don't** remettre de quadrillage, de taches vertes floues, de réseau de points reliés ni de balayage derrière le héros.
- **Don't** mettre de voie lactée blanche ni d'étoiles blanches.
- **Don't** utiliser de portable en 3D, ni de compteur « N appareils » sur la palette du héros.
- **Don't** masquer l'en-tête au défilement.
- **Don't** utiliser le fond sable : ce n'est pas l'identité de la marque.
- **Don't** appliquer du texte en dégradé, ni du verre sans le ciel derrière lui.
- **Don't** poser une barre colorée de plus de 1 px sur le côté d'une carte, d'une ligne ou d'un événement.
- **Don't** aligner des tuiles de chiffres identiques dans l'admin : une seule bande.
- **Don't** mettre du texte blanc sur le lime.
- **Don't** ajouter de chandelles ni de tableau complexe aux graphiques de l'admin : ils restent simples.
