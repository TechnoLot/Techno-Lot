/**
 * Géométrie du lot détouré (public/accueil/lot.webp, 848 x 1388 px).
 *
 * Chaque couche du lot est une bande de cette image. Les coupes suivent
 * l'occlusion réelle de la photo : là où le dessus de la couche du dessous
 * dépasse sur les côtés de celle du dessus (le dessus du commutateur autour
 * des portables, le plateau de la palette autour des tours), la coupe
 * descend en escalier, pour que ce dessus reste avec sa couche.
 *
 * La photo ne montre pas ce qui est caché sous une couche : le dessus du
 * commutateur sous les portables, le plateau sous les tours. Ces surfaces
 * sont reconstituées dans lot-fill.webp, utilisée par les bandes « réseau »
 * et « palette ». Les bandes s'empilent de haut en bas (la couche du dessus
 * passe devant), donc ces surfaces n'apparaissent qu'une fois la couche du
 * dessus partie.
 *
 * Valeurs mesurées sur le canal alpha et sur la photo, en fractions de la
 * hauteur (y) et de la largeur (x) de l'image.
 */
export const LOT_ASPECT = 848 / 1388;

// Frontières entre couches (y) et emprise des couches du dessus (x).
const Y = {
  lapSide: 0.2226, // dessus du commutateur, sur les côtés des portables
  lapIn: 0.2392, // bas du dernier portable
  sw: 0.3566, // bas du second commutateur
  srv: 0.5555, // bas du troisième serveur
  towSide: 0.8199, // plateau de la palette, sur les côtés des tours
  towIn: 0.8746, // bas de la seconde tour
};
const X = { lapL: 0.138, lapR: 0.8514, towL: 0.0495, towR: 0.9458 };

// La bande du dessus déborde de 0,15 % sur celle du dessous : au repos les
// deux dessinent les mêmes pixels, et aucune ligne de jointure n'apparaît.
const O = 0.0015;

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const poly = (pts: [number, number][]) =>
  `polygon(${pts.map(([x, y]) => `${pct(x)} ${pct(y)}`).join(", ")})`;

export type LotBand = {
  /** Image source : la photo, ou la version aux surfaces reconstituées. */
  src: "/accueil/lot.webp" | "/accueil/lot-fill.webp";
  /** Haut et bas de la couche, pour placer la ligne du bordereau. */
  top: number;
  bottom: number;
  /** Emprise horizontale de ce qui doit traverser la ligne. */
  left: number;
  right: number;
  /** Découpe de la bande dans l'image. */
  clip: string;
};

export const LOT_BANDS: LotBand[] = [
  // Portables
  {
    src: "/accueil/lot.webp",
    top: 0,
    bottom: Y.lapIn,
    left: 0.138,
    right: 0.8514,
    clip: poly([
      [-0.2, -0.2],
      [1.2, -0.2],
      [1.2, Y.lapSide + O],
      [X.lapR, Y.lapSide + O],
      [X.lapR, Y.lapIn + O],
      [X.lapL, Y.lapIn + O],
      [X.lapL, Y.lapSide + O],
      [-0.2, Y.lapSide + O],
    ]),
  },
  // Équipement réseau (avec le dessus reconstitué sous les portables)
  {
    src: "/accueil/lot-fill.webp",
    top: Y.lapIn,
    bottom: Y.sw,
    left: 0.0259,
    right: 0.9693,
    clip: poly([
      [-0.2, Y.lapSide],
      [1.2, Y.lapSide],
      [1.2, Y.sw + O],
      [-0.2, Y.sw + O],
    ]),
  },
  // Serveurs
  {
    src: "/accueil/lot.webp",
    top: Y.sw,
    bottom: Y.srv,
    left: 0.0142,
    right: 0.98,
    clip: poly([
      [-0.2, Y.sw],
      [1.2, Y.sw],
      [1.2, Y.srv + O],
      [-0.2, Y.srv + O],
    ]),
  },
  // Postes de travail
  {
    src: "/accueil/lot.webp",
    top: Y.srv,
    bottom: Y.towIn,
    left: 0.0425,
    right: 0.9493,
    clip: poly([
      [-0.2, Y.srv],
      [1.2, Y.srv],
      [1.2, Y.towSide + O],
      [X.towR, Y.towSide + O],
      [X.towR, Y.towIn + O],
      [X.towL, Y.towIn + O],
      [X.towL, Y.towSide + O],
      [-0.2, Y.towSide + O],
    ]),
  },
  // Palette (plateau reconstitué sous les tours), avec son ombre de contact
  // qui déborde de 16 % de chaque côté
  {
    src: "/accueil/lot-fill.webp",
    top: Y.towIn,
    bottom: 1,
    left: -0.16,
    right: 0.9917,
    clip: poly([
      [-0.2, Y.towSide],
      [1.2, Y.towSide],
      [1.2, 1.3],
      [-0.2, 1.3],
    ]),
  },
];
