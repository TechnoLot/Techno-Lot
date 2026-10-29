/**
 * Périodes partagées des tableaux de l'admin (paramètre d'URL `periode`).
 * Module pur : jours inclusifs « YYYY-MM-DD » à l'heure de Toronto, calculés
 * depuis le jour courant fourni par l'appelant (ex. `torontoDay()`).
 */

import { addDays } from "@/lib/ebay/totaux";

export const PERIODES = [
  { key: "aujourdhui", label: "Aujourd’hui" },
  { key: "hier", label: "Hier" },
  { key: "semaine", label: "Cette semaine" },
  { key: "7j", label: "7 jours" },
  { key: "30j", label: "30 jours" },
  { key: "mois", label: "Ce mois" },
  { key: "moisdernier", label: "Mois dernier" },
  { key: "90j", label: "90 jours" },
  { key: "annee", label: "Cette année" },
  { key: "tout", label: "Tout" },
] as const;

export type PeriodeKey = (typeof PERIODES)[number]["key"];

/** Longueur en jours des périodes glissantes. */
const DUREES: Partial<Record<PeriodeKey, number>> = {
  aujourdhui: 1,
  hier: 1,
  "7j": 7,
  "30j": 30,
  "90j": 90,
};

/** Lundi de la semaine du jour donné (calcul sur la date seule, sans fuseau). */
function lundi(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = dimanche
  return addDays(day, -((dow + 6) % 7));
}

/** Premier jour du mois du jour donné. */
function debutMois(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Bornes du mois précédant celui du jour donné. */
function moisPrecedent(day: string): { from: string; to: string } {
  const to = addDays(debutMois(day), -1);
  return { from: debutMois(to), to };
}

export function parsePeriode(value: string | null | undefined, defaut: PeriodeKey): PeriodeKey {
  return PERIODES.find((p) => p.key === value)?.key ?? defaut;
}

export function bornesPeriode(key: PeriodeKey, aujourdhui: string): { from: string | null; to: string | null } {
  switch (key) {
    case "hier": {
      const hier = addDays(aujourdhui, -1);
      return { from: hier, to: hier };
    }
    case "semaine":
      return { from: lundi(aujourdhui), to: aujourdhui };
    case "mois":
      return { from: debutMois(aujourdhui), to: aujourdhui };
    case "moisdernier":
      return moisPrecedent(aujourdhui);
    case "annee":
      return { from: `${aujourdhui.slice(0, 4)}-01-01`, to: aujourdhui };
    case "tout":
      return { from: null, to: null };
    default:
      return { from: addDays(aujourdhui, -((DUREES[key] ?? 1) - 1)), to: aujourdhui };
  }
}

/**
 * Fenêtre comparable juste avant la période ; null pour « annee » et « tout ».
 * semaine : même portion de la semaine d'avant ; mois : même portion du mois
 * précédent (bornée à sa fin) ; moisdernier : le mois d'avant, en entier.
 */
export function periodePrecedente(key: PeriodeKey, aujourdhui: string): { from: string; to: string } | null {
  if (key === "semaine") {
    return { from: addDays(lundi(aujourdhui), -7), to: addDays(aujourdhui, -7) };
  }
  if (key === "mois") {
    const prec = moisPrecedent(aujourdhui);
    const meme = `${prec.from.slice(0, 8)}${aujourdhui.slice(8, 10)}`;
    return { from: prec.from, to: meme < prec.to ? meme : prec.to };
  }
  if (key === "moisdernier") {
    return moisPrecedent(moisPrecedent(aujourdhui).from);
  }
  const duree = DUREES[key];
  const { from } = bornesPeriode(key, aujourdhui);
  if (!duree || !from) return null;
  return { from: addDays(from, -duree), to: addDays(from, -1) };
}

export function libellePeriode(key: PeriodeKey): string {
  switch (key) {
    case "aujourdhui":
      return "aujourd’hui";
    case "hier":
      return "hier";
    case "semaine":
      return "cette semaine";
    case "mois":
      return "ce mois-ci";
    case "moisdernier":
      return "le mois dernier";
    case "7j":
      return "les 7 derniers jours";
    case "30j":
      return "les 30 derniers jours";
    case "90j":
      return "les 90 derniers jours";
    case "annee":
      return "cette année";
    case "tout":
      return "depuis le début";
  }
}

export function granularitePeriode(key: PeriodeKey): "aucune" | "jour" | "mois" {
  if (key === "aujourdhui" || key === "hier") return "aucune";
  if (key === "annee" || key === "tout") return "mois";
  return "jour";
}
