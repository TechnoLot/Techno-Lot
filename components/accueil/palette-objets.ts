/**
 * Chargement de la palette (public/images/palette/), calé à l'échelle réelle.
 *
 * Unités : pixels de palette-vide.webp (1400 × 306). La scène fait 1400 × 900.
 * Les objets se posent sur la ligne d'appui du plancher (y = 96 px depuis le haut
 * de l'image, soit B0 = 210 au-dessus du bas de la palette). À cette profondeur
 * le plancher mesure 1271 px pour 120 cm, soit ≈ 10,6 px/cm :
 * serveur 46 cm, tour 21 cm, imprimante 36 cm, écran 24 po 55 cm, pile de
 * portables 36 cm, disques 3,5 po ≈ 15 cm (ombre d'origine rognée), commutateur
 * 44 cm, clavier 45 cm, portable fermé 35 cm, tablette 25 cm.
 *
 * x = bord gauche, b = bas de l'image (au-dessus du bas de la palette), w = largeur.
 * Chaque objet repose sur le dessus (vu en légère plongée) de celui du dessous.
 * shadow = [centre x, y d'appui, largeur] de l'ombre de contact.
 * drop = rang de chute (0 = premier) ; l'ordre du tableau = ordre d'empilement à l'écran.
 */
export const PAL_W = 1400;
export const PAL_H = 306;
export const STAGE_H = 900;

export type PaletteObjet = {
  src: string;
  dims: readonly [number, number];
  x: number;
  b: number;
  w: number;
  drop: number;
  shadow: readonly [number, number, number];
  /** Rotation finale (degrés) et pivot, pour la tablette appuyée. */
  r?: number;
  origin?: string;
  /** Part de droite de l'image à masquer (ombre portée intégrée à l'image). */
  clipRight?: number;
};

export const OBJETS: readonly PaletteObjet[] = [
  // Colonne de droite, un peu plus au fond : imprimante, puis l'écran posé dessus
  { src: "obj-imprimante", dims: [493, 299], x: 873, b: 214, w: 382, drop: 1, shadow: [1064, 214, 360] },
  { src: "obj-ecran", dims: [615, 502], x: 752, b: 388, w: 583, drop: 3, shadow: [1064, 388, 300] },
  // Colonne de gauche : tour, puis la pile de disques durs
  { src: "obj-tour", dims: [333, 628], x: 68, b: 210, w: 223, drop: 2, shadow: [180, 210, 215] },
  { src: "obj-disques", dims: [418, 251], x: 101, b: 596, w: 201, drop: 5, shadow: [180, 596, 150], clipRight: 0.215 },
  // Colonne centrale : serveur, pile de portables, commutateur, clavier, portable, tablette
  { src: "obj-serveur", dims: [882, 277], x: 298, b: 210, w: 488, drop: 0, shadow: [542, 210, 470] },
  { src: "obj-pile-portables", dims: [546, 298], x: 351, b: 342, w: 382, drop: 4, shadow: [542, 342, 360] },
  { src: "obj-commutateur", dims: [807, 239], x: 309, b: 466, w: 466, drop: 6, shadow: [542, 519, 450] },
  { src: "obj-clavier", dims: [742, 130], x: 303, b: 583, w: 477, drop: 7, shadow: [542, 583, 460] },
  { src: "obj-portable", dims: [511, 135], x: 356, b: 625, w: 371, drop: 8, shadow: [542, 625, 355] },
  {
    src: "obj-tablette",
    dims: [427, 303],
    x: 455,
    b: 679,
    w: 265,
    drop: 9,
    shadow: [600, 679, 220],
    r: 5,
    origin: "100% 100%",
  },
];

export const TOTAL = OBJETS.length;
