/**
 * Accueil de l'admin (module pur) : tâches « À faire aujourd’hui », rappels
 * des 7 prochains jours (suivis et ramassages) et périodes de la carte
 * « Ventes eBay ». Jours « YYYY-MM-DD » à l'heure de Toronto ; l'instant
 * courant `now` est toujours fourni par l'appelant (aucun Date.now() ici).
 */

import { FOLLOWUP_DELAY_DAYS, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/crm/types";
import { comparerRamassages, heureCourte, nomRamassage, plageHoraire, type Ramassage } from "@/lib/ramassages/ramassages";
import {
  addDays,
  dailyEbayRevenue,
  inTorontoRange,
  monthlyEbayRevenue,
  sumEbayOrders,
  torontoDay,
  type EbayCountable,
  type EbayOrderRow,
  type EbayRevenuePoint,
} from "@/lib/ebay/totaux";
import { bornesPeriode, debutAnneeFiscale, formatJour, legendeDates, libellePeriode } from "@/lib/admin/periodes";

/** Clé d'une tâche ; l'ordre d'affichage suit l'ordre de ce type. */
export type CleTache = "ramassages" | "ebay" | "soumissions" | "suivis" | "negociation" | "prix";

/** Une ligne de « À faire aujourd’hui ». */
export type Tache = {
  cle: CleTache;
  /** « Expédier 1 commande eBay » */
  titre: string;
  /** Exemples concrets : « Jean Tremblay, Marie Roy et 4 autres » ; null = aucun */
  detail: string | null;
  /** À droite : « Vendue hier », « En retard de 2 j » ; null = rien */
  meta: string | null;
  /** Meta en couleur d'alerte */
  urgent: boolean;
  href: string;
  /** Lien vers un autre site (nouvel onglet) */
  externe: boolean;
};

/** Un rappel des 7 prochains jours (« Prochains jours »). */
export type Prochain = {
  /** Suivi du CRM ou ramassage (Google Agenda) */
  type: "suivi" | "ramassage";
  /** Clé React stable */
  cle: string;
  /** Jour « YYYY-MM-DD » (Toronto) */
  jour: string;
  /** « Plus tard aujourd’hui », « Demain », « Jeudi 5 nov. » */
  quand: string;
  /** « Rappeler Bureautique Laval », « Ramassage · Info Plus » */
  titre: string;
  /** « Intéressé », « Contacté », « Rappel noté », « 9 h – 10 h » */
  detail: string;
  href: string;
};

/** Ramassage lu dans Google Agenda pour l'accueil. */
export type RamassageAccueil = Pick<
  Ramassage,
  "id" | "titre" | "client" | "journee" | "jour" | "jourFin" | "heureDebut" | "heureFin" | "debut" | "fin"
>;

/** Compagnie lue pour les suivis (mêmes règles que /admin/crm/suivis). */
export type SuiviCandidat = {
  id: string;
  name: string;
  lead_status: LeadStatus;
  lead_status_changed_at: string;
  next_followup_on: string | null;
};

/** Suivi dû aujourd'hui ou en retard (`retard` en jours, 0 = aujourd'hui). */
export type SuiviDu = Pick<SuiviCandidat, "id" | "name" | "lead_status"> & { retard: number };

/** Suivi des 7 prochains jours : `note` = date écrite dans une note (next_followup_on). */
export type SuiviAVenir = Pick<SuiviCandidat, "id" | "name" | "lead_status"> & { jour: string; note: boolean };

/** Onglet de la carte « Ventes eBay ». */
export type CleOngletEbay = "aujourdhui" | "semaine" | "mois" | "annee";

/** Une barre du petit graphique : un jour, ou un mois pour l'année fiscale. */
export type BarreEbay = {
  /** « YYYY-MM-DD » (le 1er du mois pour l'année) */
  cle: string;
  /** Sous la barre : « lun. », « 15 », « A » ; "" = pas d'étiquette */
  etiquette: string;
  /** Infobulle : « Lundi 2 nov. », « Avril 2026 » */
  titre: string;
  total: number;
  commandes: number;
  /** Aujourd'hui (ou le mois en cours) */
  courant: boolean;
  /** Après aujourd'hui (ou après le mois en cours) : emplacement vide */
  futur: boolean;
};

export type PeriodeEbay = {
  cle: CleOngletEbay;
  /** Libellé de l'onglet : « Aujourd’hui », « Semaine », « Mois », « Année » */
  onglet: string;
  /** Sous le chiffre : legendeDates(from, to) */
  dates: string;
  /** Pour les phrases : libellePeriode (« cette semaine ») */
  libelle: string;
  revenu: number;
  commandes: number;
  /** null = frais inconnus */
  frais: number | null;
  /** « aujourdhui » : les 7 derniers jours ; sinon les jours (ou les mois) de la période */
  barres: BarreEbay[];
  /** Page Ventes eBay sur la même période */
  href: string;
};

export type VentesEbayAccueil = {
  /** Toujours dans l'ordre aujourdhui, semaine, mois, annee */
  periodes: PeriodeEbay[];
  hier: { revenu: number; commandes: number };
};

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */

const JOUR_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Pluriel simple : « s » au-delà de 1. */
const pluriel = (n: number) => (n > 1 ? "s" : "");

/** Première lettre en majuscule. */
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Jours « YYYY-MM-DD » sans heure : formatés en UTC pour éviter tout décalage.
const jourTitreFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" });
const jourSemaineCourtFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", weekday: "short" });
const moisCourtFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", month: "short" });
const moisLongFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", month: "long", year: "numeric" });

/** Date UTC (minuit) d'un jour « YYYY-MM-DD ». */
function dateUtc(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** « Jeudi 5 nov. », « Mardi 1er déc. » */
function titreJour(day: string): string {
  return majuscule(formatJour(day, jourTitreFmt));
}

/* ------------------------------------------------------------------ */
/* Commandes eBay à expédier                                           */
/* ------------------------------------------------------------------ */

/** Commandes eBay en attente d'expédition (Gestionnaire des ventes d'eBay). */
export const EBAY_A_EXPEDIER_URL = "https://www.ebay.ca/sh/ord/?filter=status:AWAITING_SHIPMENT";

const PAIEMENTS_EXCLUS = new Set(["FULLY_REFUNDED", "PENDING", "FAILED"]);
const EXPEDITIONS_A_FAIRE = new Set(["NOT_STARTED", "IN_PROGRESS"]);

/**
 * Commandes à expédier : ni annulées, ni remboursées en entier, ni en attente
 * de paiement, et pas encore expédiées. Nouvelle liste, plus anciennes d'abord.
 */
export function commandesAExpedier<
  T extends Pick<EbayOrderRow, "cancelled" | "payment_status" | "fulfillment_status" | "created_at">,
>(rows: T[]): T[] {
  return rows
    .filter((r) => {
      if (r.cancelled) return false;
      if (PAIEMENTS_EXCLUS.has((r.payment_status ?? "").toUpperCase())) return false;
      return r.fulfillment_status != null && EXPEDITIONS_A_FAIRE.has(r.fulfillment_status.toUpperCase());
    })
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

/** Titre d'une commande : 1er article, « × 2 » si quantité > 1, « + 1 autre » s'il y en a plusieurs. */
export function titreCommande(o: Pick<EbayOrderRow, "order_id" | "items">): string {
  const items = o.items ?? [];
  const premier = items[0];
  let titre = premier?.title?.trim() || `Commande ${o.order_id}`;
  if (premier && premier.quantity > 1) titre += ` × ${premier.quantity}`;
  const autres = items.length - 1;
  if (autres > 0) titre += ` + ${autres} autre${autres > 1 ? "s" : ""}`;
  return titre;
}

/* ------------------------------------------------------------------ */
/* Dates relatives et listes de noms                                   */
/* ------------------------------------------------------------------ */

/** Jours de calendrier de `debut` à `fin` (« YYYY-MM-DD ») ; NaN si l'un est mal formé. */
export function joursEntre(debut: string, fin: string): number {
  if (!DAY_RE.test(debut) || !DAY_RE.test(fin)) return NaN;
  return Math.round((dateUtc(fin).getTime() - dateUtc(debut).getTime()) / JOUR_MS);
}

/**
 * Moment relatif (calendrier de Toronto) : « à l’instant », « il y a 5 min »,
 * « il y a 3 h » (même jour), « hier », « il y a 4 j » ; "" si l'instant est invalide.
 */
export function ilYa(iso: string, now: Date): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const ecart = now.getTime() - t;
  if (ecart < 60_000) return "à l’instant";
  if (ecart < 3_600_000) return `il y a ${Math.floor(ecart / 60_000)} min`;
  const jour = torontoDay(new Date(t));
  const aujourdhui = torontoDay(now);
  if (jour === aujourdhui) return `il y a ${Math.max(1, Math.floor(ecart / 3_600_000))} h`;
  if (jour === addDays(aujourdhui, -1)) return "hier";
  return `il y a ${joursEntre(jour, aujourdhui)} j`;
}

/**
 * « A », « A et B », « A, B et 4 autres » : au plus deux noms, puis le reste
 * compté sur `total`. "" s'il n'y a aucun nom ou si `total` ≤ 0.
 */
export function listeNoms(noms: string[], total: number = noms.length): string {
  const affiches = noms.map((n) => n.trim()).filter((n) => n !== "").slice(0, 2);
  if (total <= 0 || affiches.length === 0) return "";
  const reste = Math.max(0, total - affiches.length);
  if (reste === 0) return affiches.join(" et ");
  return `${affiches.join(", ")} et ${reste} autre${pluriel(reste)}`;
}

/* ------------------------------------------------------------------ */
/* Suivis du CRM                                                       */
/* ------------------------------------------------------------------ */

/**
 * Suivis dus (aujourd'hui ou en retard) et à venir dans les 7 prochains jours,
 * avec les règles de /admin/crm/suivis : une date notée dans le futur l'emporte
 * sur le délai de statut (intéressé 3 j, contacté 7 j).
 */
export function classerSuivis(companies: SuiviCandidat[], now: Date): { dus: SuiviDu[]; aVenir: SuiviAVenir[] } {
  const today = torontoDay(now);
  const horizon = addDays(today, 7);
  const dus: SuiviDu[] = [];
  const aVenir: SuiviAVenir[] = [];

  for (const c of companies) {
    const base = { id: c.id, name: c.name, lead_status: c.lead_status };
    const planned = c.next_followup_on && DAY_RE.test(c.next_followup_on) ? c.next_followup_on : null;

    // Date notée dans le futur : elle l'emporte sur le délai de statut.
    if (planned && planned > today) {
      if (planned <= horizon) aVenir.push({ ...base, jour: planned, note: true });
      continue;
    }

    const noteRetard = planned ? joursEntre(planned, today) : null;

    let statutRetard: number | null = null;
    const delai = FOLLOWUP_DELAY_DAYS[c.lead_status];
    const changedMs = Date.parse(c.lead_status_changed_at);
    if (delai != null && Number.isFinite(changedMs)) {
      const ecoule = Math.floor((now.getTime() - changedMs) / JOUR_MS);
      const r = ecoule - delai;
      if (r >= 0) {
        statutRetard = r;
      } else if (!planned) {
        const jour = torontoDay(new Date(changedMs + delai * JOUR_MS));
        if (jour <= horizon) aVenir.push({ ...base, jour: jour < today ? today : jour, note: false });
      }
    }

    if (noteRetard === null && statutRetard === null) continue;
    dus.push({ ...base, retard: Math.max(noteRetard ?? 0, statutRetard ?? 0) });
  }

  const interesse = (s: LeadStatus) => (s === "interested" ? 1 : 0);
  dus.sort(
    (a, b) =>
      b.retard - a.retard || interesse(b.lead_status) - interesse(a.lead_status) || a.name.localeCompare(b.name, "fr"),
  );
  aVenir.sort((a, b) => a.jour.localeCompare(b.jour) || a.name.localeCompare(b.name, "fr"));
  return { dus, aVenir };
}

/* ------------------------------------------------------------------ */
/* « À faire aujourd’hui »                                             */
/* ------------------------------------------------------------------ */

export type EntreesTaches = {
  /** Résultat de commandesAExpedier (plus anciennes d'abord) */
  expeditions: Array<Pick<EbayOrderRow, "order_id" | "created_at" | "items">>;
  /** Soumissions à traiter, plus récentes d'abord ; erreur = lecture impossible */
  soumissions: { erreur: boolean; liste: Array<{ nom: string | null; date: string }> };
  /** classerSuivis(...).dus, déjà triés */
  suivis: SuiviDu[];
  negociation: { total: number; lots: Array<{ id: string; client_name: string }> };
  prix: { total: number; lots: Array<{ id: string; client_name: string }> };
  /**
   * Ramassages d'aujourd'hui aux 7 prochains jours (Google Agenda) ; erreur =
   * lecture impossible ; absent = agenda non relié (aucune tâche).
   */
  ramassages?: { erreur: boolean; liste: RamassageAccueil[] };
};

/** Une heure, en millisecondes. */
const HEURE_MS = 3_600_000;

/**
 * Moment du ramassage à suivre aujourd'hui : « En cours », « À 14 h » (un seul) ou
 * « Prochain à 14 h », urgent dans l'heure qui vient ; « Toute la journée » s'il
 * ne reste que ceux-là ; rien quand tous sont passés.
 */
function momentRamassages(duJour: RamassageAccueil[], now: Date): { meta: string | null; urgent: boolean } {
  const t = now.getTime();
  const precis = duJour.filter((r) => !r.journee && Number.isFinite(Date.parse(r.debut)));
  if (precis.some((r) => Date.parse(r.debut) <= t && t < Date.parse(r.fin))) return { meta: "En cours", urgent: false };
  const suivant = precis
    .filter((r) => Date.parse(r.debut) > t)
    .sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut))[0];
  if (suivant?.heureDebut) {
    return {
      meta: `${duJour.length === 1 ? "À" : "Prochain à"} ${heureCourte(suivant.heureDebut)}`,
      urgent: Date.parse(suivant.debut) - t <= HEURE_MS,
    };
  }
  if (duJour.some((r) => r.journee)) return { meta: "Toute la journée", urgent: false };
  return { meta: null, urgent: false };
}

/** Tâches du jour, dans l'ordre ramassages, ebay, soumissions, suivis, negociation, prix ; les tâches vides sont omises. */
export function tachesAccueil(entrees: EntreesTaches, now: Date): Tache[] {
  const taches: Tache[] = [];
  const today = torontoDay(now);

  // Ramassages du jour (Google Agenda), en tête : ils ont une heure fixe
  const ram = entrees.ramassages;
  if (ram?.erreur) {
    taches.push({
      cle: "ramassages",
      titre: "Ramassages illisibles pour l’instant",
      detail: "Ouvre l’onglet Calendrier pour réessayer",
      meta: null,
      urgent: false,
      href: "/admin/ramassages",
      externe: false,
    });
  } else if (ram) {
    const duJour = ram.liste.filter((r) => r.jour <= today && today <= r.jourFin).sort(comparerRamassages);
    if (duJour.length > 0) {
      const n = duJour.length;
      // « 9 h Bureautique Laval » ; l'heure seulement si le ramassage commence aujourd'hui
      const libelle = (r: RamassageAccueil) =>
        !r.journee && r.jour === today && r.heureDebut ? `${heureCourte(r.heureDebut)} ${nomRamassage(r)}` : nomRamassage(r);
      taches.push({
        cle: "ramassages",
        titre: `Faire ${n} ramassage${pluriel(n)}`,
        detail: listeNoms(duJour.map(libelle), n) || null,
        ...momentRamassages(duJour, now),
        href: "/admin/ramassages",
        externe: false,
      });
    }
  }

  // Commandes eBay à expédier
  const exp = entrees.expeditions;
  if (exp.length > 0) {
    const n = exp.length;
    const ancienne = exp[0];
    const autres = n - 1;
    let meta: string | null = null;
    let urgent = false;
    // Garde-fou : une date illisible ne donne ni âge ni alerte.
    if (Number.isFinite(Date.parse(ancienne.created_at))) {
      const d = joursEntre(torontoDay(ancienne.created_at), today);
      meta = d <= 0 ? "Vendue aujourd’hui" : d === 1 ? "Vendue hier" : `Vendue il y a ${d} j`;
      urgent = d >= 2;
    }
    taches.push({
      cle: "ebay",
      titre: `Expédier ${n} commande${pluriel(n)} eBay`,
      detail: titreCommande(ancienne) + (autres > 0 ? ` · et ${autres} autre${pluriel(autres)}` : "") || null,
      meta,
      urgent,
      href: EBAY_A_EXPEDIER_URL,
      externe: true,
    });
  }

  // Soumissions
  const soum = entrees.soumissions;
  if (soum.erreur) {
    taches.push({
      cle: "soumissions",
      titre: "Soumissions illisibles pour l’instant",
      detail: "Ouvre l’onglet Soumissions pour réessayer",
      meta: null,
      urgent: false,
      href: "/admin/soumissions",
      externe: false,
    });
  } else if (soum.liste.length > 0) {
    const n = soum.liste.length;
    const moment = ilYa(soum.liste[0].date, now);
    taches.push({
      cle: "soumissions",
      titre: `Traiter ${n} soumission${pluriel(n)}`,
      detail: listeNoms(soum.liste.map((x) => x.nom?.trim() || "Sans nom"), n) || null,
      // Garde-fou : une date illisible ne donne aucun moment.
      meta: moment === "" ? null : n === 1 ? `Reçue ${moment}` : `Dernière : ${moment}`,
      urgent: false,
      href: "#soumissions",
      externe: false,
    });
  }

  // Suivis du CRM
  const suivis = entrees.suivis;
  if (suivis.length > 0) {
    const n = suivis.length;
    const max = Math.max(...suivis.map((s) => s.retard));
    taches.push({
      cle: "suivis",
      titre: `Faire ${n} suivi${pluriel(n)}`,
      detail: listeNoms(suivis.map((s) => s.name), n) || null,
      meta: max > 0 ? `En retard de ${max} j` : "Aujourd’hui",
      urgent: max > 0,
      href: "/admin/crm/suivis",
      externe: false,
    });
  }

  // Lots en négociation
  const nego = entrees.negociation;
  if (nego.total > 0) {
    const n = nego.total;
    taches.push({
      cle: "negociation",
      titre: `Conclure ${n} lot${pluriel(n)} en négociation`,
      detail: listeNoms(nego.lots.map((l) => l.client_name), n) || null,
      meta: null,
      urgent: false,
      href: n === 1 && nego.lots[0] ? `/admin/lots/${nego.lots[0].id}` : "/admin/lots?status=negotiating",
      externe: false,
    });
  }

  // Lots achetés sans prix de vente
  const prix = entrees.prix;
  if (prix.total > 0) {
    const n = prix.total;
    taches.push({
      cle: "prix",
      titre: `Saisir ${n} prix de vente`,
      detail: listeNoms(prix.lots.map((l) => l.client_name), n) || null,
      meta: null,
      urgent: false,
      href: n === 1 && prix.lots[0] ? `/admin/lots/${prix.lots[0].id}` : "/admin/lots?status=purchased",
      externe: false,
    });
  }

  return taches;
}

/**
 * Rappels des 7 prochains jours, par jour : d'abord les ramassages de demain à
 * dans 7 jours (ceux d'aujourd'hui sont dans « À faire »), par heure, puis les
 * suivis dans l'ordre reçu (classerSuivis(...).aVenir).
 */
export function prochainsAccueil(aVenir: SuiviAVenir[], now: Date, ramassages: RamassageAccueil[] = []): Prochain[] {
  const today = torontoDay(now);
  const demain = addDays(today, 1);
  const horizon = addDays(today, 7);
  const quand = (jour: string) => (jour === today ? "Plus tard aujourd’hui" : jour === demain ? "Demain" : titreJour(jour));

  const deRamassages = ramassages
    .filter((r) => r.jour > today && r.jour <= horizon)
    .sort((a, b) => a.jour.localeCompare(b.jour) || comparerRamassages(a, b))
    .map(
      (r): Prochain => ({
        type: "ramassage",
        cle: `ramassage-${r.id}`,
        jour: r.jour,
        quand: quand(r.jour),
        titre: r.titre || nomRamassage(r),
        detail: plageHoraire(r),
        href: `/admin/ramassages?date=${r.jour}`,
      }),
    );
  const deSuivis = aVenir.map(
    (s): Prochain => ({
      type: "suivi",
      cle: `${s.id}-${s.jour}`,
      jour: s.jour,
      quand: quand(s.jour),
      titre: `Rappeler ${s.name}`,
      detail: s.note ? "Rappel noté" : LEAD_STATUS_LABELS[s.lead_status],
      href: `/admin/crm/${s.id}`,
    }),
  );
  // Tri stable : dans une même journée, les ramassages restent avant les suivis.
  return [...deRamassages, ...deSuivis].sort((a, b) => a.jour.localeCompare(b.jour));
}

/** Phrase d'en-tête selon le nombre de tâches. */
export function resumeAccueil(nbTaches: number): string {
  if (nbTaches <= 0) return "Rien d’urgent aujourd’hui";
  if (nbTaches === 1) return "1 chose à faire aujourd’hui";
  return `${nbTaches} choses à faire aujourd’hui`;
}

/* ------------------------------------------------------------------ */
/* Carte « Ventes eBay »                                               */
/* ------------------------------------------------------------------ */

/**
 * Premier jour à lire pour la carte : le plus ancien début parmi hier, les
 * 7 derniers jours (barres d'« Aujourd’hui »), la semaine, le mois et l'année
 * fiscale (la semaine peut commencer avant le 1er du mois, voire avant le 1er avril).
 */
export function debutLectureEbay(aujourdhui: string): string {
  const debuts = (["hier", "7j", "semaine", "mois", "annee"] as const)
    .map((k) => bornesPeriode(k, aujourdhui).from)
    .filter((d): d is string => d != null);
  return debuts.reduce((min, d) => (d < min ? d : min), aujourdhui);
}

const ONGLETS: Record<CleOngletEbay, string> = {
  aujourdhui: "Aujourd’hui",
  semaine: "Semaine",
  mois: "Mois",
  annee: "Année",
};

/** Barre d'un jour (semaine ou mois). */
function barreJour(p: EbayRevenuePoint, aujourdhui: string, etiquette: string): BarreEbay {
  return {
    cle: p.day,
    etiquette,
    titre: titreJour(p.day),
    total: p.total,
    commandes: p.orders,
    courant: p.day === aujourdhui,
    futur: p.day > aujourdhui,
  };
}

/**
 * Barres d'une période ; les jours ou mois à venir sont inclus (futur).
 * « aujourdhui » : les 7 derniers jours, pour voir la journée dans son contexte.
 */
function barresPeriode(
  cle: CleOngletEbay,
  rows: Array<EbayCountable & { created_at: string }>,
  aujourdhui: string,
): BarreEbay[] {
  switch (cle) {
    case "aujourdhui":
      return dailyEbayRevenue(rows, addDays(aujourdhui, -6), aujourdhui).map((p) =>
        barreJour(p, aujourdhui, jourSemaineCourtFmt.format(dateUtc(p.day))),
      );
    case "semaine": {
      const lundi = bornesPeriode("semaine", aujourdhui).from ?? aujourdhui;
      return dailyEbayRevenue(rows, lundi, addDays(lundi, 6)).map((p) =>
        barreJour(p, aujourdhui, jourSemaineCourtFmt.format(dateUtc(p.day))),
      );
    }
    case "mois": {
      const [y, m] = aujourdhui.split("-").map(Number);
      const dernier = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const mois = aujourdhui.slice(0, 7);
      return dailyEbayRevenue(rows, `${mois}-01`, `${mois}-${String(dernier).padStart(2, "0")}`).map((p) => {
        const jour = Number(p.day.slice(8, 10));
        return barreJour(p, aujourdhui, jour === 1 || jour === 15 || jour === dernier ? String(jour) : "");
      });
    }
    case "annee": {
      const debut = debutAnneeFiscale(aujourdhui);
      const moisCourant = aujourdhui.slice(0, 7);
      return monthlyEbayRevenue(rows, debut.slice(0, 7), `${Number(debut.slice(0, 4)) + 1}-03`).map((p) => {
        const date = dateUtc(p.day);
        const mois = p.day.slice(0, 7);
        return {
          cle: p.day,
          etiquette: moisCourtFmt.format(date).charAt(0).toUpperCase(),
          titre: majuscule(moisLongFmt.format(date)),
          total: p.total,
          commandes: p.orders,
          courant: mois === moisCourant,
          futur: mois > moisCourant,
        };
      });
    }
  }
}

/**
 * Chiffres de la carte « Ventes eBay » : aujourd'hui, semaine, mois et année
 * fiscale avec leurs barres, plus la veille. Même règle de comptage que
 * partout (annulées et remboursées exclues, remboursement partiel retiré).
 */
export function ventesEbayAccueil(
  rows: Array<EbayCountable & { created_at: string }>,
  aujourdhui: string,
): VentesEbayAccueil {
  const sommes = (from: string | null, to: string | null) =>
    sumEbayOrders(rows.filter((r) => inTorontoRange(r.created_at, from, to)));

  const periodes = (["aujourdhui", "semaine", "mois", "annee"] as const).map((cle): PeriodeEbay => {
    const { from, to } = bornesPeriode(cle, aujourdhui);
    const s = sommes(from, to);
    return {
      cle,
      onglet: ONGLETS[cle],
      dates: legendeDates(from, to),
      libelle: libellePeriode(cle),
      revenu: s.revenue,
      commandes: s.orders,
      frais: s.fees,
      barres: barresPeriode(cle, rows, aujourdhui),
      href: `/admin/ventes-ebay?periode=${cle}`,
    };
  });

  const veille = bornesPeriode("hier", aujourdhui);
  const h = sommes(veille.from, veille.to);
  return { periodes, hier: { revenu: h.revenue, commandes: h.orders } };
}
