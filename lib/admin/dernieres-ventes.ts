/**
 * « Dernières ventes » de l'accueil (module pur) : fusion des commandes eBay,
 * des lots vendus et des ventes manuelles, plus récentes d'abord, et libellés
 * des rangées. Jours « YYYY-MM-DD » et heures à l'heure de Toronto.
 */

import { addDays, torontoDay, type EbayOrderRow } from "@/lib/ebay/totaux";

const TZ = "America/Toronto";

/** Lot vendu (colonnes lues par l'accueil). */
export type LotVendu = {
  id: string;
  client_name: string;
  description: string | null;
  purchase_price: number | string;
  sale_price: number | string | null;
  sold_at: string | null; // date "YYYY-MM-DD"
};

/** Vente manuelle (table `sales`). */
export type VenteManuelle = {
  id: string;
  buyer_name: string;
  description: string | null;
  sale_price: number | string;
  sold_at: string; // date "YYYY-MM-DD"
  source: string;
};

export type VenteRecente =
  | { kind: "ebay"; key: string; at: number; order: EbayOrderRow }
  | { kind: "lot"; key: string; at: number; lot: LotVendu }
  | { kind: "vente"; key: string; at: number; vente: VenteManuelle };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Décalage de Toronto par rapport à UTC (minutes, négatif) à un instant donné. */
function decalageToronto(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return Math.round((asUtc - utcMs) / 60_000);
}

/** Instant (ms) de midi, heure de Toronto, d'un jour « YYYY-MM-DD » ; NaN si absent ou mal formé. */
export function midiToronto(day: string | null | undefined): number {
  const jour = day?.slice(0, 10);
  if (!jour || !DAY_RE.test(jour)) return NaN;
  const [y, m, d] = jour.split("-").map(Number);
  // 17 h UTC ≈ midi à Toronto, bien après le changement d'heure de 2 h.
  const offset = decalageToronto(Date.UTC(y, m - 1, d, 17));
  return Date.UTC(y, m - 1, d, 12) - offset * 60_000;
}

/** Une date inconnue passe en dernier. */
const rang = (at: number) => (Number.isFinite(at) ? at : -Infinity);

/**
 * Fusionne les trois sources et garde les `limite` plus récentes. Commande
 * eBay : son instant `created_at` ; lot ou vente : sa date `sold_at`, placée
 * à midi heure de Toronto. À égalité, l'ordre d'entrée est conservé.
 */
export function fusionnerVentes(
  commandes: EbayOrderRow[],
  lots: LotVendu[],
  ventes: VenteManuelle[],
  limite = 8,
): VenteRecente[] {
  const tout: VenteRecente[] = [
    ...commandes.map((order) => ({
      kind: "ebay" as const,
      key: `ebay-${order.order_id}`,
      at: Date.parse(order.created_at),
      order,
    })),
    ...lots.map((lot) => ({ kind: "lot" as const, key: `lot-${lot.id}`, at: midiToronto(lot.sold_at), lot })),
    ...ventes.map((vente) => ({
      kind: "vente" as const,
      key: `vente-${vente.id}`,
      at: midiToronto(vente.sold_at),
      vente,
    })),
  ];
  tout.sort((a, b) => {
    const ra = rang(a.at);
    const rb = rang(b.at);
    return ra === rb ? 0 : rb > ra ? 1 : -1;
  });
  return tout.slice(0, Math.max(0, limite));
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

export function titreLot(l: Pick<LotVendu, "description" | "client_name">): string {
  return l.description?.trim() || `Lot de ${l.client_name}`;
}

export function titreVente(v: Pick<VenteManuelle, "description" | "buyer_name">): string {
  return v.description?.trim() || `Vente à ${v.buyer_name}`;
}

const heureFmt = new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const jourMoisFmt = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", timeZone: "UTC" });
const jourMoisAnFmt = new Intl.DateTimeFormat("fr-CA", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** « aujourd’hui », « hier », sinon « 27 oct. » (avec l'année si ce n'est pas l'année en cours). */
export function libelleJour(day: string, aujourdhui: string): string {
  if (!DAY_RE.test(day)) return "";
  if (day === aujourdhui) return "aujourd’hui";
  if (day === addDays(aujourdhui, -1)) return "hier";
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return (day.slice(0, 4) === aujourdhui.slice(0, 4) ? jourMoisFmt : jourMoisAnFmt).format(date);
}

/** Moment d'une commande : « aujourd’hui 7 h 12 », « 27 oct. 7 h 12 ». */
export function libelleInstant(iso: string, aujourdhui: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${libelleJour(torontoDay(date), aujourdhui)} ${heureFmt.format(date)}`;
}
