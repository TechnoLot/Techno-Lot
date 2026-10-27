import type { Locale } from "@/lib/i18n";

/** Textes de la carte interactive « Partout au Québec » (FR + EN). */
export type ContenuCarte = {
  /** Mention mise en évidence sous le paragraphe. */
  minimum: string;
  /** Lien d'adresse : précision pour lecteurs d'écran. */
  newTab: string;
  /** Repère du siège social sur la carte. */
  hqName: string;
  hqCity: string;
  /** Titre et description de la carte (accessibilité). */
  mapTitle: string;
  mapDesc: (villes: string[]) => string;
  /** Nom de la liste des villes (boutons de la carte). */
  listLabel: string;
  /** Libellé d'un bouton de ville. */
  cityButton: (ville: string) => string;
  /** Noms affichés différents du nom français (clé = id de ville). */
  names: Record<string, string>;
};

function liste(villes: string[], et: string): string {
  if (villes.length < 2) return villes.join("");
  return `${villes.slice(0, -1).join(", ")} ${et} ${villes[villes.length - 1]}`;
}

const NBSP = " ";

const fr: ContenuCarte = {
  minimum: "Aucun minimum",
  newTab: "(s'ouvre dans un nouvel onglet)",
  hqName: "Techno Lot",
  hqCity: "Mascouche",
  mapTitle: "Carte du Québec : nos trajets de ramassage depuis Mascouche",
  mapDesc: (villes) =>
    `Depuis notre siège social de Mascouche, notre équipe se rend notamment à ${liste(villes, "et")}${NBSP}: tout le Québec est desservi, ramassage gratuit.`,
  listLabel: "Quelques villes où nous passons",
  cityButton: (ville) => `${ville}${NBSP}: voir le trajet depuis Mascouche`,
  names: {},
};

const en: ContenuCarte = {
  minimum: "No minimum",
  newTab: "(opens in a new tab)",
  hqName: "Techno Lot",
  hqCity: "Mascouche",
  mapTitle: "Map of Québec: our pickup routes from Mascouche",
  mapDesc: (villes) =>
    `From our head office in Mascouche, our team travels to ${liste(villes, "and")}, among others: all of Québec is covered, with free pickup.`,
  listLabel: "Some of the cities we serve",
  cityButton: (ville) => `${ville}: show the route from Mascouche`,
  names: { quebec: "Québec City" },
};

export function getContenuCarte(locale: Locale): ContenuCarte {
  return locale === "en" ? en : fr;
}
