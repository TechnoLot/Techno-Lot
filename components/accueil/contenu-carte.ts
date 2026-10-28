import type { Locale } from "@/lib/i18n";

/** Textes de la carte « Partout au Québec » (FR + EN). */
export type ContenuCarte = {
  /** Mention mise en évidence sous le paragraphe. */
  minimum: string;
  /** Titre et description de la carte (accessibilité). */
  mapTitle: string;
  mapDesc: (villes: string[]) => string;
  /** Nom de la ville de départ des trajets, sur la carte. */
  departLabel: string;
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
  mapTitle: "Carte du sud du Québec : les villes où nous passons",
  mapDesc: (villes) =>
    `Notre équipe se déplace partout au Québec, notamment à ${liste(villes, "et")}${NBSP}; le ramassage est gratuit.`,
  departLabel: "Grand Montréal",
  names: {},
};

const en: ContenuCarte = {
  minimum: "No minimum",
  mapTitle: "Map of southern Québec: the cities we serve",
  mapDesc: (villes) => `Our team travels anywhere in Québec, including ${liste(villes, "and")}; pickup is free.`,
  departLabel: "Greater Montréal",
  names: { quebec: "Québec City" },
};

export function getContenuCarte(locale: Locale): ContenuCarte {
  return locale === "en" ? en : fr;
}
