/**
 * Ramassages (module pur, partagé serveur / navigateur) : conversion entre un
 * événement de Google Agenda et un ramassage du tableau de bord, et calculs des
 * vues Semaine (grille horaire) / Mois / Liste, des mois à venir et du prochain
 * ramassage. Google Agenda est la seule source de vérité : rien n'est gardé en
 * base. Jours « YYYY-MM-DD » et heures « HH:MM » à l'heure de Toronto ; le jour
 * courant (ou l'instant) est toujours fourni par l'appelant.
 */

import { addDays, torontoDay, torontoStartUtc } from "@/lib/ebay/totaux";
import { formatJour } from "@/lib/admin/periodes";

export const TZ = "America/Toronto";

/** Partie d'un événement de l'API Google Calendar (v3) que le tableau de bord lit et écrit. */
export type EvenementGoogle = {
  id?: string;
  etag?: string;
  /** « confirmed », « tentative » ou « cancelled » (supprimé) */
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  /** Présent sur chaque occurrence d'un événement répété */
  recurringEventId?: string;
  start?: MomentGoogle;
  end?: MomentGoogle;
  extendedProperties?: { private?: Record<string, string>; shared?: Record<string, string> };
};

/** Début ou fin : `date` (toute la journée, fin exclusive) ou `dateTime` ; null efface le champ dans un PATCH. */
export type MomentGoogle = { date?: string | null; dateTime?: string | null; timeZone?: string | null };

/** Un ramassage tel que le tableau de bord l'affiche. */
export type Ramassage = {
  id: string;
  /** Version lue, renvoyée dans If-Match : Google refuse (412) s'il a changé depuis */
  etag: string | null;
  /** Titre complet dans Google (« Ramassage · Bureautique Laval ») */
  titre: string;
  /** Client tiré du titre (« Bureautique Laval ») */
  client: string;
  adresse: string;
  /** Notes en texte simple, sans la ligne « Fiche Techno Lot » ajoutée par le site */
  notes: string;
  /** Événement « toute la journée » */
  journee: boolean;
  /** Premier jour (Toronto) */
  jour: string;
  /** Dernier jour inclus (Toronto) ; égal à `jour` pour un ramassage d'une journée */
  jourFin: string;
  /** « HH:MM » à Toronto ; null pour toute la journée */
  heureDebut: string | null;
  heureFin: string | null;
  /** Tels que Google les donne : instants ISO, ou jours (toute la journée, fin exclusive) */
  debut: string;
  fin: string;
  /** Fiche du CRM liée (extendedProperties.private.companyId) */
  companyId: string | null;
  /** Lot lié (extendedProperties.private.lotId) */
  lotId: string | null;
  /** Occurrence d'un événement répété : seule cette date est modifiée */
  repete: boolean;
  /** L'événement dans Google Agenda */
  lienGoogle: string | null;
};

/** Champs du formulaire, tels que le navigateur les envoie (validés par ramassageSchema). */
export type FormulaireRamassage = {
  client: string;
  adresse: string;
  date: string;
  journee: boolean;
  debut: string;
  fin: string;
  notes: string;
  companyId: string | null;
  lotId: string | null;
};

/** Valeurs validées (lib/admin/schemas.ts → ramassageSchema) : champs vides → null. */
export type ValeursRamassage = {
  client: string;
  adresse: string | null;
  date: string;
  journee: boolean;
  debut: string | null;
  fin: string | null;
  notes: string | null;
  companyId: string | null;
  lotId: string | null;
};

/** Suggestion du champ Client : compagnie du CRM (remplit l'adresse) ou lot. */
export type SuggestionRamassage = {
  type: "compagnie" | "lot";
  id: string;
  nom: string;
  adresse: string;
  /** « Client », « Prospect », « Lot négocié », « Lot acheté » */
  etiquette: string;
};

export type VueRamassages = "semaine" | "mois" | "liste";

export const VUES: { cle: VueRamassages; libelle: string }[] = [
  { cle: "semaine", libelle: "Semaine" },
  { cle: "mois", libelle: "Mois" },
  { cle: "liste", libelle: "Liste" },
];

/** Mois à venir (le mois courant compris) : barre latérale, choix du mois et vue Liste. */
export const MOIS_A_VENIR = 12;

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Première lettre en majuscule. */
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Date UTC (minuit) d'un jour « YYYY-MM-DD ». */
function dateUtc(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Vrai pour un vrai jour « YYYY-MM-DD » (pas de 31 février). */
export function jourValide(day: string): boolean {
  if (!DAY_RE.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number);
  const date = dateUtc(day);
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const partiesFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Jour et heure (Toronto) d'un instant ISO ; null s'il est illisible. */
export function momentToronto(iso: string): { jour: string; heure: string } | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const parts = partiesFmt.formatToParts(new Date(t));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const heure = get("hour") === "24" ? "00" : get("hour");
  return { jour: `${get("year")}-${get("month")}-${get("day")}`, heure: `${heure}:${get("minute")}` };
}

/* ------------------------------------------------------------------ */
/* Titre, description, liens                                           */
/* ------------------------------------------------------------------ */

export const PREFIXE_TITRE = "Ramassage · ";

// « Ramassage · X », « Ramassage - X », « ramassage: X », « Ramassage chez X », « Pick-up X »
const TITRE_RE = /^\s*(?:ramassage|pick-?up)(?!\p{L})\s*(?:[·:–—-]\s*)?(?:chez\s+)?/iu;

/** Titre écrit dans Google : « Ramassage · Bureautique Laval ». */
export function titreRamassage(client: string): string {
  return `${PREFIXE_TITRE}${client.trim()}`;
}

/** Client tiré du titre ; un titre qui ne commence pas par « Ramassage » est gardé tel quel. */
export function clientDuTitre(titre: string): string {
  const t = titre.trim();
  const m = TITRE_RE.exec(t);
  return m ? t.slice(m[0].length).trim() : t;
}

const ENTITES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * Description de Google en texte simple : Google Agenda (Web) l'enregistre en
 * HTML (<br>, <b>, liens) dès qu'on la modifie dans son éditeur.
 */
export function texteDescription(description: string | null | undefined): string {
  if (!description) return "";
  let t = description.replace(/\r\n?/g, "\n");
  if (/<[a-z/][^>]*>/i.test(t)) {
    t = t
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, "");
  }
  t = t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (brut, e: string) => {
    if (e.startsWith("#")) {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : brut;
    }
    return ENTITES[e.toLowerCase()] ?? brut;
  });
  return t
    .replace(/[ \t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Ligne ajoutée par le site à la fin des notes, retirée à la lecture. */
const PREFIXE_FICHE = "Fiche Techno Lot :";
const FICHE_RE = /^\s*Fiche Techno Lot\s*:/i;

/** Notes affichées : la description en texte simple, sans la ligne « Fiche Techno Lot : … ». */
export function notesDeDescription(description: string | null | undefined): string {
  return texteDescription(description)
    .split("\n")
    .filter((ligne) => !FICHE_RE.test(ligne))
    .join("\n")
    .trim();
}

/** Description écrite dans Google : les notes, puis le lien vers la fiche s'il y en a une. */
export function descriptionRamassage(notes: string | null, lien: string | null): string {
  const n = (notes ?? "").trim();
  if (!lien) return n;
  return n ? `${n}\n\n${PREFIXE_FICHE} ${lien}` : `${PREFIXE_FICHE} ${lien}`;
}

/** Lien vers la fiche liée (compagnie du CRM, sinon lot) ; null sans fiche ou sans adresse du site. */
export function lienFiche(
  siteUrl: string | null | undefined,
  lien: { companyId: string | null; lotId: string | null },
): string | null {
  const base = siteUrl?.trim().replace(/\/+$/, "");
  if (!base) return null;
  if (lien.companyId) return `${base}/admin/crm/${lien.companyId}`;
  if (lien.lotId) return `${base}/admin/lots/${lien.lotId}`;
  return null;
}

/** Lien de l'événement dans Google Agenda, seulement vers un domaine de Google en https. */
function lienGoogleSur(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)google\.com$/.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Identifiant lu dans une propriété privée : un UUID, sinon null (vide = aucun lien). */
function idPrive(valeur: string | undefined): string | null {
  return valeur && UUID_RE.test(valeur) ? valeur.toLowerCase() : null;
}

/* ------------------------------------------------------------------ */
/* Événement Google ↔ ramassage                                        */
/* ------------------------------------------------------------------ */

/** Ramassage d'un événement de l'agenda ; null s'il est supprimé ou sans date lisible. */
export function depuisEvenement(ev: EvenementGoogle): Ramassage | null {
  if (!ev.id || ev.status === "cancelled") return null;
  const prive = ev.extendedProperties?.private ?? {};
  const titre = ev.summary?.trim() ?? "";
  const base = {
    id: ev.id,
    etag: ev.etag ?? null,
    titre,
    client: clientDuTitre(titre),
    adresse: ev.location?.trim() ?? "",
    notes: notesDeDescription(ev.description),
    companyId: idPrive(prive.companyId),
    lotId: idPrive(prive.lotId),
    repete: Boolean(ev.recurringEventId),
    lienGoogle: lienGoogleSur(ev.htmlLink),
  };

  // Toute la journée : la fin (end.date) est exclusive.
  const jourDebut = ev.start?.date;
  if (jourDebut && jourValide(jourDebut)) {
    const finExclusive = ev.end?.date && jourValide(ev.end.date) && ev.end.date > jourDebut ? ev.end.date : addDays(jourDebut, 1);
    return {
      ...base,
      journee: true,
      jour: jourDebut,
      jourFin: addDays(finExclusive, -1),
      heureDebut: null,
      heureFin: null,
      debut: jourDebut,
      fin: finExclusive,
    };
  }

  const debutIso = ev.start?.dateTime;
  const debut = debutIso ? momentToronto(debutIso) : null;
  if (!debutIso || !debut) return null;
  const finIso = ev.end?.dateTime ?? null;
  const fin = finIso ? momentToronto(finIso) : null;
  let jourFin = debut.jour;
  if (fin && fin.jour > debut.jour) {
    // Une fin à minuit appartient encore à la veille (22 h – 0 h).
    jourFin = fin.heure === "00:00" ? addDays(fin.jour, -1) : fin.jour;
  }
  return {
    ...base,
    journee: false,
    jour: debut.jour,
    jourFin: jourFin < debut.jour ? debut.jour : jourFin,
    heureDebut: debut.heure,
    heureFin: fin?.heure ?? null,
    debut: debutIso,
    fin: fin && finIso ? finIso : debutIso,
  };
}

/** Propriétés privées (invisibles dans Google Agenda) : vide = aucun lien. */
function proprietesPrivees(v: Pick<ValeursRamassage, "companyId" | "lotId">): Record<string, string> {
  return { technolot: "ramassage", companyId: v.companyId ?? "", lotId: v.lotId ?? "" };
}

/**
 * Début et fin : heure précise au fuseau de Toronto, ou toute la journée (fin
 * exclusive). `effacer` : l'autre forme vaut null (PATCH, qui fusionne les champs).
 */
export function datesEvenement(
  v: Pick<ValeursRamassage, "date" | "journee" | "debut" | "fin">,
  effacer = false,
): { start: MomentGoogle; end: MomentGoogle } {
  if (v.journee) {
    const vide = effacer ? { dateTime: null, timeZone: null } : {};
    return { start: { date: v.date, ...vide }, end: { date: addDays(v.date, 1), ...vide } };
  }
  const vide = effacer ? { date: null } : {};
  return {
    start: { dateTime: `${v.date}T${v.debut ?? "00:00"}:00`, timeZone: TZ, ...vide },
    end: { dateTime: `${v.date}T${v.fin ?? v.debut ?? "00:00"}:00`, timeZone: TZ, ...vide },
  };
}

/** Corps envoyé à Google pour créer le ramassage (POST). */
export function evenementPourCreation(v: ValeursRamassage, lien: string | null): EvenementGoogle {
  return {
    summary: titreRamassage(v.client),
    location: v.adresse ?? "",
    description: descriptionRamassage(v.notes, lien),
    ...datesEvenement(v),
    extendedProperties: { private: proprietesPrivees(v) },
  };
}

/**
 * Corps du PATCH : tous les champs du formulaire ; les dates seulement si
 * `avecDates` (un événement de plusieurs jours garde les siennes).
 */
export function evenementPourModification(v: ValeursRamassage, lien: string | null, avecDates: boolean): EvenementGoogle {
  const corps: EvenementGoogle = {
    summary: titreRamassage(v.client),
    location: v.adresse ?? "",
    description: descriptionRamassage(v.notes, lien),
    extendedProperties: { private: proprietesPrivees(v) },
  };
  return avecDates ? { ...corps, ...datesEvenement(v, true) } : corps;
}

/* ------------------------------------------------------------------ */
/* Formulaire                                                          */
/* ------------------------------------------------------------------ */

/** « 09:30 » + 1 h → « 10:30 » ; jamais après 23 h 59 (pas de ramassage de nuit). */
export function uneHeurePlusTard(heure: string): string {
  const [h, m] = heure.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "10:00";
  if (h >= 23) return "23:59";
  return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Formulaire d'un nouveau ramassage le jour choisi, pour une heure (« HH:MM ») ou 9 h ; durée d'une heure. */
export function formulaireNouveau(jour: string, heure?: string): FormulaireRamassage {
  const debut = heure && /^([01]\d|2[0-3]):[0-5]\d$/.test(heure) ? heure : "09:00";
  return {
    client: "",
    adresse: "",
    date: jour,
    journee: false,
    debut,
    fin: uneHeurePlusTard(debut),
    notes: "",
    companyId: null,
    lotId: null,
  };
}

/** Formulaire d'un ramassage existant ; une heure manquante reprend 9 h – 10 h. */
export function formulaireDe(r: Ramassage): FormulaireRamassage {
  const debut = r.heureDebut ?? "09:00";
  const fin = r.heureFin && r.heureFin > debut && r.jourFin === r.jour ? r.heureFin : uneHeurePlusTard(debut);
  return {
    client: r.client,
    adresse: r.adresse,
    date: r.jour,
    journee: r.journee,
    debut,
    fin,
    notes: r.notes,
    companyId: r.companyId,
    lotId: r.lotId,
  };
}

/** Sur plusieurs jours : dates modifiables seulement dans Google Agenda. */
export function surPlusieursJours(r: Pick<Ramassage, "jour" | "jourFin">): boolean {
  return r.jourFin > r.jour;
}

/* ------------------------------------------------------------------ */
/* Affichage                                                           */
/* ------------------------------------------------------------------ */

/** Nom affiché : le client, sinon le titre de Google, sinon « Sans titre ». */
export function nomRamassage(r: Pick<Ramassage, "client" | "titre">): string {
  return r.client || r.titre || "Sans titre";
}

/** « 9 h », « 9 h 30 », « 14 h 05 » */
export function heureCourte(heure: string): string {
  const [h, m] = heure.split(":");
  return `${Number(h)} h${m && m !== "00" ? ` ${m}` : ""}`;
}

/** « 9 h – 10 h 30 », « Toute la journée », « Du 5 au 7 nov. » */
export function plageHoraire(r: Pick<Ramassage, "journee" | "heureDebut" | "heureFin" | "jour" | "jourFin">): string {
  if (r.journee) return surPlusieursJours(r) ? `Du ${formatJour(r.jour)} au ${formatJour(r.jourFin)}` : "Toute la journée";
  if (!r.heureDebut) return "";
  const debut = heureCourte(r.heureDebut);
  if (surPlusieursJours(r)) {
    return `${formatJour(r.jour)}, ${debut} – ${formatJour(r.jourFin)}, ${heureCourte(r.heureFin ?? r.heureDebut)}`;
  }
  return r.heureFin && r.heureFin !== r.heureDebut ? `${debut} – ${heureCourte(r.heureFin)}` : debut;
}

const PROVINCE_RE = /^(qc|québec|quebec|on|ontario|canada|can)$/i;

/** Morceau d'adresse sans code postal, ni « (Québec) », ni province à la fin. */
function sansProvince(morceau: string): string {
  return morceau
    .replace(/\b[a-z]\d[a-z]\s?\d[a-z]\d\b/gi, "")
    .trim()
    .replace(/\((?:qc|québec|quebec)\)/gi, "")
    .trim()
    .replace(/\s+(?:qc|québec|quebec)$/i, "")
    .trim();
}

/**
 * Ville d'une adresse pour les cases du calendrier : le dernier morceau avant la
 * province, le code postal ou le pays (« 12 rue X, Laval, QC H7N 1A1 » → « Laval ») ;
 * l'adresse entière si elle n'a qu'un morceau.
 */
export function villeDeAdresse(adresse: string): string {
  const utiles = adresse
    .split(",")
    .map(sansProvince)
    .filter((m) => m !== "" && !PROVINCE_RE.test(m));
  return utiles.length > 0 ? utiles[utiles.length - 1] : adresse.trim();
}

type Triable = Pick<Ramassage, "journee" | "heureDebut" | "jour" | "client">;

/** Ordre dans une journée : toute la journée d'abord, puis par heure de début, puis par client. */
export function comparerRamassages(a: Triable, b: Triable): number {
  if (a.journee !== b.journee) return a.journee ? -1 : 1;
  return (
    (a.heureDebut ?? "").localeCompare(b.heureDebut ?? "") ||
    a.jour.localeCompare(b.jour) ||
    a.client.localeCompare(b.client, "fr")
  );
}

/** Ramassages d'un jour (un ramassage de plusieurs jours apparaît chacun de ses jours). */
export function ramassagesDuJour(liste: Ramassage[], jour: string): Ramassage[] {
  return liste.filter((r) => r.jour <= jour && jour <= r.jourFin).sort(comparerRamassages);
}

/* ------------------------------------------------------------------ */
/* Vues Semaine / Mois / Liste                                         */
/* ------------------------------------------------------------------ */

/** Vue demandée (paramètre `vue`) ; Semaine par défaut. */
export function parseVue(valeur: string | null | undefined): VueRamassages {
  return valeur === "mois" || valeur === "liste" ? valeur : "semaine";
}

/** Jour affiché (paramètre `date`) ; aujourd'hui s'il est absent, mal formé ou à plus de 5 ans. */
export function parseAncre(valeur: string | null | undefined, aujourdhui: string): string {
  if (!valeur || !jourValide(valeur)) return aujourdhui;
  if (Math.abs(Number(valeur.slice(0, 4)) - Number(aujourdhui.slice(0, 4))) > 5) return aujourdhui;
  return valeur;
}

/** Lundi de la semaine d'un jour. */
export function lundiDe(jour: string): string {
  const jourSemaine = dateUtc(jour).getUTCDay(); // 0 = dimanche
  return addDays(jour, jourSemaine === 0 ? -6 : 1 - jourSemaine);
}

/** Les 7 jours (lundi → dimanche) de la semaine d'un jour. */
export function joursSemaine(jour: string): string[] {
  const lundi = lundiDe(jour);
  return Array.from({ length: 7 }, (_, i) => addDays(lundi, i));
}

/** Semaines (lundi → dimanche) qui couvrent le mois d'un jour : 4 à 6 rangées de 7 jours. */
export function grilleMois(jour: string): string[][] {
  const [y, m] = jour.split("-").map(Number);
  const premier = `${jour.slice(0, 7)}-01`;
  const dernier = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const semaines: string[][] = [];
  for (let lundi = lundiDe(premier); lundi <= dernier; lundi = addDays(lundi, 7)) {
    semaines.push(Array.from({ length: 7 }, (_, i) => addDays(lundi, i)));
  }
  return semaines;
}

/** Jours à lire dans Google pour une vue (bornes incluses). */
export function bornesVue(vue: VueRamassages, ancre: string, aujourdhui: string): { debut: string; fin: string } {
  switch (vue) {
    case "semaine": {
      const lundi = lundiDe(ancre);
      return { debut: lundi, fin: addDays(lundi, 6) };
    }
    case "mois": {
      const grille = grilleMois(ancre);
      return { debut: grille[0][0], fin: grille[grille.length - 1][6] };
    }
    case "liste":
      return horizonAVenir(aujourdhui);
  }
}

/**
 * Jours lus dans Google pour l'affichage : la vue et la grille du
 * mini-calendrier (le mois du jour affiché). La vue Liste lit les mois à venir
 * à part (horizonAVenir), d'où seulement la grille ici.
 */
export function bornesLecture(vue: VueRamassages, ancre: string, aujourdhui: string): { debut: string; fin: string } {
  const grille = grilleMois(ancre);
  const mini = { debut: grille[0][0], fin: grille[grille.length - 1][6] };
  if (vue === "liste") return mini;
  const v = bornesVue(vue, ancre, aujourdhui);
  return { debut: v.debut < mini.debut ? v.debut : mini.debut, fin: v.fin > mini.fin ? v.fin : mini.fin };
}

/** Jour affiché par la flèche précédente (−1) ou suivante (+1) : la semaine voisine, ou le 1er du mois voisin. */
export function ancreVoisine(vue: VueRamassages, ancre: string, sens: -1 | 1): string {
  if (vue === "mois") {
    const [y, m] = ancre.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + sens, 1)).toISOString().slice(0, 10);
  }
  return addDays(lundiDe(ancre), 7 * sens);
}

// Jours « YYYY-MM-DD » sans heure : formatés en UTC pour éviter tout décalage.
const jourMoisFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", day: "numeric", month: "short" });
const jourMoisAnneeFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const moisAnneeFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", month: "long", year: "numeric" });
const jourLongFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" });
const jourSemaineCourtFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", weekday: "short" });

/** « lun. », « mar. »… */
export function jourSemaineCourt(jour: string): string {
  return jourSemaineCourtFmt.format(dateUtc(jour));
}

/** Titre de la période : « 2 – 8 nov. 2026 », « 30 nov. – 6 déc. 2026 », « Novembre 2026 », « À venir ». */
export function titreVue(vue: VueRamassages, ancre: string): string {
  if (vue === "liste") return "À venir";
  if (vue === "mois") return majuscule(moisAnneeFmt.format(dateUtc(ancre)));
  const lundi = lundiDe(ancre);
  const dimanche = addDays(lundi, 6);
  if (lundi.slice(0, 4) !== dimanche.slice(0, 4)) {
    return `${formatJour(lundi, jourMoisAnneeFmt)} – ${formatJour(dimanche, jourMoisAnneeFmt)}`;
  }
  if (lundi.slice(0, 7) !== dimanche.slice(0, 7)) {
    return `${formatJour(lundi, jourMoisFmt)} – ${formatJour(dimanche, jourMoisAnneeFmt)}`;
  }
  return `${Number(lundi.slice(8, 10)) === 1 ? "1er" : Number(lundi.slice(8, 10))} – ${formatJour(dimanche, jourMoisAnneeFmt)}`;
}

/** « Aujourd’hui », « Demain », sinon « Jeudi 5 nov. » */
export function nomJour(jour: string, aujourdhui: string): string {
  if (jour === aujourdhui) return "Aujourd’hui";
  if (jour === addDays(aujourdhui, 1)) return "Demain";
  return majuscule(formatJour(jour, jourLongFmt));
}

/** « Jeudi 5 nov. » (sans « Aujourd’hui ») */
export function jourComplet(jour: string): string {
  return majuscule(formatJour(jour, jourLongFmt));
}

/** Lien vers une vue : `/admin/ramassages?vue=mois&date=2026-11-01` (Semaine et aujourd'hui omis). */
export function lienVue(vue: VueRamassages, ancre: string | null): string {
  const params = new URLSearchParams();
  if (vue !== "semaine") params.set("vue", vue);
  if (ancre) params.set("date", ancre);
  const q = params.toString();
  return q ? `/admin/ramassages?${q}` : "/admin/ramassages";
}

/* ------------------------------------------------------------------ */
/* Mois à venir                                                        */
/* ------------------------------------------------------------------ */

const moisCourtFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: "UTC", month: "short" });

/** « Novembre 2026 » (jour « YYYY-MM-DD » ou mois « YYYY-MM ») */
export function libelleMois(jourOuMois: string): string {
  return majuscule(moisAnneeFmt.format(dateUtc(jourOuMois.length === 7 ? `${jourOuMois}-01` : jourOuMois)));
}

/** « nov. », « déc. », « juin » */
export function moisCourt(jour: string): string {
  return moisCourtFmt.format(dateUtc(jour));
}

/** Jours des mois à venir : d'aujourd'hui à la fin du 12e mois (le mois courant compte). */
export function horizonAVenir(aujourdhui: string): { debut: string; fin: string } {
  const [y, m] = aujourdhui.split("-").map(Number);
  return { debut: aujourdhui, fin: new Date(Date.UTC(y, m - 1 + MOIS_A_VENIR, 0)).toISOString().slice(0, 10) };
}

export type MoisAVenir = {
  /** « 2026-11 » */
  cle: string;
  /** « 2026-11-01 » */
  premier: string;
  /** « Novembre 2026 » */
  libelle: string;
};

/** Le mois courant et les 11 suivants. */
export function moisAVenir(aujourdhui: string): MoisAVenir[] {
  const [y, m] = aujourdhui.split("-").map(Number);
  return Array.from({ length: MOIS_A_VENIR }, (_, i) => {
    const premier = new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 10);
    return { cle: premier.slice(0, 7), premier, libelle: libelleMois(premier) };
  });
}

/** Nombre de ramassages par mois de début (« YYYY-MM »). */
export function compterParMois(liste: Pick<Ramassage, "jour">[]): Map<string, number> {
  const comptes = new Map<string, number>();
  for (const r of liste) {
    const cle = r.jour.slice(0, 7);
    comptes.set(cle, (comptes.get(cle) ?? 0) + 1);
  }
  return comptes;
}

/* ------------------------------------------------------------------ */
/* Prochain ramassage                                                  */
/* ------------------------------------------------------------------ */

/**
 * Ramassage à suivre : le premier qui n'est pas fini (à heure précise : avant sa
 * fin ; toute la journée : jusqu'à la fin de son dernier jour), par début.
 * `enCours` : commencé et pas fini. null s'il n'y en a aucun.
 */
export function prochainRamassage(liste: Ramassage[], maintenant: Date): { ramassage: Ramassage; enCours: boolean } | null {
  const t = maintenant.getTime();
  const aujourdhui = torontoDay(maintenant);
  let choisi: { ramassage: Ramassage; enCours: boolean; debut: number } | null = null;
  for (const r of liste) {
    let debut: number;
    let enCours: boolean;
    if (r.journee) {
      if (r.jourFin < aujourdhui) continue;
      debut = Date.parse(torontoStartUtc(r.jour));
      enCours = r.jour <= aujourdhui;
    } else {
      const fin = Date.parse(r.fin);
      debut = Date.parse(r.debut);
      if (!Number.isFinite(debut) || !(fin > t)) continue;
      enCours = debut <= t;
    }
    if (!choisi || debut < choisi.debut) choisi = { ramassage: r, enCours, debut };
  }
  return choisi ? { ramassage: choisi.ramassage, enCours: choisi.enCours } : null;
}

/* ------------------------------------------------------------------ */
/* Grille horaire (vue Semaine)                                        */
/* ------------------------------------------------------------------ */

/** « 09:30 » → 570 */
export function minutesDe(heure: string): number {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + m;
}

/** 570 → « 09:30 » (borné à la journée, par demi-heures pleines) */
export function heureDeMinutes(minutes: number): string {
  const m = Math.min(23 * 60 + 30, Math.max(0, Math.round(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Placé dans la grille horaire : à heure précise, sur une seule journée ; sinon dans la rangée « Journée ». */
export function dansGrille(r: Pick<Ramassage, "journee" | "heureDebut" | "jour" | "jourFin">): boolean {
  return !r.journee && r.heureDebut !== null && r.jour === r.jourFin;
}

/** Fin en minutes : au moins 30 min après le début ; une fin à minuit vaut 24 h. */
function minutesFin(r: Pick<Ramassage, "heureDebut" | "heureFin">): number {
  const debut = minutesDe(r.heureDebut ?? "00:00");
  if (!r.heureFin) return Math.min(24 * 60, debut + 60);
  let fin = minutesDe(r.heureFin);
  if (fin < debut) fin = 24 * 60;
  return Math.min(24 * 60, Math.max(fin, debut + 30));
}

/** Heures montrées : 7 h à 19 h, élargies pour contenir chaque ramassage de la semaine. */
export function plageHeures(liste: Ramassage[]): { debut: number; fin: number } {
  let debut = 7;
  let fin = 19;
  for (const r of liste) {
    if (!dansGrille(r)) continue;
    debut = Math.min(debut, Math.floor(minutesDe(r.heureDebut as string) / 60));
    fin = Math.max(fin, Math.ceil(minutesFin(r) / 60));
  }
  return { debut: Math.max(0, debut), fin: Math.min(24, fin) };
}

/** Un ramassage placé dans sa journée : minutes de début et de fin, colonne parmi ceux qui se chevauchent. */
export type Bloc = { ramassage: Ramassage; debut: number; fin: number; colonne: number; colonnes: number };

/**
 * Place les ramassages d'une journée : ceux qui se chevauchent se partagent la
 * largeur (première colonne libre), les autres prennent toute la largeur.
 */
export function dispositionJour(liste: Ramassage[]): Bloc[] {
  const items = liste
    .filter(dansGrille)
    .map((r) => ({ ramassage: r, debut: minutesDe(r.heureDebut as string), fin: minutesFin(r) }))
    .sort((a, b) => a.debut - b.debut || b.fin - a.fin);
  const blocs: Bloc[] = [];
  let groupe: Bloc[] = [];
  let finsColonnes: number[] = [];
  let finGroupe = -1;
  const clore = () => {
    for (const b of groupe) b.colonnes = finsColonnes.length;
  };
  for (const item of items) {
    if (groupe.length > 0 && item.debut >= finGroupe) {
      clore();
      groupe = [];
      finsColonnes = [];
    }
    let colonne = finsColonnes.findIndex((f) => f <= item.debut);
    if (colonne === -1) {
      colonne = finsColonnes.length;
      finsColonnes.push(item.fin);
    } else {
      finsColonnes[colonne] = item.fin;
    }
    const bloc: Bloc = { ...item, colonne, colonnes: 1 };
    groupe.push(bloc);
    blocs.push(bloc);
    finGroupe = Math.max(finGroupe, item.fin);
  }
  clore();
  return blocs;
}

/* ------------------------------------------------------------------ */
/* Liens                                                               */
/* ------------------------------------------------------------------ */

/** Itinéraire Google Maps jusqu'à l'adresse du ramassage. */
export function lienItineraire(adresse: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse.trim())}`;
}
