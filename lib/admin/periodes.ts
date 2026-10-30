/**
 * Périodes partagées des tableaux de l'admin (paramètre d'URL `periode`).
 * Module pur : jours inclusifs « YYYY-MM-DD » à l'heure de Toronto, calculés
 * depuis le jour courant fourni par l'appelant (ex. `torontoDay()`).
 * « annee » est l'année fiscale de l'entreprise : du 1er avril au 31 mars.
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
  { key: "annee", label: "Année fiscale" },
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

/** 1er avril de l'année fiscale (1er avril → 31 mars) du jour donné. */
export function debutAnneeFiscale(day: string): string {
  const annee = Number(day.slice(0, 4));
  return `${Number(day.slice(5, 7)) >= 4 ? annee : annee - 1}-04-01`;
}

/** « 2026-2027 » : nom de l'année fiscale du jour donné. */
export function nomAnneeFiscale(day: string): string {
  const debut = Number(debutAnneeFiscale(day).slice(0, 4));
  return `${debut}-${debut + 1}`;
}

/** Même jour un an plus tôt (un 29 février devient le 28). */
function unAnAvant(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dernierJour = new Date(Date.UTC(y - 1, m, 0)).getUTCDate();
  return `${y - 1}-${day.slice(5, 7)}-${String(Math.min(d, dernierJour)).padStart(2, "0")}`;
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
      return { from: debutAnneeFiscale(aujourdhui), to: aujourdhui };
    case "tout":
      return { from: null, to: null };
    default:
      return { from: addDays(aujourdhui, -((DUREES[key] ?? 1) - 1)), to: aujourdhui };
  }
}

/**
 * Fenêtre comparable juste avant la période ; null pour « tout ».
 * semaine : même portion de la semaine d'avant ; mois : même portion du mois
 * précédent (bornée à sa fin) ; moisdernier : le mois d'avant, en entier ;
 * annee : même portion de l'année fiscale d'avant (du 1er avril à pareille date).
 */
export function periodePrecedente(key: PeriodeKey, aujourdhui: string): { from: string; to: string } | null {
  if (key === "annee") {
    return { from: unAnAvant(debutAnneeFiscale(aujourdhui)), to: unAnAvant(aujourdhui) };
  }
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
      return "cette année fiscale";
    case "tout":
      return "depuis le début";
  }
}

/** « vs … » : la fenêtre de `periodePrecedente` en mots ; null s'il n'y en a pas. */
export function libellePrecedente(key: PeriodeKey): string | null {
  switch (key) {
    case "aujourdhui":
      return "vs la veille";
    case "hier":
      return "vs avant-hier";
    case "semaine":
      return "vs la semaine d’avant";
    case "7j":
      return "vs les 7 jours d’avant";
    case "30j":
      return "vs les 30 jours d’avant";
    case "90j":
      return "vs les 90 jours d’avant";
    case "mois":
      return "vs le mois d’avant à pareille date";
    case "moisdernier":
      return "vs le mois d’avant";
    case "annee":
      return "vs l’an dernier à pareille date";
    case "tout":
      return null;
  }
}

// Jours « YYYY-MM-DD » sans heure : formatés en UTC pour éviter tout décalage.
const jourCourtFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", day: "numeric", month: "short" });
const jourAnneeFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const jourLongFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

/** Formate un jour « YYYY-MM-DD » ; le premier du mois s'écrit « 1er ». */
export function formatJour(day: string, fmt: Intl.DateTimeFormat = jourCourtFmt): string {
  const [y, m, d] = day.split("-").map(Number);
  return fmt
    .formatToParts(new Date(Date.UTC(y, m - 1, d)))
    .map((p) => (p.type === "day" && p.value === "1" ? "1er" : p.value))
    .join("");
}

/** « Du 1er avr. au 29 oct. 2026 », « Jeudi 29 octobre » ou « Depuis le début ». */
export function legendeDates(from: string | null, to: string | null): string {
  if (!from || !to) return "Depuis le début";
  if (from === to) {
    const s = formatJour(from, jourLongFmt);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const debut = from.slice(0, 4) === to.slice(0, 4) ? formatJour(from) : formatJour(from, jourAnneeFmt);
  return `Du ${debut} au ${formatJour(to, jourAnneeFmt)}`;
}

export function granularitePeriode(key: PeriodeKey): "aucune" | "jour" | "mois" {
  if (key === "aujourdhui" || key === "hier") return "aucune";
  if (key === "annee" || key === "tout") return "mois";
  return "jour";
}
