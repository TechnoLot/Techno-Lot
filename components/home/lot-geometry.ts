/**
 * Géométrie du lot détouré (public/accueil/lot.png).
 *
 * L'image est recadrée au plus près du lot. Chaque couche du lot est une
 * bande horizontale de cette image : les valeurs sont des fractions de la
 * hauteur (top, bottom) et de la largeur (left, right) de l'image, mesurées
 * sur le canal alpha. La signature de la page fait glisser chaque bande
 * séparément, de la plus haute à la palette.
 */
export const LOT_ASPECT = 0.75; // largeur / hauteur de lot.png

export const LOT_BANDS: { top: number; bottom: number; left: number; right: number }[] = [
  { top: 0, bottom: 0.2, left: 0.1, right: 0.9 },
  { top: 0.2, bottom: 0.4, left: 0.05, right: 0.95 },
  { top: 0.4, bottom: 0.6, left: 0.05, right: 0.95 },
  { top: 0.6, bottom: 0.8, left: 0.05, right: 0.95 },
  { top: 0.8, bottom: 1, left: 0, right: 1 },
];
