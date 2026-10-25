/**
 * Ligne médiane de la marque du logo (la boucle et sa flèche), tracée sur
 * public/accueil/logo-marque.png par scrollcraft/builds/techno-lot-datacenter/
 * lab/marque-trace.py. Elle sert seulement de masque : on ne redessine pas le
 * logo, on révèle la vraie image le long de son propre trait, du bout ouvert
 * en haut à droite jusqu'à la pointe de la flèche.
 */
export const MARQUE = {
  w: 728,
  h: 677,
  // Le trait du logo fait ~42 px ; le masque est plus large pour couvrir
  // l'anticrénelage et les bouts arrondis.
  mask: 66,
  main:
    "M562 44 L553 41 L483 30 L409 23 L354 21 L268 23 L209 28 L124 41 L104 46 L86 53 L75 60 L61 74 L54 85 L47 102 L37 150 L29 205 L23 277 L22 311 L23 399 L29 471 L41 549 L47 574 L53 589 L63 604 L76 616 L94 626 L133 636 L217 648 L281 653 L396 653 L460 648 L526 639 L558 633 L583 626 L599 617 L617 599 L624 587 L630 570 L641 513 L649 448 L653 370 L652 332",
  barbs: "M652 332 L600 390 M652 332 L704 391",
  dollar: { x: 240, y: 168, w: 196, h: 342 },
};

/**
 * Le logo complet (marque au-dessus du mot-symbole), en fractions de sa
 * boîte, d'après public/logo.png (1919 x 1158, boîte utile 1816 x 1055).
 */
export const LOGO_BOX = {
  aspect: 1816 / 1055,
  mark: { left: 544 / 1816, top: 0, width: 728 / 1816 },
  word: { top: 778 / 1055, width: 1 },
};
