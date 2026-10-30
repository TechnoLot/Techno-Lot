# Audit de performance — technolot.ca

- Date : 29 octobre 2026.
- Version auditée : branche `dev`, commit `93a61fb`. Les deux commits poussés depuis ne touchent que l'admin.
- Ce rapport décrit la **prochaine mise en ligne**, pas le site actuellement en ligne. Celui-ci (branche `main`, chez Hostinger) a 54 commits de retard sur `dev`.
- Aucune modification du site n'a été faite pendant cet audit. Les corrections sont proposées à la section 9 ; celles qui changent quoi que ce soit de perceptible attendent votre accord.
- **Mise à jour du 30 octobre 2026** : les corrections approuvées (phase 2) sont faites et mesurées de nouveau (phase 3). Le bilan suit ; les sections 1 à 10 décrivent l'état de départ.

---

## Bilan après optimisation (phases 2 et 3)

- Version mesurée : branche `performance-optimization`, commit `ffa2866` (55 commits sur `93a61fb`). Même banc, mêmes 13 pages, mêmes profils et mêmes réglages qu'à l'audit (section 2).
- Les optimisations ont ensuite été fusionnées dans la nouvelle version de `dev` (Next 15, React 19), puis vérifiées de nouveau : voir « Vérification sur la nouvelle version de `dev` (Next 15) ».
- Rien n'est en ligne : les changements sont sur `dev` et attendent votre « mets en ligne ».

### En bref

- **Ordinateur rapide** : déjà excellent, il le reste. Lighthouse 100 sur les 13 pages (99–100 avant), LCP de 0,27 à 0,80 s.
- **Ordinateur lent (processeur 6×)** :
  - défilement de 16–46 à **28–53 images par seconde (i/s)** ;
  - réactivité au clic (INP) de 216–408 ms à **40–232 ms** : 11 pages sur 13 répondent en moins de 200 ms, contre aucune avant ;
  - plus aucun décalage pendant le défilement (accueil 0,110 → 0 ; Estimation 0,115 → 0,007).
- **Téléphone (Android milieu de gamme émulé)** :
  - score PageSpeed de 82–100 à **88–100** : 11 pages sur 13 à 90 ou plus, contre 4 ;
  - Lighthouse en conditions réelles de 72–91 à **79–95** : 9 pages sur 13 à 90 ou plus, contre 3 ;
  - temps de blocage au chargement (TBT) de 152–1 492 ms à **103–817 ms** ;
  - défilement de 31–54 à **40–57 i/s** ;
  - réactivité au toucher : **toutes les pages sous 200 ms** sur Android (80–168 ms ; avant 144–232 ms) ;
  - décalages de l'accueil supprimés : 0,141 → **0** (0,228 → **0** pour l'accueil anglais).
- **Moins de données** (chargement mobile réel, total transféré) : accueil 531 → 412 Ko, blogue 704 → 437 Ko, Contact 414 → 360 Ko, FAQ 393 → 335 Ko. Les 4 feuilles CSS ne sont plus retéléchargées après l'affichage.
- **Apparence inchangée**, hors changements approuvés : voir « Vérification visuelle et fonctionnelle » plus bas.
- **Objectifs du banc** : 201 atteints sur 273 (176 avant).

### Tableaux AVANT → APRÈS

Lecture : « avant → **après** ». Mêmes définitions qu'aux sections 3, 5 et 7. INP = clic ou toucher le plus lent du scénario de la page.

#### Ordinateur

| Page | Lighthouse (sur 100) | LCP | INP 1× | INP 6× | Défilement 6× (i/s) | Images ratées 6× | CLS au défilement 6× |
|---|---|---|---|---|---|---|---|
| Accueil | 100 → **100** | 0,82 s → **0,80 s** | 56 ms → **64 ms** | 408 ms → **216 ms** | 16,4 → **28,1** | 70,0 % → **52,4 %** | 0,110 → **0,000** |
| Accueil EN | 100 → **100** | 0,82 s → **0,80 s** | 56 ms → **48 ms** | 288 ms → **96 ms** | 20,4 → **33,6** | 59,5 % → **42,7 %** | 0,124 → **0,000** |
| À propos | 100 → **100** | 0,76 s → **0,72 s** | 56 ms → **56 ms** | 216 ms → **96 ms** | 22,7 → **33,8** | 61,1 % → **42,7 %** | 0,019 → **0,002** |
| Contact | 100 → **100** | 0,75 s → **0,64 s** | 32 ms → **32 ms** | 272 ms → **48 ms** | 33,7 → **52,7** | 20,0 % → **12,6 %** | 0,000 → **0,000** |
| Soumission⁴ | 99 → **100** | 0,90 s → **0,59 s** | 40 ms → **52 ms** | 256 ms → **232 ms** | 30,1 → **49,9** | 34,8 % → **16,0 %** | 0,000 → **0,000** |
| FAQ | 100 → **100** | 0,82 s → **0,27 s** | 32 ms → **24 ms** | 272 ms → **120 ms** | 36,2 → **46,0** | 24,3 % → **28,4 %** | 0,000 → **0,000** |
| Blogue | 99 → **100** | 0,86 s → **0,62 s** | 40 ms → **32 ms** | 248 ms → **48 ms** | 24,7 → **44,2** | 45,8 % → **25,7 %** | 0,000 → **0,000** |
| Article¹ | 100 → **100** | 0,77 s → **0,69 s** | 24 ms → **16 ms** | 256 ms → **40 ms** | 45,8 → **52,8** | 15,8 % → **12,6 %** | 0,000 → **0,000** |
| Estimation | 100 → **100** | 0,73 s → **0,71 s** | 40 ms → **48 ms** | 240 ms → **176 ms** | 22,3 → **33,5** | 52,3 % → **34,6 %** | 0,115 → **0,007** |
| Ce que nous rachetons | 100 → **100** | 0,73 s → **0,71 s** | 48 ms → **56 ms** | 240 ms → **56 ms** | 38,2 → **41,1** | 33,0 % → **38,0 %** | 0,000 → **0,000** |
| Prise en charge | 100 → **100** | 0,80 s → **0,72 s** | 56 ms → **72 ms** | 232 ms → **96 ms** | 19,8 → **33,5** | 64,4 % → **34,1 %** | 0,004 → **0,002** |
| Catégorie (serveurs) | 99 → **100** | 0,89 s → **0,59 s** | 48 ms → **48 ms** | 296 ms → **72 ms** | 42,6 → **42,7** | 24,0 % → **31,5 %** | 0,000 → **0,000** |
| Ville (Montréal) | 100 → **100** | 0,73 s → **0,61 s** | 48 ms → **48 ms** | 280 ms → **80 ms** | 41,2 → **41,2** | 25,1 % → **33,5 %** | 0,000 → **0,000** |

Défilement en ordinateur rapide (1×) : 56,1–60 → 56,7–60 i/s ; l'accueil reste juste sous l'objectif (56,7 i/s, 4,7 % d'images ratées).

#### Mobile (Android milieu de gamme émulé : 4G lent + processeur 4×)

| Page | PageSpeed (simulé) | Lighthouse réel | LCP réel | TBT réel | INP Android | INP iPhone² | Défilement Android (i/s) | Images ratées | CLS au défilement |
|---|---|---|---|---|---|---|---|---|---|
| Accueil | 82 → **89** | 72 → **83** | 2,02 s → **1,81 s** | 1419 ms → **635 ms** | 216 ms → **144 ms** | 224 ms → **200 ms** | 33,6 → **42,0** | 38,0 % → **27,5 %** | 0,141 → **0,000** |
| Accueil EN | 82 → **88** | 73 → **79** | 1,91 s → **1,86 s** | 1492 ms → **817 ms** | 208 ms → **160 ms** | 232 ms → **200 ms** | 31,4 → **39,9** | 44,7 % → **29,9 %** | 0,228 → **0,000** |
| À propos | 88 → **91** | 85 → **90** | 1,71 s → **1,66 s** | 549 ms → **385 ms** | 144 ms → **144 ms** | 144 ms → **152 ms** | 37,8 → **48,6** | 31,7 % → **18,5 %** | 0,007 → **0,003** |
| Contact | 92 → **95** | 90 → **93** | 1,93 s → **1,93 s** | 387 ms → **291 ms** | 152 ms → **152 ms** | 152 ms → **128 ms** | 51,5 → **55,7** | 11,4 % → **7,3 %** | 0,000 → **0,000** |
| Soumission⁴ | 90 → **95** | 91 → **93** | 1,62 s → **1,56 s** | 363 ms → **295 ms** | 168 ms → **156 ms** | 176 ms → **152 ms** | 49,3 → **55,9** | 13,3 % → **6,9 %** | 0,000 → **0,000** |
| FAQ | 89 → **96** | 88 → **92** | 1,92 s → **1,88 s** | 455 ms → **323 ms** | 168 ms → **168 ms** | 160 ms → **184 ms** | 45,4 → **55,8** | 17,5 % → **6,8 %** | 0,000 → **0,000** |
| Blogue | 87 → **94** | 88 → **95³** | 2,62 s → **1,71 s** | 362 ms → **244 ms** | 160 ms → **120 ms** | 176 ms → **104 ms** | 47,5 → **56,6** | 16,5 % → **6,0 %** | 0,000 → **0,000** |
| Article¹ | 100 → **100** | 90 → **82³** | 2,75 s → **4,08 s** | 152 ms → **103 ms** | 232 ms → **80 ms** | 168 ms → **96 ms** | 53,8 → **56,7** | 9,1 % → **5,8 %** | 0,000 → **0,000** |
| Estimation | 89 → **92** | 86 → **92** | 1,63 s → **1,66 s** | 521 ms → **330 ms** | 144 ms → **112 ms** | 144 ms → **112 ms** | 37,2 → **46,8** | 34,8 % → **18,4 %** | 0,008 → **0,005** |
| Ce que nous rachetons | 91 → **93** | 87 → **90** | 1,68 s → **1,67 s** | 495 ms → **399 ms** | 152 ms → **120 ms** | 160 ms → **112 ms** | 48,3 → **52,5** | 17,7 % → **14,3 %** | 0,000 → **0,000** |
| Prise en charge | 87 → **92** | 81 → **88** | 1,62 s → **1,53 s** | 749 ms → **480 ms** | 144 ms → **112 ms** | 144 ms → **136 ms** | 36,9 → **46,1** | 37,9 % → **24,2 %** | 0,060 → **0,062** |
| Catégorie (serveurs) | 87 → **96** | 80 → **90** | 1,91 s → **1,91 s** | 821 ms → **366 ms** | 168 ms → **120 ms** | 176 ms → **128 ms** | 51,6 → **53,3** | 12,7 % → **12,4 %** | 0,000 → **0,000** |
| Ville (Montréal) | 87 → **96** | 79 → **90** | 1,91 s → **2,02 s** | 889 ms → **374 ms** | 192 ms → **112 ms** | 176 ms → **128 ms** | 49,5 → **54,3** | 14,9 % → **9,7 %** | 0,000 → **0,000** |

Changement de page au clic sur Android, après 30 s sur le site : 1 016–1 236 ms → **358–860 ms** (P56). Au premier passage, les temps sont semblables (431–2 380 ms → 492–2 145 ms).

Notes :
1. **Article** : la page mesurée est le premier article de la liste du blogue. De nouveaux articles Soro ont été publiés depuis l'audit : ce n'est donc plus le même. L'article d'avant n'avait pas d'image vedette (son LCP était un paragraphe) ; celui d'après en a une, qui devient l'élément LCP. La comparaison n'est qu'indicative.
2. **iPhone** : gabarit d'iPhone simulé dans Chrome, pas Safari.
3. **Blogue et article** : mesurés de nouveau sur un build neuf. La campagne a tourné plus d'une heure après le build ; le blogue avait alors été régénéré (ISR) sans son CSS intégré. C'est le problème P28, qui touchera aussi la production (voir plus bas).
4. **Soumission** : INP après = médiane de 4 passages. La campagne a mesuré une seule fois 152 ms en 1× ; 3 reprises ont donné 48, 56 et 48 ms. En 6× : 328, 224, 240 et 216 ms.

### Objectifs : atteints et manqués

Entre parenthèses : le nombre de pages conformes sur 13, avant → après.

| Objectif | Seuil | Ordinateur lent (6×) | Téléphone (Android 4×) |
|---|---|---|---|
| Score Lighthouse | ≥ 90 | ✓ 100 partout (13 → 13)⁵ | ✗ PageSpeed 88–100 (4 → 11) ; réel 79–95 (3 → 9) |
| LCP | < 2,5 s | ✓ 0,27–0,80 s (13 → 13)⁵ | ✗ PageSpeed 2,80–3,76 s, article 1,06 s (1 → 1) ; ✗ réel 1,53–2,02 s, article 4,08 s (11 → 12) |
| CLS (chargement et défilement) | < 0,1 | ✓ ≤ 0,016 (10 → 13) | ✓ ≤ 0,062 (11 → 13) |
| INP | < 200 ms | ✗ 40–232 ms (0 → 11) | ✓ Android 80–168 ms (10 → 13) ; ✗ iPhone simulé 96–200 ms (11 → 11) |
| TBT | < 200 ms | ✓ 0–4 ms (13 → 13)⁵ | ✗ réel 103–817 ms (1 → 1) |
| Défilement fluide | 60 i/s | ✗ 28–53 i/s (0 → 0) | ✗ 40–57 i/s (0 → 0) |

5. Lighthouse en configuration ordinateur ne ralentit pas le processeur : ces trois lignes valent pour un ordinateur ordinaire.

### Objectifs non atteints, et pourquoi

1. **Défilement à 60 i/s sur appareil lent (aucune page, ni avant ni après).**
   - Gain net partout sur téléphone : +2 à +11 i/s ; les pages simples atteignent 53–57 i/s.
   - Le banc lui-même plafonne autour de 57 i/s sur Android : l'article, page la plus légère, fait 56,7 i/s avec 5,8 % d'images ratées.
   - Le reste du coût vient surtout des ciels étoilés qui scintillent en permanence, et des scènes animées de l'accueil (palette, destruction, héros). Les leviers suivants changent ce qu'on voit : ciel à 30 i/s au repos (Q4, « attendre »), variantes allégées sur appareils lents (Q12, « attendre »).
   - Ordinateur 4× et 6× : voir « Défilement lissé (P2) » ci-dessous.
2. **Score mobile sous 90 : accueil (89 ; 83 en conditions réelles), accueil anglais (88 ; 79), Prise en charge (88 en réel), article (82 en réel).**
   - L'accueil reste la page la plus animée. Son TBT réel a diminué de moitié (1 419 → 635 ms), mais il reste au-dessus de 200 ms. La cause : le ciel du héros et le réveil (hydratation) des scènes interactives pendant le chargement.
   - Leviers restants, tous perceptibles : ciel à 30 i/s ou démarré après le chargement (Q4) ; catalogue d'étoiles et scènes chargés à l'approche (P21, P23, Q9) ; variantes allégées (Q12).
3. **LCP simulé (PageSpeed) au-dessus de 2,5 s sur 12 pages.**
   - Le retéléchargement du CSS est corrigé (P27). Le LCP réel est bon : 1,53 à 2,02 s sur 12 pages sur 13.
   - La simulation de PageSpeed place encore sur le chemin de l'affichage tout le JavaScript demandé avant le LCP. L'écart entre le simulé et le réel est un effet de la méthode de calcul.
4. **Article : LCP réel de 4,08 s.**
   - Les articles sont rendus à la demande : ils n'ont pas le CSS intégré (3 feuilles bloquantes, premier affichage à 2,65 s).
   - Leur image vedette apparaît ensuite en fondu, une fois la page réveillée.
   - Le correctif est P28 (Q7, « plus tard »). Le même problème touchera le blogue en production, une heure après chaque déploiement : il est régénéré sans CSS intégré, et son LCP passe alors de 1,71 s à environ 3,7 s, d'après la mesure faite pendant la campagne.
5. **INP sur ordinateur lent : accueil 216 ms et soumission 232 ms.**
   - Accueil : étape 3 de « Comment ça marche » (408 → 216 ms ; le camion est préparé hors du clic, P6).
   - Soumission : cocher la première catégorie (256 → 232 ms en médiane), c'est-à-dire le nouveau rendu du formulaire par React.
   - Sur téléphone, toutes les pages sont sous 200 ms sur Android. L'iPhone simulé est à 200 ms pile sur l'accueil (ouverture du menu), ce qui manque l'objectif de justesse.
6. **TBT réel sur téléphone au-dessus de 200 ms (12 pages).** Même cause que le point 2 : les ciels animés et le réveil des pages. Il a baissé de 20 à 59 % selon la page.

### Vérification visuelle et fonctionnelle

- 50 adresses (toutes les pages publiques, en français et en anglais) capturées sur ordinateur, téléphone et téléphone à l'horizontale (282 captures), puis comparées pixel à pixel avec l'état de départ.
- **0 régression fonctionnelle** : mêmes titres, mêmes codes de réponse, aucune erreur.
- **234 captures identiques au pixel près.** Les 48 autres sont toutes expliquées :
  - héros de l'accueil tenu dans l'écran sur téléphone à l'horizontale (P50, approuvé) ;
  - images du blogue recompressées par l'optimiseur (Q6, approuvé) ;
  - objets de la palette servis à la bonne taille sur téléphone (P36), d'où quelques pixels de rééchantillonnage ;
  - étapes épinglées de Prise en charge décalées d'un pixel sur téléphone (P7) ;
  - écarts minimes (≤ 0,3 %) : lissage des textes et des pastilles.
- Les ciels étoilés redessinés autrement (P16) donnent exactement les mêmes pixels (388 canevas comparés).

### Vérification sur la nouvelle version de `dev` (Next 15)

Pendant la phase 3, `dev` a reçu 34 commits d'une autre session : Next 15.5 et React 19, une politique de sécurité du contenu (CSP) imposée, la double authentification de l'admin et des tests de sécurité. Les optimisations ont été fusionnées dans cette version, puis tout a été vérifié de nouveau avec la même base des deux côtés : `dev` (`051decf`) contre `dev` avec les optimisations (`d41ab3f`).

- **Fusion** : un seul conflit (`lib/posts.ts`), réglé en reportant P34 dans le nouveau `lib/blog-sanitize.ts`. Une correction de type pour React 19 dans la barre de chargement (P48). Types, tests de `dev` (590), contrôle des gardes de l'admin et build : OK.
- **Commits arrivés pendant les mesures** : le plafond quotidien du formulaire (`b1f0f34`) et la nouvelle présentation du courriel des soumissions (`13b5d8f`) ont été fusionnés ensuite, types et tests repassés. Ils ne touchent que le serveur, aucune page mesurée.
- **Captures** : 50 adresses en 3 formats (113 contrôles), **0 anomalie** avec les optimisations. Les écarts visuels sont exactement ceux de la campagne principale : mêmes captures, mêmes zones, mêmes pourcentages (héros à l'horizontale P50, images du blogue, étapes de Prise en charge). L'accueil sur ordinateur, en français et en anglais, est identique au pixel près (écart maximal 0,005 %)⁶.
- **Mesures**, `dev` → **`dev` avec les optimisations** :

| Mesure | Ordinateur | Téléphone (Android 4×) |
|---|---|---|
| Lighthouse (13 pages) | 99–100 → **100** | PageSpeed 82–100 → **88–100** ; pages à 90 ou plus : 8 → **11**⁷ |
| Accueil | TBT 18 → **0** ms ; anglais 73 → **0** ms | PageSpeed 82 → **89** ; anglais 82 → **91** ; TBT 277 → **138** ms |
| Défilement (6 pages) | 6× : 22,0–45,5 → **26,3–51,4** i/s | 34,2–53,1 → **39,5–56,9** i/s |
| INP (accueil, Soumission, FAQ, blogue) | 6× : 256–312 → **40–200** ms | 168–208 → **96–168** ms ; iPhone simulé 168–240 → **64–168** ms |
| Changement de page (clic → titre affiché, 6 trajets) | 1× : −18 à −27 % ; 6× : −6 à −9 % | égal au premier passage, −8 % au second |
| Accueil en conditions réelles (6 chargements) | — | score 71–72 → **74–77** ; TBT 2,10 → **1,44** s (anglais 2,50 → **1,36** s) ; LCP 1,74 → **1,78** s (anglais 1,68 → **1,76** s)⁸ |

- **Objectifs du banc** (série réduite) : 106 → **116** atteints sur 144. Les gains de la campagne principale se retrouvent sous Next 15. L'iPhone simulé passe même sous 200 ms sur l'accueil (168 ms, contre 200 ms pile sous Next 14).
- **Restent manqués**, pour les mêmes raisons que plus haut : défilement à 60 i/s, PageSpeed de l'accueil (89), INP de Soumission en 6× (200 ms pile, l'objectif est sous 200 ms).
- **Safari en local** : la nouvelle CSP contient `upgrade-insecure-requests`. Safari demande alors tous les fichiers du site en https ; en `http://localhost`, plus rien ne se charge (« SSL connect error »). C'est sans effet en ligne, où le site est en https. Pour la mesure WebKit, la règle a été retirée de la page servie, des deux côtés.

6. La série complète a dépassé le délai de 120 s sur l'accueil ordinateur de `dev` (première page lancée, 3 onglets en parallèle). Reprise seule, la page s'ouvre en 31 s, sans anomalie : c'est un incident du banc, pas du site.
7. Blogue : 91 → 88 au passage médian. Des trois passages, un a échoué (erreur « NO_NAVSTART » de Lighthouse) ; un autre a eu lieu avant que l'optimiseur ait l'image du premier article en cache. Avec le cache chaud : 95. D'où le réchauffement du cache d'images à la mise en ligne (P42).
8. LCP réel : médianes de 6 chargements, en 2 tours alternés. L'écart (+45 et +79 ms) est du même ordre que la variation entre deux tours d'une même version (jusqu'à 90 ms). Côté réseau, rien ne change avant l'affichage : mêmes fichiers, aux mêmes moments. Après l'affichage, `dev` retélécharge encore ses 4 feuilles CSS (33 Ko) ; la version optimisée, non (P27 fonctionne aussi sous Next 15). Sous Next 14, ce même LCP avait baissé (2,02 → 1,81 s) ; Next 15 l'a amélioré de lui-même. L'objectif (< 2,5 s) reste largement atteint.

### Ce qui a été fait

| Problème | Changement | Effet mesuré |
|---|---|---|
| P3, P13 | Une seule lecture de la position de défilement par image, partagée (en-tête, ruban, apparitions, héros) | Mises en page forcées de l'en-tête et du ruban au défilement : 0 |
| P16, P15 | Ciels : mêmes pixels avec 2 fois moins d'opérations de dessin ; boucle du héros arrêtée au repos en mode allégé | 983 → 424 opérations de dessin par image ; image identique |
| P1 | Destruction des données : seule la zone qui change est recopiée | −93 % de pixels recopiés |
| P39 | Liens villes et catégories du pied de page et du ruban préchargés à l'intention (survol, toucher, focus) | 23 → 0 préchargements au défilement ; ≈ 80 Ko au lieu de 356 Ko sur téléphone |
| P27 | Le CSS intégré n'est plus retéléchargé au réveil de la page | 4 → 0 feuilles retéléchargées ; PageSpeed +2 à +9 |
| P7 | Accordéon de l'accueil et étapes de l'Estimation animés en transformations | CLS au défilement 0,14–0,23 → 0 |
| P6 | Camion de l'étape 3 préparé hors du clic | Travail dans le clic en 6× : 915 → 72 ms |
| P18, P56, P37, P20 | Menus animés en CSS ; pages « Services » préchargées à l'inactivité ; menu principal préchargé en entier ; textes d'une seule langue dans l'en-tête | 1er clic « Services » en 6× : 216–320 → 40–96 ms ; −34 à −41 Ko de JS sur les pages sans animation framer |
| P22, P49 | Défilement lissé (Lenis) chargé à la demande, jamais sur téléphone ; inertie arrêtée au changement de page | −5,35 Ko de JS sur téléphone |
| P33, P34, P47, P14 | Images Soro via l'optimiseur de Next ; dimensions conservées ; liens internes des articles en navigation douce ; barre de lecture écrite seulement si elle change | Images du blogue 306 → 93 Ko ; LCP réel du blogue 2,62 → 1,71 s |
| P19, P24, P25, P46 | Compteurs sans framer ; carte du Québec rendue par le serveur ; conversion du formulaire sans `next/script` ; recherche de la FAQ précalculée | −8 Ko sur l'accueil ; JS plus léger sur Contact et Soumission |
| P45 | Formulaire : rendu limité à l'étape qui change, mesures faites à l'image suivante | INP 6× : 256 → 232 ms ; Android : 168 → 156 ms |
| P29, P30, P38 | CSS de l'admin séparé du site public ; CSS mort retiré ; icône recompressée sans perte | HTML −5,7 à −5,8 Ko compressés par page |
| P35, P12, P4, P8, P11 | Vraies dimensions des objets de héros ; animations des héros en pause hors de l'écran ; calques pour les ombres de la palette ; lueur des cartes et reflet du trait en transformations | Ombres repeintes 54 → 24 fois ; peinture de la lueur 33 → 10 ms |
| P32, P36 | Image du disque dur en AVIF, chargée à l'approche ; tailles des objets de la palette adaptées au téléphone | 87 → 46 Ko ; −36 % sur les images de la palette au téléphone |
| P48 | Fine barre verte en haut de l'écran si un changement de page dure plus de 150 ms (Q10) | Rien ne s'affiche sur les changements rapides |
| P50, P51, P52 | Héros tenu dans l'écran à l'horizontale ; champ « Autre » à 16 px sur iOS ; zones de toucher de 44 px, invisibles | — (confort et accessibilité) |
| Formulaire | Correction du bouton « Continuer » : l'étape de vérification s'affiche enfin avant l'envoi | — (bogue de départ) |

**Défilement lissé (P2) : annulé.** Pendant la campagne, Lenis était coupé sur ordinateur lent. Trois pages simples (Ce que nous rachetons, Catégorie, Ville) y défilaient alors un peu moins bien qu'avant en 4× : 53–55 → 49–52 i/s, ce qu'une reprise a confirmé. Un test A/B sur le même build a ensuite comparé Lenis coupé et Lenis actif (images par seconde au défilement) :

| Page (ordinateur) | 4× : coupé → actif | 6× : coupé → actif |
|---|---|---|
| Accueil | 39,1 → 40,3 | 26,6 → 27,1 |
| Accueil EN | 40,3 → 41,8 | 26,0 → 24,3 |
| À propos | 44,0 → 38,7 | 31,8 → 37,0 |
| Ce que nous rachetons | 49,9 → **55,4** | 38,5 → **45,8** |
| Catégorie (serveurs) | 50,7 → **58,8** | 40,4 → **47,1** |
| Ville (Montréal) | 49,0 → **57,2** | 38,4 → **46,0** |

Couper Lenis n'améliore pas les chiffres : P2 est annulé, conformément à votre règle. Lenis reste actif sur tous les ordinateurs, comme avant ; il est seulement téléchargé à la demande (P22). Pour les trois pages simples, le défilement en 6× est donc de 46–47 i/s, et non les 41–43 i/s du tableau, mesurés avec Lenis coupé.

**Annulé faute de gain** (règle : une optimisation qui n'améliore pas les chiffres est retirée) :
- P2, défilement lissé coupé sur les appareils lents (Q5) : voir le test A/B ci-dessus ;
- vignettes réduites des photos du formulaire : l'aperçu était plus lent (806 ms au lieu de 415 ms sur téléphone 4×), l'aperçu d'origine est revenu ;
- touche Entrée « Suivant » sur les coordonnées (P55) : la touche ne faisait rien, l'indication était trompeuse ;
- réglage de l'ordre des images de Lenis : aucun gain mesuré.

**Pas fait** :
- P5 (calques de la scène Prise en charge) : la camionnette devenait floue sur téléphone ;
- P26 (pixels publicitaires) : gain faible (≈ 4 Ko) contre 1 à 2 requêtes de plus, gardé en réserve ;
- en attente de votre décision (« attendre » ou « plus tard ») : Q4 ciel à 30 i/s, Q7/P28 CSS intégré du blogue et des articles, Q12 variantes allégées ;
- refusés : Q8 police Chakra, Q14 masque de la destruction, P53 halo du formulaire ;
- petits points sans gain mesurable ici : P41, P44, P54.

**Effet secondaire assumé** : sur ordinateur, le processeur travaille un peu plus dans les 4 premières secondes. Les pages « Services » et le menu principal sont préchargés pendant l'inactivité ; c'est ce qui rend les clics de menu immédiats.

**WebKit (moteur de Safari, sous Windows)** : aucun écart mesurable. Défilement de l'iPhone 13 émulé, sous Next 15 : accueil 26,6 → 25,9 i/s, À propos 32,1 → 32,1, Soumission 15,2 → 14,7, Ce que nous rachetons 30,8 → 31,6. Cela fait −3 à +3 %, le niveau du bruit. Sous Next 14, la même série avait donné −3 à −10 %, avec une seule mesure par page ; la reprise ne confirme pas cette baisse. Ce WebKit sous Windows est d'ailleurs bien plus lent qu'un iPhone (5 à 11 i/s au repos, 15 à 32 i/s au défilement) : seul un vrai iPhone peut trancher.

### À faire de votre côté

- **Sur la prévisualisation** (techno-lot-dev.vercel.app), sans envoyer : essayer le formulaire jusqu'à l'étape de vérification.
- **Sur un vrai iPhone**, si possible : le champ « Autre » du formulaire ne doit plus zoomer au focus (P51).
- **À la mise en ligne** :
  - réchauffer le cache d'images (P42) ;
  - demander à Hostinger si LiteSpeed peut compresser en Brotli (P40) ;
  - relancer PageSpeed Insights sur technolot.ca ;
  - une heure après le déploiement, vérifier si `/blog` a gardé son CSS intégré (P28, Q7).

---

## 1. Résumé

**Sur un ordinateur rapide, le site est excellent.** Lighthouse donne 99 à 100 sur les 13 pages mesurées. Le défilement tient 56 à 60 images par seconde (i/s) et un clic de menu affiche la page suivante en 40 à 60 ms.

**Sur un ordinateur lent (processeur ralenti 6 fois) ou un téléphone milieu de gamme (ralenti 4 fois), quatre choses coincent :**
- **Le défilement saccade sur toutes les pages** : 16 à 46 i/s sur ordinateur lent, 31 à 54 i/s sur Android, avec 9 à 70 % d'images ratées. Les pages les plus touchées sont l'accueil, Prise en charge, Estimation (consultation) et À propos.
- **Les ciels étoilés occupent le processeur en permanence.** Ils sont redessinés à chaque image dès le chargement. Au repos, le téléphone est occupé à 44–73 %, contre 22 % pour l'article de blogue, la seule page sans ciel. Le temps de blocage (TBT) monte à 362–1 492 ms, sauf sur l'article (152 ms).
- **Certains clics dépassent 200 ms** : ouverture du menu mobile sur l'accueil, l'article et `/en` ; premier clic sur « Services » en ordinateur lent ; étape 3 de l'accueil (408 ms) ; boutons du formulaire de soumission.
- **L'accueil se décale pendant le défilement sur téléphone** (CLS de 0,14, et 0,23 pour l'accueil anglais), à cause de l'accordéon « Comment ça marche ».

**Le chargement sur téléphone est bon dans les faits.** Dans les conditions réelles émulées, l'élément principal s'affiche (LCP) en 1,6 à 2,0 s sur 11 pages sur 13. Les deux exceptions sont le blogue (2,62 s, image hébergée chez Soro) et l'article (2,75 s, CSS bloquant).

**Le score PageSpeed mobile est plus bas (82–92).** PageSpeed *simule* le chargement, et cette simulation est pénalisée parce que le CSS, déjà inclus dans la page, est retéléchargé pendant le démarrage du JavaScript. LCP simulé : 3,3 à 4,1 s. L'article, qui ne subit pas ce retéléchargement, obtient 100.

**Dix problèmes sont classés ÉLEVÉ** (section 8). Sept se corrigent, en tout ou en partie, **sans aucun changement visible** (lot 1, section 9). Les autres corrections touchent une perception (animation, image, rapidité d'un lien) ou un script sensible : elles vous sont soumises (lot 2).

### Objectifs et état actuel

✓ = objectif atteint sur toutes les pages mesurées ; ✗ = au moins une page en dessous. Entre parenthèses : le nombre de pages conformes sur 13.

**Ordinateur**

| Objectif | Seuil | Ordinateur rapide (1×) | Ordinateur lent (6×) |
|---|---|---|---|
| Score Lighthouse (simulé, config. ordinateur) | ≥ 90 | ✓ 99–100 (13/13) | — (Lighthouse ordinateur ne ralentit pas le processeur) |
| LCP | < 2,5 s | ✓ 0,73–0,90 s (13/13) | — |
| TBT | < 200 ms | ✓ 0–16 ms (13/13) | — |
| CLS au chargement | < 0,1 | ✓ 0,000–0,017 (13/13) | — |
| CLS pendant le défilement | < 0,1 | ✓ ≤ 0,096 (13/13) | ✗ accueil 0,110 · /en 0,124 · consultation 0,115 (10/13) |
| INP (réactivité au clic) | < 200 ms | ✓ 24–56 ms (13/13) | ✗ 216–408 ms (0/13) |
| Défilement fluide | 60 i/s, ≤ 5 % d'images ratées | ✗ 56–60 i/s ; seul l'accueil dépasse (5,9 % ratées) (12/13) | ✗ 16–46 i/s, 16–70 % ratées (0/13) |

**Mobile** (téléphone Android milieu de gamme émulé : 4G lent + processeur 4×)

| Objectif | Seuil | Lighthouse simulé (= PageSpeed) | Lighthouse « réel » (devtools) | Mesures du banc |
|---|---|---|---|---|
| Score Lighthouse | ≥ 90 | ✗ 82–100 (4/13) | ✗ 72–91 (3/13) | — |
| LCP | < 2,5 s | ✗ 3,31–4,08 s ; article 1,36 s (1/13) | ✗ 1,62–2,75 s (11/13) | ✗ 1,60–2,74 s : blogue 2,68 s, article 2,66 s sur Android (11/13) |
| TBT | < 200 ms | ✗ 8–305 ms (11/13) | ✗ 152–1 492 ms (1/13) | — |
| CLS au chargement | < 0,1 | ✓ 0,000 (13/13) | ✓ ≤ 0,014 (13/13) | ✓ 0,000 (13/13) |
| CLS pendant le défilement | < 0,1 | — | — | ✗ accueil 0,141 · /en 0,228 sur Android (11/13) |
| INP | < 200 ms | — (Lighthouse ne mesure pas l'INP en chargement) | — | ✗ 144–232 ms ; accueil, article, /en dépassent (10/13) |
| Défilement fluide | 60 i/s, ≤ 5 % ratées | — | — | ✗ Android 31–54 i/s, 9–45 % ratées ; iPhone émulé : 34–54 i/s (0/13) |

---

## 2. Méthode, environnement et limites

### 2.1 Ce qui a été mesuré
- **Version mesurée** : un build de production de `dev` (identifiant de build `PjRWKOM5JUsWiTYeT4Pdm`), servi par `next start` sur l'ordinateur de mesure.
- **Pages** : 13 pages représentatives : accueil FR et EN, À propos, Contact, Blogue, un article, FAQ, Soumission, Estimation (consultation), Ce que nous rachetons (achat), Prise en charge, une catégorie (serveurs) et une ville (Montréal).
- **Six séries de mesures** :
  - Lighthouse simulé, mobile et ordinateur (3 passages par page, on retient le passage médian) ;
  - Lighthouse mobile avec un ralentissement réel (« devtools », 3 passages) ;
  - défilement et repos (« frames ») ;
  - réactivité aux clics (« interactions », INP) ;
  - changement de page au clic (« navigation ») ;
  - WebKit, le moteur de Safari, en approximation.
- **Précautions** : les pixels Meta et Google sont absents (ils ne sont pas configurés en production non plus) ; le suivi `/api/track` est neutralisé ; le formulaire n'est jamais envoyé, et `/api/soumission` est bloqué, car la base locale est celle de production.

### 2.2 Environnement et profils
- **Machine** : Windows 11, processeur i7-9700 (8 cœurs), carte graphique RTX 4060, écran 144 Hz, Chrome 156 en mode sans fenêtre.
- **Polices** : un défaut de Next 14.2 sous Windows empêche le préchargement des polices. L'environnement de mesure a été corrigé localement pour avoir, comme la production (construite sous Linux), les 4 préchargements de police. Ce n'est pas un problème du site.

| Profil | Écran | Processeur | Réseau | Rôle |
|---|---|---|---|---|
| Ordinateur 1× | 1366×768, densité 1 | normal | local | ordinateur rapide |
| Ordinateur 4× / 6× | 1366×768, densité 1 | ralenti 4× / 6× | local | ordinateur ancien ou bas de gamme |
| Android 4× | 412×915, densité 2,6 | ralenti 4× | 4G lent (562 ms, 1,47 Mbit/s) | téléphone milieu de gamme |
| iPhone 4× | 390×844, densité 3 | ralenti 4× | 4G lent | gabarit iPhone simulé dans Chrome (pas Safari) |
| WebKit « iPhone 13 » | 390×844 | non ralenti | local | moteur de Safari sous Windows (approximation) |

### 2.3 Les deux façons de mesurer avec Lighthouse
- **Simulé** : c'est la méthode de **PageSpeed Insights**. Lighthouse charge la page rapidement, puis *calcule* ce qu'auraient donné un 4G lent et un téléphone 4 fois plus lent. Il rebâtit pour cela la chaîne « qui attend qui » entre les fichiers.
  - Ici, le CSS est déjà inclus dans la page, mais le démarrage du JavaScript (l'hydratation) le redemande (4 fichiers demandés vers 204 ms sur l'accueil). La simulation place donc ce retéléchargement sur le chemin de l'affichage.
  - Résultat : un LCP simulé de 3,3 à 4,1 s, alors que le LCP observé localement est de 0,2 à 0,4 s.
  - Preuve par contraste : l'article, rendu à la demande, garde ses feuilles CSS classiques et n'a pas de retéléchargement. Il obtient 100, avec un LCP simulé de 1,36 s. C'est le problème P27.
- **Devtools (ralentissement réel)** : le réseau et le processeur sont réellement ralentis pendant le chargement. C'est ce que vit un téléphone moyen. Le LCP y est bon (1,6–2,0 s), mais le TBT est élevé, parce que les ciels étoilés tournent pendant tout le chargement.
  - Nuance : ce Lighthouse tourne à la cadence de l'écran de mesure (144 Hz). Les boucles d'animation y tournent donc environ 2,4 fois plus souvent qu'à 60 Hz, ce qui gonfle leur coût. Beaucoup de téléphones récents affichent cependant à 90–120 Hz.

### 2.4 Limites
- **Processeur graphique** : le ralentissement ne s'applique qu'au fil principal. La carte graphique (RTX 4060) reste rapide. Les coûts graphiques (flous, mélange du grain, ombres) sont donc **sous-estimés** par rapport à un portable bas de gamme.
- **Cadence** : la série « frames » émule un écran à 60 Hz ; les autres séries tournent à 144 Hz.
- **Serveur local** : pas de réseau de diffusion (CDN), pas de Brotli, pas de vraie latence, sauf celle ajoutée par l'émulation mobile. Le temps de réponse du serveur (7–18 ms) n'est pas représentatif d'Hostinger.
- **iPhone** : pas d'iPhone réel. WebKit sous Windows n'est pas Safari sous iOS, et ses cadences de canevas (6–11 i/s au repos) ne sont pas représentatives : elles ne servent qu'à comparer avant et après.
- **Densité d'écran** : les profils ordinateur sont en densité 1. Sur un écran Retina ou 4K (densité 2), les canevas sont jusqu'à 4 fois plus grands.
- **Défilement mobile** : il est synthétique (glissements de doigt simulés). Même la page la plus légère (l'article) a environ 9 % d'images ratées sur Android. On compare donc surtout les pages entre elles, et l'avant avec l'après.
- **Bruit** : une autre session de développement tournait sur la machine pendant les mesures. Le bruit possible est faible.
- **Identification des scripts** : les numéros de fichiers JavaScript (chunks) du build mesuré diffèrent du build analysé pour les tailles. Correspondance : `1251` = scènes de l'accueil (ancien `4876`), `1567` = en-tête et défilement lissé (ancien `2644`), `8543` = blogue, `2463` = article. Voir l'annexe C.

### 2.5 Lexique
- **LCP** : temps d'affichage de l'élément principal du premier écran.
- **INP** : délai entre un clic (ou un toucher) et l'image suivante affichée.
- **CLS** : total des déplacements inattendus du contenu.
- **TBT** : temps pendant lequel la page ne peut pas répondre, au chargement.
- **i/s** : images par seconde (60 = parfaitement fluide).
- **Image ratée** : une image affichée en retard (plus de 25 ms au lieu de 16,7 ms).
- **LoAF** : une image anormalement longue, avec le script responsable.
- **Processeur 4× / 6×** : le processeur est ralenti 4 ou 6 fois pour imiter un appareil plus lent.
- **Hydratation** : le moment où le JavaScript « réveille » la page déjà affichée.
- **Préchargement** : Next télécharge à l'avance les pages vers lesquelles pointent les liens visibles.
- **Ko** : 1 000 octets ; les tailles de JavaScript sont compressées (gzip).

---

## 3. Lighthouse par page

### 3.1 Mobile simulé (méthode PageSpeed), avec l'INP mesuré par la série « interactions »

| Page | Score | FCP | LCP | TBT | CLS | INP Android | INP iPhone | Élément LCP |
|---|---|---|---|---|---|---|---|---|
| Accueil | 82 | 1,22 s | 3,85 s | 305 ms | 0 | 216 ms | 224 ms | logo du héros |
| À propos | 88 | 0,89 s | 3,69 s | 138 ms | 0 | 144 ms | 144 ms | logo animé du héros |
| Contact | 92 | 1,01 s | 3,31 s | 26 ms | 0 | 152 ms | 152 ms | titre |
| Blogue | 87 | 0,88 s | 4,08 s | 37 ms | 0 | 160 ms | 176 ms | image vedette (Soro) |
| Article | 100 | 1,36 s | 1,36 s | 8 ms | 0 | 232 ms | 168 ms | paragraphe |
| FAQ | 89 | 0,99 s | 3,77 s | 61 ms | 0 | 168 ms | 160 ms | texte du héros |
| Soumission | 90 | 0,99 s | 3,61 s | 20 ms | 0 | 168 ms | 176 ms | texte du héros |
| Estimation | 89 | 0,89 s | 3,62 s | 112 ms | 0 | 144 ms | 144 ms | objet du héros |
| Achat | 91 | 0,89 s | 3,47 s | 58 ms | 0 | 152 ms | 160 ms | objet du héros |
| Prise en charge | 87 | 0,91 s | 3,90 s | 139 ms | 0 | 144 ms | 144 ms | titre |
| Catégorie | 87 | 1,05 s | 3,83 s | 151 ms | 0 | 168 ms | 176 ms | texte du héros |
| Ville | 87 | 1,01 s | 3,66 s | 188 ms | 0 | 192 ms | 176 ms | titre |
| Accueil EN | 82 | 1,18 s | 3,84 s | 295 ms | 0 | 208 ms | 232 ms | logo du héros |

### 3.2 Mobile avec ralentissement réel (devtools)

| Page | Score | FCP | LCP | TBT | CLS | Tâches longues | Script le plus lourd (temps du fil principal) |
|---|---|---|---|---|---|---|---|
| Accueil | 72 | 1,93 s | 2,02 s | 1 419 ms | 0,001 | 20 (3,33 s) | `1251` scènes et ciel de l'accueil, 8 475 ms |
| À propos | 85 | 1,55 s | 1,71 s | 549 ms | 0 | 11 (1,65 s) | `4967` ciel, ruban…, 8 029 ms |
| Contact | 90 | 1,59 s | 1,93 s | 387 ms | 0 | 7 (1,35 s) | `5682` formulaire et ciel, 7 286 ms |
| Blogue | 88 | 1,49 s | **2,62 s** | 362 ms | 0 | 10 (1,36 s) | `8543` ciel, ruban…, 7 769 ms |
| Article | 90 | 2,75 s | **2,75 s** | 152 ms | 0 | 6 (0,78 s) | la page elle-même, 1 104 ms (pas de ciel) |
| FAQ | 88 | 1,49 s | 1,92 s | 455 ms | 0 | 8 (1,37 s) | `8194` ciel, ruban…, 7 319 ms |
| Soumission | 91 | 1,53 s | 1,62 s | 363 ms | 0 | 8 (1,34 s) | `5682`, 6 920 ms |
| Estimation | 86 | 1,46 s | 1,63 s | 521 ms | 0,014 | 10 (1,49 s) | `4967`, 7 246 ms |
| Achat | 87 | 1,50 s | 1,68 s | 495 ms | 0,011 | 14 (1,69 s) | `4967`, 7 658 ms |
| Prise en charge | 81 | 1,51 s | 1,62 s | 749 ms | 0,011 | 15 (2,00 s) | `4967`, 7 443 ms |
| Catégorie | 80 | 1,57 s | 1,91 s | 821 ms | 0,003 | 15 (2,18 s) | `8194`, 7 595 ms |
| Ville | 79 | 1,61 s | 1,91 s | 889 ms | 0,003 | 13 (2,17 s) | `8194`, 7 679 ms |
| Accueil EN | 73 | 1,80 s | 1,91 s | 1 492 ms | 0 | 20 (3,31 s) | `1251`, 8 388 ms |

### 3.3 Ordinateur (configuration ordinateur de Lighthouse), avec l'INP mesuré

| Page | Score | FCP | LCP | TBT | CLS | INP 1× | INP 6× | Action la plus lente en 6× |
|---|---|---|---|---|---|---|---|---|
| Accueil | 100 | 0,32 s | 0,82 s | 13 ms | 0 | 56 ms | **408 ms** | ouvrir l'étape 3 |
| À propos | 100 | 0,24 s | 0,76 s | 0 | 0 | 56 ms | **216 ms** | 1er clic sur « Services » |
| Contact | 100 | 0,28 s | 0,75 s | 0 | 0 | 32 ms | **272 ms** | 1er clic sur « Services » |
| Blogue | 99 | 0,24 s | 0,86 s | 0 | 0 | 40 ms | **248 ms** | 1er clic sur « Services » |
| Article | 100 | 0,33 s | 0,77 s | 0 | 0 | 24 ms | **256 ms** | 1er clic sur « Services » |
| FAQ | 100 | 0,26 s | 0,82 s | 0 | 0 | 32 ms | **272 ms** | 1er clic sur « Services » |
| Soumission | 99 | 0,27 s | 0,90 s | 0 | 0 | 40 ms | **256 ms** | bouton « Retour » du formulaire |
| Estimation | 100 | 0,24 s | 0,73 s | 0 | 0,017 | 40 ms | **240 ms** | 1er clic sur « Services » |
| Achat | 100 | 0,24 s | 0,73 s | 0 | 0 | 48 ms | **240 ms** | 1er clic sur « Services » |
| Prise en charge | 100 | 0,24 s | 0,80 s | 0 | 0 | 56 ms | **232 ms** | 1er clic sur « Services » |
| Catégorie | 99 | 0,28 s | 0,89 s | 0 | 0 | 48 ms | **296 ms** | 1er clic sur « Services » |
| Ville | 100 | 0,28 s | 0,73 s | 0 | 0 | 48 ms | **280 ms** | 1er clic sur « Services » |
| Accueil EN | 100 | 0,32 s | 0,82 s | 16 ms | 0 | 56 ms | **288 ms** | 1er clic sur « Services » |

### 3.4 Ce qu'on en retient
- **Sur ordinateur rapide, rien n'est à corriger pour Lighthouse.**
- **Sur mobile, le score PageSpeed est surtout freiné par le retéléchargement du CSS (P27)** ; le score réel, par les ciels animés pendant le chargement (P16). Sur chaque page, le « script le plus lourd » est le fichier qui contient le ciel (7 à 8,5 s de fil principal). La page sans ciel, l'article, a un TBT de 152 ms.
- **INP en ordinateur lent** : le premier clic sur « Services » est lent partout, parce qu'il charge et précharge le menu à ce moment-là (P18). Le second clic ne prend plus que 32–88 ms.
- **Lighthouse liste 14 animations non composées sur l'accueil** (flous d'entrée, balayage du reflet en `background-position`, tracés en `stroke-dashoffset`) et 2–3 sur les pages à étapes (`grid-template-rows`). Elles n'ont pas d'effet mesurable sur le LCP (P9, P11, P7).

---

## 4. Poids des pages

### 4.1 JavaScript par page (compressé)

La colonne « First Load JS » de `next build` sous-estime le JavaScript réel : elle oublie 46,6 Ko de code commun à toutes les pages publiques (en-tête, défilement lissé, menus, suivi). La colonne « Lighthouse » compte tout ce qui a été téléchargé pendant le test, y compris le code chargé en différé.

| Page | First Load JS (build) | JS réel (analyse des paquets) | JS transféré (Lighthouse mobile) |
|---|---|---|---|
| Accueil / Accueil EN | 168 Ko | 186,6 Ko | 218 Ko |
| À propos / Prise en charge | 147 Ko | 172,5 Ko | 209 / 225 Ko |
| Estimation | 148 Ko | 173,3 Ko | 227 Ko |
| Achat | 137 Ko | 162,0 Ko | 227 Ko |
| Contact / Soumission | 134 / 133 Ko | 156,1 / 155,5 Ko | 218 / 217 Ko |
| FAQ | 114 Ko | 146,5 Ko | 210 Ko |
| Blogue | 111 Ko | 143,3 Ko | 210 Ko |
| Catégorie / Ville | 111 Ko | 143,4 Ko | 232 / 222 Ko |
| Article | 105 Ko | 137,7 Ko | 210 Ko |
| Politique de confidentialité | 109 Ko | 141,6 Ko | non mesurée |

Plancher commun à toutes les pages : 134,3 Ko (React et Next 87,7 Ko, plus 46,6 Ko de code commun).

### 4.2 Ce qui pèse
- **framer-motion** :
  - 9–10 Ko sur toutes les pages, uniquement pour animer deux menus de l'en-tête ;
  - plus 23,5 Ko téléchargés juste après le démarrage, sur 38 pages qui n'en ont pas besoin (P18) ;
  - plus 11 Ko sur 8 pages pour faire défiler des compteurs (P19).
- **Défilement lissé (Lenis)** : 5,35 Ko sur toutes les pages, y compris sur mobile, où il ne s'active jamais (P22).
- **Catalogue d'étoiles** : 5,5 Ko sur 46 pages (P21).
- **Textes FR + EN de tout le site** envoyés par l'en-tête : environ 4,7 Ko (P20).
- **Scènes animées de l'accueil** : 20,9 Ko (P23).
- **Supabase et la bibliothèque de graphiques** (recharts) ne sont **pas** chargés par le site public.

### 4.3 HTML, CSS, polices, images
- **HTML compressé** : 40 à 56 Ko par page pré-rendue (accueil 56,5 Ko), dont 45 à 60 % de CSS inclus dans la page. Ce CSS évite toute feuille bloquante au chargement, mais il est retéléchargé à l'hydratation (P27).
- **CSS inutilisé selon Lighthouse** : 11 à 15 Ko par page. Il s'agit en bonne partie de règles de l'admin (P29) et de CSS mort (P30).
- **Polices** : 78 Ko sur chaque page, préchargées (P31).
- **Images** : 4 à 122 Ko par page, sauf le blogue, à 306 Ko (images Soro non redimensionnées, P33).

---

## 5. Fluidité au défilement et pendant les animations

### 5.1 Défilement de haut en bas (images par seconde · images ratées)

Écran à 60 Hz émulé. On considère le défilement fluide à 60 i/s, avec au plus 5 % d'images ratées.

| Page | Ordi 1× | Ordi 4× | Ordi 6× | Android 4× | iPhone 4× | Images > 50 ms (6× / Android) |
|---|---|---|---|---|---|---|
| Accueil | 56,1 · 5,9 % | 36,8 · 31,1 % | **16,4 · 70,0 %** | **33,6 · 38,0 %** | 33,5 · 38,9 % | 67 / 53 |
| À propos | 58,5 · 2,6 % | 40,5 · 24,2 % | 22,7 · 61,1 % | 37,8 · 31,7 % | 39,2 · 31,7 % | 38 / 18 |
| Contact | 58,8 · 0,5 % | 46,6 · 12,9 % | 33,7 · 20,0 % | 51,5 · 11,4 % | 51,1 · 12,8 % | 14 / 3 |
| Blogue | 60,0 · 0 % | 50,0 · 11,4 % | 24,7 · 45,8 % | 47,5 · 16,5 % | 47,7 · 16,6 % | 27 / 9 |
| Article | 59,9 · 0,2 % | 55,9 · 4,2 % | 45,8 · 15,8 % | 53,8 · 9,1 % | 54,1 · 8,9 % | 16 / 3 |
| FAQ | 60,0 · 0 % | 51,0 · 8,9 % | 36,2 · 24,3 % | 45,4 · 17,5 % | 46,8 · 13,5 % | 13 / 10 |
| Soumission | 60,0 · 0 % | 50,6 · 11,6 % | 30,1 · 34,8 % | 49,3 · 13,3 % | 50,4 · 12,7 % | 17 / 5 |
| Estimation | 60,0 · 0 % | 38,1 · 31,3 % | 22,3 · 52,3 % | 37,2 · 34,8 % | 38,6 · 30,4 % | 51 / 13 |
| Achat | 59,6 · 0,7 % | 53,3 · 8,7 % | 38,2 · 33,0 % | 48,3 · 17,7 % | 46,7 · 22,5 % | 16 / 5 |
| Prise en charge | 59,5 · 0,8 % | 33,6 · 38,8 % | 19,8 · 64,4 % | 36,9 · 37,9 % | 36,5 · 39,7 % | 45 / 18 |
| Catégorie | 60,0 · 0 % | 55,1 · 5,3 % | 42,6 · 24,0 % | 51,6 · 12,7 % | 52,9 · 10,0 % | 11 / 5 |
| Ville | 59,6 · 0,7 % | 53,7 · 7,8 % | 41,2 · 25,1 % | 49,5 · 14,9 % | 50,5 · 15,7 % | 13 / 7 |
| Accueil EN | 58,3 · 3,0 % | 37,8 · 30,2 % | 20,4 · 59,5 % | 31,4 · 44,7 % | 33,5 · 38,6 % | 58 / 53 |

### 5.2 Qui prend le temps pendant le défilement (scripts responsables mesurés)

| Responsable | Où | Mesure |
|---|---|---|
| **Rappel d'image de l'en-tête** (`SiteHeader`, chunk `1567`) : il lit la position de défilement après que les autres animations ont modifié les styles, et paie ainsi la mise en page de toute l'image (P3). | 1er sur l'accueil, À propos, Estimation et Prise en charge | Par défilement complet, en 6× : 1,55 s (accueil), 2,20 s (À propos), 2,29 s (Estimation), 2,59 s (Prise en charge). Jusqu'à 338 ms pour un seul rappel. Sur Android : 0,49 à 1,32 s. En 6×, ce même rappel ne coûte que 2 à 22 ms sur Contact, Blogue, FAQ, Soumission, Catégorie et Ville. |
| **Ruban de liens** (`Marquee`) : sa lecture de la position est presque entièrement de la mise en page forcée (P3). | accueil, services, blogue | 6× : 1 283 ms forcés sur 1 303 (accueil), 494 sur 496 (Estimation), 418 sur 420 (Blogue) |
| **Traitement des pages préchargées** (`ReadableStreamDefaultReader.read`, chunk `2117`), quand les ~33 liens du pied de page et du ruban apparaissent (P39) | 1er sur Blogue, FAQ, Contact, Soumission, Catégorie, Ville | 6× : 473 à 862 ms ; 4× : 56 à 220 ms |
| **Destruction des données** (canevas, `1251`) (P1) | accueil | Android 1 052 ms (max 23,0 ms par image) ; iPhone 805 ms ; 6× 983 ms (max 62,8 ms) |
| **Animations liées au défilement de framer-motion** (étapes, parallaxe) | accueil, achat | accueil Android 536 ms, 6× 586 ms ; achat 6× 505 ms |
| **Palette qui se remplit** (P4) | accueil | Android 528 ms ; iPhone 438 ms |
| **Défilement lissé** (Lenis) (P2) | toutes les pages, sur ordinateur | 6× : ≈ 150 à 470 ms par défilement sur les pages simples (catégorie 450, ville 467) |

### 5.3 Au repos, en haut de la page (fil principal occupé pendant 4 s, sans rien toucher)

| Page | Ordi 1× | Ordi 4× | Ordi 6× | Android 4× | iPhone 4× |
|---|---|---|---|---|---|
| Accueil | 16 % | 75 % | 98 % (24 % d'images ratées au repos) | 71 % | 73 % |
| À propos | 11 % | 61 % | 92 % | 56 % | 73 % |
| Contact | 8 % | 41 % | 79 % | 44 % | 46 % |
| Blogue | 16 % | 38 % | 70 % | 49 % | 45 % |
| **Article (sans ciel)** | **2 %** | **22 %** | **58 %** | **22 %** | **22 %** |
| FAQ | 5 % | 48 % | 75 % | 46 % | 48 % |
| Soumission | 5 % | 47 % | 78 % | 45 % | 45 % |
| Estimation | 10 % | 58 % | 88 % | 69 % | 69 % |
| Achat | 11 % | 61 % | 90 % | 71 % | 70 % |
| Prise en charge | 11 % | 57 % | 92 % | 64 % | 68 % |
| Catégorie | 9 % | 59 % | 94 % | 70 % | 65 % |
| Ville | 11 % | 62 % | 93 % | 73 % | 72 % |
| Accueil EN | 16 % | 74 % | 98 % (28 % ratées) | 67 % | 68 % |

Seule la boucle du ciel apparaît parmi les scripts actifs au repos (héros de l'accueil, ou ciel des pages intérieures). Sur un téléphone milieu de gamme, cela représente l'essentiel du budget de 16,7 ms par image.

### 5.4 Décalages pendant le défilement (CLS, plus grande fenêtre)

| Page | Ordi 1× | Ordi 4× | Ordi 6× | Android 4× | iPhone 4× | Source |
|---|---|---|---|---|---|---|
| Accueil | 0,096 | 0,095 | **0,110** | **0,141** | 0,078 | panneaux de l'accordéon « Comment ça marche » (`li.etapes-panel`) |
| Accueil EN | 0,088 | 0,091 | **0,124** | **0,228** | 0,068 | même accordéon |
| Estimation | 0,055 | 0,093 | **0,115** | 0,008 | 0,009 | bloc « Les étapes de l'estimation » (étapes épinglées) |
| Prise en charge | 0,010 | 0,004 | 0,004 | 0,060 | 0,001 | halos `svc-glow` du chapitre |
| À propos | 0,015 | 0,014 | 0,019 | 0,007 | 0,010 | textes et étapes |
| Autres pages | 0 | 0 | 0 | 0 | 0 | — |

Au chargement, le CLS est pratiquement nul partout (au plus 0,017).

---

## 6. Changement de page au clic

On part de l'accueil et on clique les liens du menu, deux fois de suite. Le temps est mesuré du clic jusqu'à l'affichage du nouveau titre. Il n'y a pas de seuil officiel ; à titre de repère, au-delà d'environ 1 s sans signe d'attente, la page paraît figée.

| Trajet | Ordi 1× (1re · 2e passe) | Ordi 6× | Android 4× |
|---|---|---|---|
| Accueil → À propos | 101 · 56 ms | 2 210 · 946 ms | 2 380 · 1 146 ms |
| À propos → Contact | 73 · 45 ms | 1 289 · 698 ms | 1 287 · 1 057 ms |
| Contact → Blogue | 45 · 33 ms | 1 005 · 544 ms | 1 085 · 1 016 ms |
| Blogue → FAQ | 46 · 39 ms | 768 · 504 ms | 514 · 1 043 ms |
| FAQ → Soumission | 39 · 39 ms | 745 · 662 ms | 431 · 1 037 ms |
| Soumission → Accueil | 109 · 119 ms | 2 162 · 1 794 ms | 1 536 · 1 236 ms |
| **Médiane** | **60 · 42 ms** | **1 147 · 680 ms** | **1 186 · 1 050 ms** |

- **Sur ordinateur rapide, la navigation est instantanée.**
- **Sur Android, la deuxième passe n'est pas plus rapide**, et sur les trajets Blogue → FAQ et FAQ → Soumission, elle est deux fois plus lente (431–514 ms, puis 1 037–1 043 ms). La raison : dans Next 14.2, une page préchargée automatiquement n'est réutilisable que 30 secondes. Au-delà, chaque clic retélécharge la page (8 à 11 Ko et un aller-retour réseau) (P56).
- **L'accueil n'est jamais repréchargé** : c'est la page d'entrée, déjà en mémoire depuis le chargement, et elle devient périmée de la même façon.
- **Aucun signe d'attente pendant ces 1 à 2,4 s** (P48).

---

## 7. Mobile

### 7.1 Chargement réel en 4G lent + processeur 4×

| Page | LCP Android | LCP iPhone (émulé) | Élément LCP |
|---|---|---|---|
| Accueil / Accueil EN | 2,00 / 1,91 s | 2,08 / 2,04 s | logo du héros |
| À propos | 1,65 s | 1,65 s | logo |
| Contact | 1,95 s | 1,68 s | texte du héros |
| **Blogue** | **2,68 s** | 2,47 s | image vedette (Soro) |
| **Article** | **2,66 s** | **2,74 s** | paragraphe (CSS bloquant) |
| FAQ | 1,87 s | 1,62 s | texte du héros |
| Soumission | 1,90 s | 1,60 s | texte du héros |
| Estimation / Achat / Prise en charge | 1,63 / 1,64 / 1,68 s | 1,66 / 1,65 / 1,70 s | objet du héros |
| Catégorie / Ville | 1,66 / 1,70 s | 1,66 / 1,74 s | texte / objet du héros |

L'événement « chargement terminé » arrive entre 3,8 et 4,8 s.

### 7.2 Défilement et animations sur téléphone

Voir les colonnes Android et iPhone du § 5.1 : 31 à 54 i/s, et toutes les pages ont plus de 5 % d'images ratées.
- **Accueil** : 38 % d'images ratées et 53 images de plus de 50 ms. Responsables : destruction des données, en-tête, palette, animations liées au défilement.
- **Prise en charge, Estimation et À propos** : 30 à 40 % d'images ratées. Responsables : l'en-tête (mise en page forcée), puis le ruban.

### 7.3 Interactions au toucher

- **L'ouverture du menu mobile est l'action la plus lente sur toutes les pages** : 144 à 232 ms. Elle dépasse 200 ms sur l'accueil (216 et 224 ms), l'article (232 ms sur Android) et l'accueil anglais (208 et 232 ms).
- **Le reste passe sous 200 ms** : accordéon de l'accueil 56–136 ms, questions de la FAQ 32–96 ms, étapes des services 40–104 ms, formulaire 48–152 ms.
- **La saisie dans le formulaire est fluide** : 48–56 ms pour 6 caractères.

### 7.4 WebKit (moteur de Safari, sous Windows, sans ralentissement)
- Aucune erreur de page ni de console sur l'accueil, À propos, Soumission et Achat.
- Toutes les propriétés CSS testées sont reconnues (`dvh`, `backdrop-filter`, `content-visibility`, `animation-timeline`).
- Défilement : 15 à 32 i/s, 38 à 82 % d'images ratées. Ces cadences ne sont pas représentatives d'un iPhone : elles servent seulement de point de comparaison avant/après.

### 7.5 Mise en page mobile
Ces points ne se mesurent pas avec un outil de performance :
- le paysage (P50) ;
- le zoom automatique d'iOS sur un champ (P51) ;
- la taille des zones de toucher (P52) ;
- `overflow: clip` sur iOS 15 (P54) ;
- la touche Entrée du clavier (P55).

Ils restent signalés dans la liste FAIBLE.

---

## 8. Problèmes classés

### Critères de classement
- **ÉLEVÉ** : un objectif est manqué dans les conditions demandées (processeur 6× sur ordinateur, 4× sur mobile, ou Lighthouse) ; la mesure désigne ce problème comme cause principale ; et la page touchée est très visitée (accueil, soumission, pages du menu) ou c'est toutes les pages.
- **MOYEN** : un effet est mesuré, mais il est sous les seuils, secondaire, limité à des pages ou à des appareils précis, ou impossible à mesurer ici malgré une analyse sérieuse ; ou bien le problème représente au moins 5 Ko de JavaScript sur des pages très visitées.
- **FAIBLE** : hygiène, quelques Ko, interaction rare, ou effet non confirmé par la mesure.

**État de chaque problème** : *confirmé* (observé et attribué), *non confirmé* (mesuré, mais pas observé), ou *non mesurable ici*.

**Accord requis** : « oui » dès qu'un changement est perceptible, même léger (image, animation, rapidité d'un lien, nouvel élément), ou qu'il touche un script sensible.

### 8.1 ÉLEVÉ (10)

**P16 — Ciels étoilés : redessinés 60 fois par seconde en permanence, dès le chargement** (regroupe P15 et P17 pour les leviers « mode allégé »).
- *Fichiers* : `components/accueil/hero/HeroFx.tsx:337-368` ; `components/site/CielEtoiles.tsx:157-172` ; `components/site/ciel/etoiles.ts:225-277`.
- *Appareils* : les deux, surtout mobile.
- *Preuve (confirmé)* :
  - le script du ciel est le plus lourd de chaque page en chargement réel (7 à 8,5 s de fil principal) ;
  - TBT de 362 à 1 492 ms, contre 152 ms pour l'article sans ciel ;
  - au repos, téléphone occupé à 44–73 %, contre 22 % sans ciel ;
  - ordinateur 6× occupé à 98 %, avec 24 % d'images ratées sans même toucher la page ;
  - la scintillation, seule chose qui change au repos, varie sur 4 à 12 s, alors que tout le canevas est effacé et redessiné à chaque image.
- *Correction sans changement visible* : ne redessiner que les étoiles qui changent de palier de luminosité (d'une image à l'autre, la plupart restent identiques), ou pré-rendre les parties fixes ; en mode allégé, arrêter la boucle quand rien ne bouge (P15). Une comparaison de captures pixel à pixel doit confirmer que l'image reste identique.
- *Corrections perceptibles (lot 2)* : 30 i/s au repos ; densité réduite sur appareils lents ; mode allégé sur les pages intérieures, mémorisé d'une page à l'autre (P17) ; démarrage du ciel après la fin du chargement.
- *Risque visuel* : aucun pour la première correction ; faible pour les autres.
- *Accord* : non pour la première correction ; oui pour les autres.

**P3 — Mises en page forcées pendant le défilement : en-tête, ruban, apparitions, héros**
- *Fichiers* :
  - `components/site/SiteHeader.tsx:43-72` (le rappel `update` lit `window.scrollY` après les écritures des autres animations) ;
  - `components/site/Marquee.tsx:60-81` (`offsetWidth` à chaque image, `scrollY` dans l'événement de défilement) ;
  - `components/site/Reveal.tsx:28-54` ;
  - `components/accueil/hero/HeroFx.tsx:416-442` ;
  - `components/accueil/palette-scene.tsx:117-125`.
- *Appareils* : les deux.
- *Preuve (confirmé)* :
  - le rappel de l'en-tête est le 1er responsable des saccades sur l'accueil, À propos, Estimation et Prise en charge : 1,55 à 2,59 s par défilement complet en 6×, jusqu'à 338 ms pour un seul rappel, et 0,49 à 1,32 s sur Android. En 6×, le même rappel ne coûte que 2 à 22 ms sur les pages sans animation liée au défilement ;
  - pour le ruban, la mise en page forcée représente presque tout son temps : 1 283 ms sur 1 303 (accueil, 6×) ;
  - pour les apparitions (`Reveal`) : 175 ms forcés (accueil, Android) ;
  - l'outil de mesure ne peut pas isoler la part « forcée » des rappels de l'en-tête. Le code et le contraste entre les pages l'établissent.
- *Correction sans changement visible* :
  - lire la position de défilement une seule fois par image, dans une phase de lecture commune exécutée avant toute écriture (par exemple la phase de lecture de framer-motion), et partager cette valeur entre l'en-tête, le ruban, les apparitions et le héros ;
  - sur ordinateur, utiliser la position tenue par Lenis plutôt que de la relire ;
  - garder la largeur du ruban en mémoire ;
  - le héros ne mesure plus rien quand il est hors de l'écran.
  - Une partie du coût de mise en page restera, puisqu'elle vient des styles modifiés par les animations : on la mesurera après.
- *Risque visuel* : aucun. *Accord* : non.

**P27 — Le CSS déjà inclus dans la page est retéléchargé à l'hydratation**
- *Fichiers* : `scripts/inline-critical-css.mjs:58-70` (ajouté au build ; il corrige le LCP et ne doit pas être cassé).
- *Appareils* : les deux, surtout pour le score mobile.
- *Preuve (confirmé)* :
  - les 4 feuilles CSS sont redemandées à 204–206 ms (accueil, simulé) et à 2,7 s (accueil, devtools) ;
  - en simulé, ce retéléchargement se retrouve sur le chemin du LCP : LCP simulé de 3,3 à 4,1 s pour un LCP observé de 0,38 s, et score < 90 sur 9 pages sur 13 ;
  - l'article, sans retéléchargement, obtient 100 (LCP simulé 1,36 s).
- *Correction* : prototyper une extension du script qui évite que React réinsère les feuilles, puis tester la navigation entre les pages. Deux pistes :
  - garder dans la page la balise `<link>` de chaque feuille, mais non bloquante (`media="print"`, puis bascule à `all` une fois chargée) : React la reconnaît, et la feuille se charge tôt, en parallèle ;
  - garder une balise `<link>` désactivée que React reconnaît. Cette piste est plus risquée : React pourrait attendre indéfiniment une feuille qui ne se charge jamais.
  - On peut aussi alléger les feuilles (P29, P30).
- *Risque* : aucun sur l'image ; **risque fonctionnel** (navigation bloquée si c'est mal fait).
- *Accord* : oui (lot 2, prototype testé avant adoption).
- *Ordre de grandeur* : l'article montre ce qu'on peut viser, sans garantie.

**P39 — Préchargement d'environ 33 pages dès que le pied de page ou le ruban apparaît**
- *Fichiers* : `components/site/SiteFooter.tsx:133-139` ; `components/site/LiensDefilants.tsx:37-42`.
- *Appareils* : les deux.
- *Preuve (confirmé)* : le traitement de ces pages préchargées est le 1er responsable des saccades sur le Blogue, la FAQ, Contact, Soumission, Catégorie et Ville en 6× (473 à 862 ms par défilement). Ce n'est donc pas seulement 300 à 450 Ko de données sur mobile : c'est aussi du travail pour le processeur.
- *Correction* : ne pas précharger les liens des villes et des catégories du pied de page ni ceux du ruban, ou les précharger seulement au survol ou au toucher. Le menu principal et les boutons d'action restent préchargés.
- *Risque visuel* : aucun ; en contrepartie, un clic vers ces pages coûte un aller-retour réseau de plus.
- *Accord* : oui (compromis sur la rapidité de ces liens).

**P1 — Destruction des données : tout le canevas est recopié à chaque image**
- *Fichiers* : `components/accueil/donnees-destruction.tsx:169-230`.
- *Appareils* : les deux.
- *Preuve (confirmé)* :
  - 1 052 ms par défilement de l'accueil sur Android (jusqu'à 23 ms par image), 805 ms sur iPhone, et 983 ms en ordinateur 6× (jusqu'à 62,8 ms par image) ;
  - c'est le 1er responsable sur Android et le 2e sur ordinateur.
- *Correction sans changement visible* : ne rien redessiner quand l'image ne change pas (hors de la plage active, ou mouvement négligeable) ; limiter la copie au rectangle utile.
- *Risque visuel* : aucun. *Accord* : non.
  - La variante plus poussée, qui découpe les trous avec un masque (bords à ±1 pixel près), demanderait votre accord.

**P18 — Menus de l'en-tête : premier clic et ouverture lents ; framer-motion chargé partout pour cela**
- *Fichiers* : `components/site/SiteHeader.tsx:3, 89-96, 229-267, 301-369` ; `components/MotionProvider.tsx` ; `components/LocaleShell.tsx:40-47`.
- *Appareils* : les deux.
- *Preuve (confirmé)* :
  - 1er clic sur « Services » : 216 à 320 ms en 6× sur toutes les pages, contre 88 ms au plus au 2e clic. Le 1er clic paie le traitement des 4 pages du menu préchargées à l'ouverture (27 à 111 ms) et un nouveau rendu de l'en-tête dès que le bouton reçoit le focus (35 à 98 ms) ;
  - ouverture du menu mobile : 144 à 232 ms, et plus de 200 ms sur l'accueil, l'article et `/en`. La quasi-totalité du temps passe à réafficher la page après le clic, avec le montage d'une vingtaine de liens et le verrouillage du défilement ;
  - poids : 9–10 Ko de framer partout, plus 23,5 Ko différés sur 38 pages.
- *Correction sans changement visible* :
  - animer les deux menus en CSS (mêmes durées, même courbe, mêmes décalages) ;
  - précharger les 4 pages « Services » quand le navigateur est inactif plutôt qu'au clic ;
  - gérer la visibilité de l'en-tête au focus en CSS plutôt que par un nouveau rendu ;
  - ne monter framer que sur les 5 gabarits qui l'utilisent.
  - Important : reproduire **la position actuelle** du panneau « Services ». framer annule aujourd'hui son centrage, de sorte que le panneau est probablement décalé vers la droite. Question Q11.
- *Risque visuel* : faible (l'animation de sortie doit être identique, à vérifier à l'œil).
- *Accord* : non, si la reproduction est identique.

**P7 — Accordéon « Comment ça marche » (accueil) et étapes épinglées (Estimation) : décalages pendant le défilement**
- *Fichiers* : `components/accueil/interactif.css:34-42` (largeur animée en `flex-grow`, 450 ms) ; `components/accueil/etapes-accordeon.tsx` ; `components/pages/services/PinnedSteps.tsx:215-219` ; `app/site.css:579-593`.
- *Appareils* : les deux.
- *Preuve (confirmé)* :
  - CLS au défilement : 0,141 (accueil, Android), 0,228 (accueil EN, Android), 0,110 et 0,124 (accueil FR et EN, 6×), 0,115 (Estimation, 6×). Sources : les panneaux `li.etapes-panel` et le bloc « Les étapes de l'estimation » ;
  - l'INP des accordéons reste correct : 16 à 136 ms, sauf l'étape 3 (P6).
- *Correction* : animer l'ouverture en transformation (technique FLIP), pour un rendu final identique.
- *Risque visuel* : moyen (raccords en fin d'animation).
- *Accord* : oui.

**P33 — Images du blogue hébergées chez Soro : non optimisées, sur un 2e domaine**
- *Fichiers* : `components/blog/PostImage.tsx:34-44` ; `components/pages/BlogIndexPage.tsx:212-217` ; `next.config.mjs:5-11`.
- *Appareils* : les deux.
- *Preuve (confirmé)* :
  - LCP du blogue : 2,62 s (devtools) et 2,68 s (Android réel) ;
  - l'image vedette (71,5 Ko) est demandée à 638 ms et n'arrive qu'à 2,59 s, connexion au domaine de Soro comprise ;
  - les images de la page totalisent 306 Ko, servies sans redimensionnement ni cache.
- *Correction* :
  - sans changement visible : ouvrir la connexion au domaine Soro à l'avance (`preconnect`) ;
  - avec recompression : passer ces images par l'optimiseur de Next, en AVIF redimensionné et mis en cache.
- *Risque visuel* : aucun pour la connexion anticipée ; faible pour la recompression (qualité 75).
- *Accord* : non pour la connexion anticipée ; oui pour la recompression.

**P6 — Étape 3 de l'accueil (camion) : préparation lourde dans le clic**
- *Fichiers* : `components/accueil/etapes-camion.tsx:34-53, 91-108, 159-163, 225-246`.
- *Appareils* : surtout ordinateur lent.
- *Preuve (confirmé)* :
  - INP de 408 ms en 6×, dont 340 ms de travail de React dans le clic ;
  - sur mobile, 112 à 136 ms (conforme).
- *Correction sans changement visible* : créer une seule fois les images de fumée et les garder en mémoire ; lancer la mesure et l'animation à l'image suivante, hors du clic ; donner un calque à la caisse du camion.
- *Risque visuel* : aucun. *Accord* : non. La variante allégée (sans flou de mouvement) demanderait votre accord.

**P45 — Formulaire de soumission : changements d'étape lents en ordinateur lent ; vignettes de photos en pleine résolution**
- *Fichiers* : `components/SubmissionForm.tsx:101-143` (`remonter()` relit la mise en page dans la tâche du clic), `:367-470` (enfants rendus de nouveau à chaque changement) ; `components/formulaire/Depot.tsx:116-127`.
- *Appareils* : surtout ordinateur lent ; mobile pour les photos.
- *Preuve (confirmé pour les étapes)* :
  - en 6× : cocher une catégorie 208 ms, « Continuer » 240 ms, « Retour » 256 ms, dont environ 160 ms de travail de React pour « Continuer » et « Retour » ;
  - sur mobile : 88 à 152 ms (conforme) ; saisie : 48 à 80 ms (conforme) ;
  - photos de 12 Mpx : **non mesurable ici** (aucun ajout de photo dans le scénario, pas de téléphone réel).
- *Correction sans changement visible* : ne rendre que l'étape qui change (composants mémorisés) ; faire la mesure de `remonter()` à l'image suivante ; créer des vignettes réduites pour l'aperçu, en gardant la photo d'origine pour l'envoi.
- *Risque visuel* : aucun. *Accord* : non.

### 8.2 MOYEN (16)

| P | Problème | Fichier(s) | Appareils | Preuve mesurée | Correction proposée | Risque visuel | Accord |
|---|---|---|---|---|---|---|---|
| P2 | Lenis : le défilement passe par le fil principal | `components/site/SmoothScroll.tsx:19-35` | ordinateur | Rappels de Lenis : ≈ 150 à 470 ms par défilement en 6× sur les pages simples (catégorie 450, ville 467), 285 à 338 ms sur l'accueil. La comparaison avec et sans Lenis n'a pas été faite. | (a) couper Lenis sur appareils lents ; (c) synchroniser Lenis avec framer | aucun sur l'image ; (a) change l'inertie | oui pour (a) |
| P56 | Préchargement périmé après 30 s (Next 14.2), accueil jamais repréchargé | `components/site/SiteHeader.tsx` (liens du menu) ; `node_modules/next/.../prefetch-cache-utils.js:176-191` | surtout mobile | Mêmes trajets sur Android : 431–514 ms avec préchargement récent, 1 037–1 043 ms après 30 s (1 requête de 8–11 Ko au clic). Constat de la série « navigation ». | Précharger les liens du menu principal en mode complet (`prefetch={true}`), réutilisable 5 minutes. Ne pas toucher au réglage global `experimental.staleTimes` : il rendrait aussi les pages de l'admin moins fraîches. | aucun ; une page statique préchargée peut dater de quelques minutes | non |
| P28 | CSS en ligne absent des pages rendues à la demande, et des pages du blogue après 1 h | `scripts/inline-critical-css.mjs` ; `app/(fr)/blog/*` | les deux | Article rendu à la demande : 4 feuilles bloquantes, FCP = LCP = 2,75 s (devtools), 2,66–2,74 s (réel). `/blog` après 1 h en production : non mesurable ici. | Gestionnaire de cache qui applique le même remplacement, ou blogue entièrement statique | aucun | oui (risque fonctionnel ; le blogue statique change la publication) |
| P31 | 4 polices préchargées en concurrence avec l'image LCP | `app/layout.tsx:6-20` | mobile | Accueil devtools : polices (≈ 80 Ko) demandées à 652–655 ms, logo LCP à 658 ms. Le logo (13,9 Ko) met 979 ms à arriver. LCP 2,02 s, sous le seuil. | Ne plus précharger Chakra (à tester) ; garder les 3 graisses | la police peut s'afficher un instant plus tard | oui |
| P15 | Héros en mode allégé : boucle jamais arrêtée | `components/accueil/hero/HeroFx.tsx:337-368` | appareils lents | Non mesurable ici : le mode allégé ne s'est déclenché dans aucun profil (rappels ≤ 2,7 ms, sous le seuil de 25 ms). | Arrêter la boucle quand rien ne bouge | aucun | non |
| P17 | Ciel des pages intérieures sans mode allégé ; verdict non mémorisé | `components/site/CielEtoiles.tsx:39-40, 72` | mobile | Non confirmé à 4× : rappels ≤ 4,8 ms, le seuil de 25 ms n'aurait pas été atteint. Le coût réel est traité par P16. | Mesure partagée, verdict mémorisé, allègement | visible sur appareils lents | oui |
| P4 | Palette : 10 ombres floutées repeintes à chaque image | `components/accueil/palette-scene.tsx:101-106, 268-279, 298` | surtout mobile | Boucle de la palette : 528 ms (Android, jusqu'à 19,2 ms par image), 438 ms (iPhone). Coût de peinture non isolé. | Calque propre (`will-change`) pour les ombres | faible | non (variante allégée : oui) |
| P5 | Scène « Prise en charge » repeinte à chaque image | `components/pages/pages-services.css:105-181` ; `PinnedSteps.tsx:91-96` | les deux | Page très saccadée (Android 36,9 i/s, 6× 19,8 i/s), mais le temps mesuré va à l'en-tête et au ruban (P3). Peinture de la scène : non mesurable ici. | Calques pour les éléments de la scène | faible (netteté de la palette réduite à comparer) | non, sous réserve de captures |
| P19 | Compteurs : moteur d'animation de framer pour faire défiler un nombre | `components/site/Counter.tsx:3, 35-41` | les deux | 11 Ko synchrones sur 6 pages, 11 à 20 Ko sur l'accueil. Petits décalages du texte des compteurs (Estimation, ordinateur : 0,0034 au plus par décalage). | Réécrire sans framer (même courbe, même durée) ; n'écrire que si le texte change | faible | non |
| P21 | Catalogue d'étoiles chargé d'emblée | `CielEtoiles.tsx:4-15` ; `HeroFx.tsx:4-19` | les deux | 5,5 Ko synchrones sur 46 pages | Chargement à la demande au montage | les étoiles peuvent apparaître plus tard sur réseau lent | oui |
| P22 | Lenis téléchargé sur mobile, boucle perpétuelle sur ordinateur | `components/site/SmoothScroll.tsx:3, 30-35` | mobile (poids), ordinateur | 5,35 Ko sur 48 pages, jamais utilisés sur mobile. Boucle au repos négligeable (≤ 5 ms par 4 s). | Chargement à la demande après les tests ; boucle seulement pendant le mouvement | lissage actif quelques dizaines de ms plus tard | non |
| P23 | Scènes de l'accueil hydratées d'emblée | `palette-scene.tsx`, `donnees-destruction.tsx`, `etapes-camion.tsx` | surtout mobile | Chunk de l'accueil : 20,9 Ko, scènes comprises | Scènes animées seulement à l'approche de leur section | une animation d'entrée peut démarrer en retard | oui |
| P32 | `disque-dur.webp` brut (87 Ko) chargé dès le démarrage de l'accueil | `components/accueil/donnees-destruction.tsx:9, 33-36` | mobile | 87,2 Ko téléchargés à 5,4 s (accueil, devtools), même si la section n'est jamais vue ; aucun effet sur le LCP | Image optimisée, chargée à l'approche de la section | image recompressée ; risque d'arrivée tardive | oui |
| P35 | Objet du héros : place carrée réservée pour une image qui ne l'est pas | `components/site/PageHero.tsx:120-128` | les deux | CLS au chargement 0,011–0,014 sur les pages à objet de héros (Estimation, Achat, Prise en charge) ; sur l'Estimation, la source est l'objet (`div.tl-float`, 0,014) | Passer les vraies dimensions des images | aucun | non |
| P40 | Pas de compression Brotli | `next.config.mjs` ; serveur Hostinger | les deux | Non mesurable ici (pas de LiteSpeed en local). Calcul : −16 % sur le HTML (accueil 56,5 → 47,4 Ko), −15 à −20 % sur le JS. | Vérifier que LiteSpeed sait compresser, puis désactiver la compression de Next | aucun (risque fonctionnel si mal configuré) | non (action chez Hostinger) |
| P48 | Aucun signe d'attente pendant un changement de page | aucun `loading.tsx` dans `app/(fr)` ni `app/(en)` | surtout mobile | Clic → page : médiane 1,19 s sur Android, jusqu'à 2,38 s ; 6× : jusqu'à 2,21 s | Indicateur discret ou `loading.tsx` | nouvel élément visible | oui |

### 8.3 FAIBLE (30)

| P | Problème | Fichier(s) | Appareils | Preuve mesurée | Correction proposée | Risque | Accord |
|---|---|---|---|---|---|---|---|
| P8 | Lueur des cartes « engagements » au survol | `engagements-cartes.tsx:113-127` ; `chapitres.css:96-104` | ordinateur | non mesurable ici (survol continu) | lueur déplacée en transformation | faible | non |
| P9 | Reflet et glitch du logo non composés | `hero/hero.css:255-402` | les deux | Lighthouse liste le balayage (`background-position-x`) ; effet non isolé | enfant déplacé en transformation, ou pause en mode allégé | moyen | oui |
| P10 | Grain plein écran au-dessus du canevas | `hero/hero.css:126-135` | ordinateur | non mesurable ici (carte graphique de bureau, densité 1) | aucune ; baisse avec P16 | aucun | non |
| P11 | Reflet du trait animé en `left` à l'entrée | `hero/hero.css:458-486` | les deux | entrées listées comme non composées ; LCP réel conforme | reflet déplacé en transformation (flous inchangés) | aucun | non |
| P12 | Animations des héros intérieurs jamais suspendues | `app/site.css:691-714` ; `PageHero.tsx:119` | les deux | non mesuré (repos mesuré en haut de page seulement) | pause hors de l'écran | aucun | non |
| P13 | Apparitions (`Reveal`) : lectures et écritures alternées au montage | `components/site/Reveal.tsx:28-77` | les deux | défilement : traité dans P3 ; montage : non isolé | lire toutes les positions, puis écrire | aucun | non |
| P14 | Barre de lecture : attribut réécrit à chaque image | `components/blog/ReadingProgress.tsx:23-24` | les deux | non confirmé (≤ 43 ms par défilement de l'article sur mobile) | écrire seulement au changement | aucun | non |
| P20 | Textes FR + EN complets dans l'en-tête | `SiteHeader.tsx:11` ; `lib/i18n.ts` | les deux | chunk de 6,5 Ko, dont ≈ 4,5–5 Ko évitables sur 48 pages (juste sous le seuil) | textes d'une seule langue passés par le serveur | aucun | non |
| P24 | Carte du Québec en composant client | `components/accueil/zones-scene.tsx` | les deux | ≈ 3,5–4 Ko sur l'accueil FR et EN | carte rendue par le serveur, petit observateur côté client | aucun | non |
| P25 | Modules en double | `components/SubmissionForm.tsx:6-7` | les deux | 1 à 2,5 Ko (contact, soumission) | module de conversion sans `next/script` | aucun | non |
| P26 | Code des pixels livré sans pixel configuré | `components/tracking/AdPixels.tsx` | les deux | ≈ 3,5–4,5 Ko sur 48 pages | ne monter les pixels que s'ils sont configurés | aucun | non |
| P29 | Règles CSS de l'admin dans les pages publiques | `tailwind.config.ts:84-88` ; `app/globals.css` | les deux | CSS inutilisé 11–15 Ko (Lighthouse) ; −4,4 Ko compressés par page (calcul) | deux feuilles séparées (public, admin) | faible (à vérifier par comparaison) | non |
| P30 | CSS mort de l'ancien héros | `app/globals.css:231-418` | les deux | ≈ 1 Ko compressé par page | supprimer | aucun | non |
| P34 | Images des articles sans dimensions | `lib/posts.ts:695-700` | les deux | non confirmé (CLS 0 au défilement de l'article) | garder largeur et hauteur si Soro les fournit | aucun | non |
| P36 | Tailles des objets de la palette prévues pour l'ordinateur | `palette-scene.tsx:296` | mobile | non mesurable (images chargées au défilement) | tailles adaptées au mobile | aucun | non |
| P37 | Logo de l'en-tête préchargé en priorité haute | `SiteHeader.tsx:188` | les deux | 6,6 Ko en priorité haute, en même temps que l'image LCP ; effet non isolé | chargement immédiat sans priorité | aucun | non |
| P38 | Icône du site de 76 Ko | `app/icon.png` | les deux | non mesuré (hors de la trace Lighthouse) | recompression sans perte | aucun | non |
| P41 | Middleware exécuté sur chaque visite de l'accueil et du blogue | `middleware.ts:91-96` | les deux | non confirmé : réponse serveur de l'accueil 12–18 ms, de `/en` (sans middleware) 10–14 ms (local) | ne l'exécuter qu'avec les paramètres concernés | aucun | non |
| P42 | Cache d'images vide après chaque déploiement | `next.config.mjs:8-10` | les deux | non mesurable ici | réchauffer le cache après déploiement | aucun | non |
| P43 | Pixels Meta et Google à venir | `AdPixels.tsx:47-60` | mobile | non mesurable ici (pixels non configurés) | mesurer une fois configurés ; au besoin, charger au 1er geste | aucun | oui (marketing) |
| P44 | Envoi du formulaire : 3 à 4 appels l'un après l'autre | `app/api/soumission/route.ts:100-196` | les deux | non mesurable ici (formulaire jamais envoyé) | appels en parallèle | aucun | non |
| P46 | Recherche de la FAQ : tout est retraité à chaque lettre | `components/formulaire/FaqRecherche.tsx:78-93` | mobile | non mesuré | mots-clés précalculés | aucun | non |
| P47 | Liens internes des articles en liens bruts | `components/pages/BlogPostPage.tsx:399` | les deux | non mesuré | navigation douce par écouteur délégué | aucun | non |
| P49 | L'inertie de Lenis continue après un changement de page | `SmoothScroll.tsx:22-27` | ordinateur | non mesuré | option `stopInertiaOnNavigate` | aucun | non |
| P50 | Téléphone en paysage : héros plus haut que l'écran | `hero/hero.css:25-31` | mobile | non mesuré (pas de captures) | règle propre au paysage | moyen | oui |
| P51 | Champ « autre » à 14,8 px : zoom automatique d'iOS | `components/formulaire.css:330-340` | iOS | non mesurable ici (iPhone réel requis) | 16 px sur iOS seulement | faible | oui |
| P52 | Zones de toucher sous 44 px | `LangSwitcher.tsx:47` ; `SiteFooter.tsx` ; `formulaire.css:414-420` | mobile | non mesuré (audit Accessibilité non lancé) | zone invisible agrandie | aucun | non |
| P53 | Halo du formulaire : flou de 90 px | `components/formulaire.css:816-840` | mobile | non confirmé (11–13 % d'images ratées sur Android, comme les autres pages simples) | dégradés équivalents si le coût est prouvé | faible | oui |
| P54 | `overflow: clip` ignoré par iOS ≤ 15 | `app/site.css:54` | iOS ancien | non mesurable ici | repli `hidden` ciblé | faible | non |
| P55 | Touche Entrée du clavier : « Retour » au lieu de « Suivant » | `SubmissionForm.tsx:352-361` | mobile | non mesurable ici | `enterKeyHint` | aucun dans la page | oui (mineur) |

### 8.4 Hors classement
- Fichiers inutilisés dans `public/` (dont `entrepot.jpg`, 525 Ko) : ils n'alourdissent que le dépôt.
- `public/.htaccess` : probablement sans effet derrière Next.
- Accueil : 807 éléments dans la page, sans avertissement bloquant.

---

## 9. Plan proposé pour la phase 2

Chaque correction sera vérifiée avec les mêmes mesures (série « après »), comparées page par page à celles de ce rapport. Rien n'est mis en ligne sans votre « mets en ligne ».

### Lot 1 — sans changement visible ni risque fonctionnel notable (par ordre de gain sur risque)

| Ordre | Problème(s) | Ce qui change dans le code | Gain attendu (mesuré avant) |
|---|---|---|---|
| 1 | **P3** | Une seule lecture de la position par image, partagée par l'en-tête, le ruban, les apparitions et le héros ; largeur du ruban mémorisée | Une bonne partie de 1,5–2,6 s par défilement en 6× (en-tête) et de 1,3 s (ruban, accueil) ; défilement de l'accueil et des 3 pages de services |
| 2 | **P16** (volet image identique) + **P15** | Ciel redessiné seulement là où des étoiles changent ; boucle arrêtée au repos en mode allégé | TBT mobile (aujourd'hui 362–1 492 ms) et charge au repos (44–73 % sur téléphone) ; à confirmer par comparaison pixel à pixel |
| 3 | **P1** | Destruction des données : rien à redessiner si rien ne change ; copie limitée | Jusqu'à ≈ 1 s de travail par défilement de l'accueil sur téléphone |
| 4 | **P18** | Menus animés en CSS (identiques, position actuelle comprise) ; préchargement des pages « Services » à l'inactivité ; pas de nouveau rendu au focus | INP du 1er clic « Services » (216–320 ms en 6×) et du menu mobile (jusqu'à 232 ms) ; −9–10 Ko sur toutes les pages, −23,5 Ko différés sur 38 pages |
| 5 | **P6** | Camion : préparation gardée en mémoire et faite hors du clic | INP de l'étape 3 : 408 ms en 6× |
| 6 | **P45** | Formulaire : rendu limité à l'étape ; mesure hors du clic ; vignettes réduites | INP 208–256 ms en 6× sur la soumission |
| 7 | **P33** (connexion anticipée seulement) | `preconnect` vers le domaine des images Soro | LCP du blogue (2,62 s) : temps de connexion au 2e domaine |
| 8 | **P56** | Liens du menu principal préchargés en mode complet (réutilisables 5 minutes) ; l'admin n'est pas touché | ≈ 0,5 s par clic du menu sur mobile après 30 s de visite |
| 9 | **P22, P19, P20, P24, P25, P26** | JavaScript allégé (Lenis à la demande, compteurs sans framer, textes d'une seule langue, carte côté serveur, doublons, pixels) | ≈ 5 Ko (toutes les pages, mobile) + 11 à 20 Ko (pages à compteurs) + ≈ 4–5 Ko (toutes) + 3,5–4 Ko (accueil) + 1–4,5 Ko |
| 10 | **P35, P29, P30** | Vraies dimensions des objets du héros ; CSS de l'admin séparé ; CSS mort retiré | CLS de 0,011–0,014 → 0 ; −4 à −5 Ko compressés par page |
| 11 | **P4, P5** | Calques pour les ombres de la palette et la scène de prise en charge (après comparaison de captures) | Coût de peinture, à mesurer |
| 12 | **P11, P12, P13, P14, P37, P38, P41, P36, P46, P47, P49, P52, P54, P34, P44, P8** | Hygiène : chacune est petite et sans effet visible | Faible, cumulatif |

### Lot 2 — à valider avec vous (changement perceptible ou risque fonctionnel)

| Question | Problème | Ce qui vous est proposé | Pourquoi votre accord |
|---|---|---|---|
| Q1 | **P27** | Prototyper une extension de `scripts/inline-critical-css.mjs` pour que le CSS ne soit plus retéléchargé ; tester toutes les navigations avant adoption | Script sensible (il corrige le LCP) ; risque de navigation bloquée. Gain potentiel le plus fort sur le score PageSpeed. |
| Q2 | **P39** | Ne plus précharger les ~33 liens du pied de page et du ruban (ou seulement au survol ou au toucher) | Les pages villes et catégories s'ouvriraient un peu moins vite au clic |
| Q3 | **P7** | Accordéon de l'accueil et étapes de l'Estimation animés en transformation, pour supprimer les décalages (CLS 0,14–0,23 sur téléphone) | Même rendu final, mais l'animation est reconstruite |
| Q4 | **P16 / P17** | Ciel à 30 i/s au repos ; densité réduite et mode allégé sur appareils lents, mémorisé ; démarrage après la fin du chargement | Cadence de scintillement, finesse ou moment d'apparition modifiés |
| Q5 | **P2** | Défilement lissé coupé sur les appareils lents | Sensation d'inertie différente sur ces appareils |
| Q6 | **P33** | Images du blogue passées par l'optimiseur (AVIF redimensionné, mis en cache) | Recompression des images |
| Q7 | **P28** | Gestionnaire de cache qui garde le CSS en ligne sur le blogue et les articles, ou blogue entièrement statique | Risque fonctionnel ; la version statique ne montrerait les nouveaux articles qu'au déploiement |
| Q8 | **P31** | Ne plus précharger la police Chakra | Le texte peut rester un instant de plus dans la police de repli |
| Q9 | **P21, P23, P32** | Catalogue d'étoiles, scènes de l'accueil et image du disque chargés à la demande | Apparition ou animation possiblement retardée sur réseau lent ; image du disque recompressée |
| Q10 | **P48** | Indicateur discret pendant un changement de page | Nouvel élément visuel |
| Q11 | **P18** | La position actuelle du panneau « Services » (probablement décalée vers la droite) est-elle voulue ? | La corriger serait un changement visible |
| Q12 | **P4, P6, P9** (variantes allégées) | Sur appareils lents : ombres sans flou, moitié des confettis, camion sans flou de mouvement, reflet du logo en pause | Allègements visibles sur ces appareils |
| Q13 | **P50, P51, P53, P55** | Paysage, police du champ « autre » sur iOS, halo du formulaire, touche du clavier | Changements de design ou de comportement |
| Q14 | **P1** (variante) | Trous de la destruction découpés par un masque | Bords à ±1 pixel près |

### Lot 3 — hors code
- **P40 — Brotli** : vérifier avec Hostinger que LiteSpeed peut compresser en Brotli les réponses de Next. Ensuite seulement, désactiver la compression de Next (−16 % sur le HTML).
- **P42 — Cache d'images** : réchauffer le cache après chaque déploiement (logos, objets des héros, images du blogue).
- **P43 — Pixels** : mesurer de nouveau le TBT une fois les identifiants Meta et Google configurés.
- **Après la mise en ligne** de `dev` :
  - relancer PageSpeed Insights sur technolot.ca (le site en ligne est aujourd'hui l'ancienne version) ;
  - vérifier, une heure après le déploiement, que `/blog` garde son CSS en ligne (P28).

---

## 10. Ce qui est déjà bien fait

- **Pages pré-rendues** : toutes les pages publiques sont générées à l'avance (le blogue est régénéré toutes les heures). Le serveur répond en 7 à 18 ms en local.
- **Ordinateur** : Lighthouse 99–100 sur toutes les pages, TBT de 0 à 16 ms, navigation au clic en 40 à 60 ms.
- **CLS au chargement pratiquement nul** partout (au plus 0,017) : polices de repli ajustées, images dimensionnées, héros rendus côté serveur, rien de masqué en attendant le JavaScript.
- **Chargement réel sur téléphone** : LCP de 1,6 à 2,0 s sur 11 pages sur 13. Le CSS inclus dans la page évite toute feuille bloquante sur les pages pré-rendues. L'article, qui n'en profite pas, est plus lent (2,75 s).
- **Images** : l'optimiseur de Next est utilisé pour toutes les images locales (AVIF puis WebP), avec des tailles justes presque partout, une priorité sur l'image principale et un chargement différé ailleurs.
- **Polices** auto-hébergées, avec affichage immédiat d'une police de repli ajustée, et seulement le sous-ensemble latin.
- **Ciels** : pause hors de l'écran et en onglet caché, densité plafonnée, dessin regroupé, image fixe si l'utilisateur préfère réduire les animations. Le mode allégé automatique de l'accueil existe déjà ; il faut seulement l'étendre (P15–P17).
- **Saisie fluide** dans le formulaire (48 à 80 ms) ; accordéons de la FAQ réactifs (16 à 96 ms).
- **JavaScript** : aucune bibliothèque lourde (Supabase, graphiques) sur le site public ; framer-motion en chargement « paresseux » strict ; icônes importées à l'unité.
- **Robustesse** : aucune erreur de page en WebKit ; tous les liens internes passent par le routeur de Next.
- **Mouvement réduit** : la préférence « réduire les animations » est respectée partout.
- **Suivi publicitaire** : il n'est envoyé qu'à l'inactivité du navigateur, et les pixels sont chargés en dernier.

---

## Annexes

### A. Rapports et données brutes
Dossier : `C:\Users\Admin\AppData\Local\Temp\claude\C--Users-Admin-Desktop-Site-TechnoLot\d2298c07-46bb-41a4-9a41-f64162c5f8b1\scratchpad\results\avant\` (dossier temporaire : à copier si on veut le garder).
- **Lighthouse simulé** (rapport HTML du passage médian) : `lighthouse\<page>__mobile__median-runN.html` et `lighthouse\<page>__desktop__median-runN.html`. Exemples : `accueil__mobile__median-run1.html`, `blog__mobile__median-run1.html`, `article__mobile__median-run1.html`, `contact__mobile__median-run3.html`.
- **Lighthouse devtools** (mobile) :
  - `lighthouse-devtools\accueil__mobile__median-run3.html`, `a-propos__mobile__median-run2.html`, `contact__mobile__median-run1.html`, `blog__mobile__median-run2.html` ;
  - `article__mobile__median-run3.html`, `faq__mobile__median-run2.html`, `soumission__mobile__median-run2.html`, `consultation__mobile__median-run3.html` ;
  - `achat__mobile__median-run3.html`, `prise-en-charge__mobile__median-run2.html`, `categorie__mobile__median-run2.html`, `ville__mobile__median-run1.html`, `en-accueil__mobile__median-run3.html`.
- **Résumés** : `lighthouse-summary.md`, `lighthouse-devtools-summary.md`, `frames-summary.md`, `interactions-summary.md`, `navigation-summary.md`, `webkit-summary.md`. Les données détaillées sont dans les `.json` du même nom et les sous-dossiers.

### B. Correspondance avec les audits de départ
- A1→P1, A2→P2, A3→P15, A4→P16, A5→P17, A6/A12/A16→P3, A7→P4, A8→P5, A9→P6, A10→P7, A11/A21→P45, A13→P18, A14→P49, A15→P22, A17→P13, A18→P8, A19→P9, A20→P10, A22→P46, A23→P19, A24→P11, A25→P12, A26→P14, A27→P47, A28→P52.
- C1 = note de méthode (polices sous Windows), C2→P31, C3→P29, C4→P30, C5→P27, C6→P28, C7→P33, C8→P34, C9→P32, C10→P35, C11→P36, C12→P37, C13→P39, C14→P41, C15→P40, C16→P42, C17→P43, C18→P44, C19→P38, C20→P20+P24.
- M1→P50, M2→P51, M3→P52, M4→P53, M5→P4+P6+P12, M6→P54, M7→P55.
- B1 = note de méthode (First Load JS), B2→P18, B3→P19, B4→P20, B5→P21, B6→P22, B7→P41, B8→P24, B9→P25, B10→P26, B11→P23.
- Ajoutés après les mesures : P48 (indicateur d'attente) et P56 (préchargement périmé après 30 s).

### C. Scripts du build mesuré (pour lire les résultats bruts)

| Chunk | Contenu |
|---|---|
| `1251` | scènes de l'accueil : héros et ciel (`m82174`), destruction des données (`m16250`), palette (`m3198`), ruban (`m42698`), apparitions (`m52475`) |
| `4967`, `8194`, `8543`, `5682` | ciel des pages intérieures (`m35165`), ruban, apparitions (pages de services ; FAQ, villes et catégories ; blogue ; contact et soumission) |
| `2463` | article (ruban, barre de lecture) |
| `1567` | en-tête (`m50493`), défilement lissé (`m6955`) |
| `4740` | Lenis |
| `8673` | framer-motion (boucle d'animation `m85005`) |
| `2117` | routeur de Next (dont le traitement des pages préchargées, `m97950`) |
| `fd9d1056` | React |
