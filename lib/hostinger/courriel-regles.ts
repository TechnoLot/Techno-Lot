/**
 * Règles pures de « Voir le courriel » (sans accès réseau) : corps de
 * recherche de la Mail API, choix du message, formatage, filtres.
 */
import type { PieceJointe } from "@/lib/admin/courriel-types";
import { ENTETE_SOUMISSION } from "@/lib/hostinger/config";

/** Écart maximal entre la demande et le courriel du formulaire (recherche approximative). */
export const ECART_MAX_MS = 15 * 60_000;
/** Dossiers hors INBOX fouillés au plus. */
export const DOSSIERS_MAX = 10;

/** Corps de POST .../messages/search (V1.FolderMessages.SearchRequest). */
export type CorpsRecherche = {
  since?: string;
  before?: string;
  subject?: string;
  text?: string;
  header?: string;
};

export type AdresseApi = { name?: string | null; address?: string | null };

export type PieceApi = {
  id: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  inline?: boolean | null;
  filename?: string | null;
};

export type DossierApi = {
  path: string;
  name?: string | null;
  specialUse?: string | null;
  messageCount?: number | null;
};

/** Messages d'erreur de la Mail API, selon le code HTTP (null : réseau ou délai dépassé). */
export function messageErreurHostinger(status: number | null): string {
  if (status === null) return "Hostinger est injoignable pour l'instant.";
  if (status === 401 || status === 403) {
    return "Clé Mail API refusée : vérifie HOSTINGER_MAIL_API_TOKEN (droit de lecture IMAP sur info@technolot.ca).";
  }
  if (status === 404) return "Boîte ou message introuvable chez Hostinger.";
  if (status === 429) return "Hostinger limite les requêtes : réessaie dans un instant.";
  return `Erreur Hostinger (${status}).`;
}

/** Recherche exacte : en-tête ajouté par le formulaire. */
export function corpsRechercheEntete(id: string): CorpsRecherche {
  return { header: `${ENTETE_SOUMISSION}:${id}` };
}

/** Jour (YYYY-MM-DD) d'un instant, à l'heure de Toronto ; null si la date est illisible. */
export function jourToronto(iso: string): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(t));
  const v = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${v("year")}-${v("month")}-${v("day")}`;
}

/** Ajoute `n` jours à une date YYYY-MM-DD. */
export function decalerJour(jour: string, n: number): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Recherche approximative (demandes sans en-tête) : du jour de la demande
 * moins 1 au jour plus 1 inclus (`before` est exclusif), et le courriel du
 * client n'importe où dans le message, sinon le sujet envoyé par le
 * formulaire. Null si rien ne permet de chercher.
 */
export function corpsRechercheApproximative(s: {
  date: string;
  courriel: string | null;
  nom: string | null;
}): CorpsRecherche | null {
  const jour = jourToronto(s.date);
  if (!jour) return null;
  const fenetre = { since: decalerJour(jour, -1), before: decalerJour(jour, 2) };
  const courriel = s.courriel?.trim();
  if (courriel) return { ...fenetre, text: courriel.slice(0, 1024) };
  const nom = s.nom?.trim();
  if (nom) return { ...fenetre, subject: `Nouvelle soumission de ${nom}`.slice(0, 1024) };
  return null;
}

/** Le message dont la date est la plus proche de `dateIso`, à `ecartMax` au plus ; null sinon. */
export function messageLePlusProche<T extends { date?: string | null }>(
  messages: readonly T[],
  dateIso: string,
  ecartMax: number = ECART_MAX_MS,
): T | null {
  const cible = Date.parse(dateIso);
  if (Number.isNaN(cible)) return null;
  let meilleur: T | null = null;
  let meilleurEcart = Infinity;
  for (const m of messages) {
    const t = m.date ? Date.parse(m.date) : NaN;
    if (Number.isNaN(t)) continue;
    const ecart = Math.abs(t - cible);
    if (ecart <= ecartMax && ecart < meilleurEcart) {
      meilleur = m;
      meilleurEcart = ecart;
    }
  }
  return meilleur;
}

/** « Nom <adresse> », ou l'adresse seule. */
export function formaterAdresse(a: AdresseApi | null | undefined): string {
  const adresse = a?.address?.trim() ?? "";
  const nom = a?.name?.trim().replace(/[\r\n]+/g, " ") ?? "";
  if (!adresse) return nom;
  if (!nom || nom.toLowerCase() === adresse.toLowerCase()) return adresse;
  return `${nom} <${adresse}>`;
}

export function formaterAdresses(liste: readonly AdresseApi[] | null | undefined): string {
  return (liste ?? []).map(formaterAdresse).filter(Boolean).join(", ");
}

/** Retire les éléments <script> (et toute balise <script> orpheline) du HTML. */
export function retirerScripts(html: string): string {
  let avant: string;
  let apres = html;
  do {
    avant = apres;
    apres = avant
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<\/?script\b[^>]*>?/gi, "");
  } while (apres !== avant);
  return apres;
}

/** Pièces affichées : les vraies pièces jointes, et les images intégrées qui portent un nom de fichier. */
export function piecesVisibles(pieces: readonly PieceApi[] | null | undefined): PieceJointe[] {
  return (pieces ?? [])
    .filter((p) => p.id && (!p.inline || Boolean(p.filename?.trim())))
    .map((p) => ({
      id: p.id,
      nom: p.filename?.trim() || "piece-jointe",
      type: typeMimeSur(p.contentType),
      taille: typeof p.sizeBytes === "number" && p.sizeBytes >= 0 ? p.sizeBytes : 0,
    }));
}

/** Type MIME réduit à « type/sous-type » ; application/octet-stream s'il est illisible. */
export function typeMimeSur(type: string | null | undefined): string {
  const t = (type ?? "").split(";")[0].trim().toLowerCase();
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(t) ? t : "application/octet-stream";
}

const USAGES_EXCLUS = new Set(["\\sent", "\\drafts", "\\trash", "\\junk"]);
const NOMS_EXCLUS = new Set([
  "sent",
  "sent items",
  "sent messages",
  "sent mail",
  "envoyés",
  "envoyes",
  "éléments envoyés",
  "drafts",
  "brouillons",
  "trash",
  "deleted items",
  "deleted messages",
  "corbeille",
  "junk",
  "junk e-mail",
  "spam",
  "pourriels",
  "indésirables",
  "courrier indésirable",
]);

/**
 * Autres dossiers où chercher : tout sauf INBOX, Envoyés, Brouillons,
 * Corbeille et Pourriels (attribut SPECIAL-USE, sinon nom du dossier),
 * et les dossiers vides ; DOSSIERS_MAX au plus.
 */
export function dossiersAFouiller(dossiers: readonly DossierApi[] | null | undefined): string[] {
  return (dossiers ?? [])
    .filter((d) => {
      if (!d.path || d.path.toUpperCase() === "INBOX") return false;
      if (d.specialUse && USAGES_EXCLUS.has(d.specialUse.toLowerCase())) return false;
      const nom = (d.name || d.path).trim().toLowerCase();
      if (NOMS_EXCLUS.has(nom)) return false;
      return d.messageCount !== 0;
    })
    .slice(0, DOSSIERS_MAX)
    .map((d) => d.path);
}

/**
 * En-têtes d'une pièce jointe servie par l'admin : affichée dans le
 * navigateur pour les images et les PDF (sauf SVG, qui peut contenir du
 * script), téléchargée sinon.
 */
export function entetesPiece(nom: string, type: string): Record<string, string> {
  const mime = typeMimeSur(type);
  const affichable = (mime.startsWith("image/") && mime !== "image/svg+xml") || mime === "application/pdf";
  const propre = nom.replace(/[\r\n]+/g, " ").trim() || "piece-jointe";
  const ascii = propre.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encode = encodeURIComponent(propre).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return {
    "Content-Type": mime,
    "Content-Disposition": `${affichable ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encode}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=300",
  };
}
