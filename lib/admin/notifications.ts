import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";
import { fetchSoumissions, type Soumission } from "@/lib/admin/soumissions";
import { adHref, isPaid, normPlatform, publisherOf, PUBLISHER_LABELS, resolveAdId } from "@/lib/ads/queries";
import { NO_ID } from "@/lib/ads/types";
import { ebayOrderStatus, isCountedOrder, type EbayOrderItem } from "@/lib/ebay/totaux";
import {
  countByFiltre,
  type NotifCounts,
  type NotifPub,
  type NotificationItem,
  type NotificationsSummary,
} from "@/lib/admin/notifications-types";

type Supa = ReturnType<typeof createClient>;

const DAY_MS = 86_400_000;
/** Le fil couvre les 30 derniers jours. */
export const FIL_JOURS = 30;
/** Aucune visite enregistrée : ce qui est arrivé dans les dernières 24 h compte comme nouveau. */
const PREMIERE_VISITE_MS = DAY_MS;
/** Une soumission et son lead sont enregistrés par le même envoi, à quelques millisecondes d'écart. */
const LIEN_LEAD_MS = 10 * 60_000;
const MAX_ROWS = 500;
const MAX_ITEMS = 200;

type LeadRaw = {
  id: string;
  created_at: string;
  nom: string | null;
  courriel: string | null;
  telephone: string | null;
  platform: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  ad_id: string | null;
  placement: string | null;
};
const LEAD_COLS =
  "id, created_at, nom, courriel, telephone, platform, utm_source, utm_campaign, utm_content, ad_id, placement";

type OrderRaw = {
  order_id: string;
  created_at: string;
  first_seen_at: string | null;
  buyer: string | null;
  cancelled: boolean;
  payment_status: string | null;
  fulfillment_status: string | null;
  currency: string | null;
  total: number | string | null;
  refunded: number | string | null;
  items: EbayOrderItem[] | null;
};
const ORDER_COLS =
  "order_id, created_at, first_seen_at, buyer, cancelled, payment_status, fulfillment_status, currency, total, refunded, items";

type Rows = {
  soumissions: Soumission[];
  leads: LeadRaw[];
  orders: OrderRaw[];
  errors: string[];
};

/** Noms des pubs, même règle que l'onglet Publicités : « plateforme:id » → nom et « plateforme:nom » → id. */
type Noms = { nomParId: Map<string, string>; idParNom: Map<string, string> };
const SANS_NOMS: Noms = { nomParId: new Map(), idParNom: new Map() };

const iso = (ms: number) => new Date(ms).toISOString();

function clean(s: string | null | undefined): string | null {
  const t = (s ?? "").trim();
  return t ? t : null;
}

function num(v: number | string | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/* Dernière visite                                                     */
/* ------------------------------------------------------------------ */

/** Dernière visite de l'onglet Notifications (ISO), null : jamais. */
export async function getSeenAt(supabase: Supa, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("admin_notification_state")
    .select("seen_at")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.seen_at as string | undefined) ?? null;
}

/** Marque le fil comme vu jusqu'à `upTo` (jamais en arrière ni dans le futur) ; renvoie la valeur retenue. */
export async function markNotificationsSeen(
  supabase: Supa,
  userId: string,
  upTo: string | null,
): Promise<string> {
  const now = Date.now();
  const asked = upTo ? Date.parse(upTo) : NaN;
  const target = Number.isFinite(asked) ? Math.min(asked, now) : now;
  const prev = await getSeenAt(supabase, userId);
  if (prev && Date.parse(prev) >= target) return prev;
  const seenAt = iso(target);
  const { error } = await supabase
    .from("admin_notification_state")
    .upsert({ user_id: userId, seen_at: seenAt, updated_at: iso(now) }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  return seenAt;
}

/** Seuil « nouveau » (ms) : dernière visite, sinon les dernières 24 h. */
function seuilNouveau(seenAt: string | null, now: number): number {
  return seenAt ? Date.parse(seenAt) : now - PREMIERE_VISITE_MS;
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/**
 * Soumissions (fonction admin_soumissions), leads (ad_leads : un par envoi du formulaire,
 * avec sa provenance) et commandes eBay arrivés depuis `arrivedSince` ; les
 * commandes passées avant `occurredSince` sont ignorées.
 */
async function fetchRows(
  supabase: Supa,
  arrivedSince: string,
  occurredSince: string,
): Promise<Rows> {
  const [leads, orders, soumissions] = await Promise.all([
    supabase
      .from("ad_leads")
      .select(LEAD_COLS)
      .gte("created_at", arrivedSince)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    supabase
      .from("ebay_orders")
      .select(ORDER_COLS)
      .gte("first_seen_at", arrivedSince)
      .gte("created_at", occurredSince)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    fetchSoumissions(supabase, { since: arrivedSince, limit: MAX_ROWS }),
  ]);
  const errors = [
    leads.error && `leads : ${leads.error.message}`,
    orders.error && `ventes eBay : ${orders.error.message}`,
    soumissions.error && `soumissions : ${soumissions.error}`,
  ].filter((e): e is string => Boolean(e));
  return {
    soumissions: soumissions.rows,
    leads: (leads.data ?? []) as unknown as LeadRaw[],
    orders: (orders.data ?? []) as unknown as OrderRaw[],
    errors,
  };
}

/** Noms des pubs d'où viennent les leads (ad_metrics_daily), le plus récent d'abord. */
async function fetchNoms(supabase: Supa, leads: LeadRaw[]): Promise<Noms> {
  const payants = leads.filter((l) => isPaid(normPlatform(l.platform)));
  const ids = Array.from(new Set(payants.map((l) => clean(l.ad_id)).filter((v): v is string => v !== null)));
  const noms = Array.from(
    new Set(
      payants
        .filter((l) => !clean(l.ad_id))
        .map((l) => clean(l.utm_content))
        .filter((v): v is string => v !== null),
    ),
  );
  if (ids.length === 0 && noms.length === 0) return SANS_NOMS;

  const cols = "platform, ad_id, ad_name, date";
  const [parId, parNom] = await Promise.all([
    ids.length
      ? supabase.from("ad_metrics_daily").select(cols).in("ad_id", ids).order("date", { ascending: false }).limit(2000)
      : Promise.resolve({ data: [] }),
    noms.length
      ? supabase.from("ad_metrics_daily").select(cols).in("ad_name", noms).order("date", { ascending: false }).limit(2000)
      : Promise.resolve({ data: [] }),
  ]);

  const out: Noms = { nomParId: new Map(), idParNom: new Map() };
  const rows = [...(parId.data ?? []), ...(parNom.data ?? [])] as {
    platform: string;
    ad_id: string | null;
    ad_name: string | null;
  }[];
  for (const r of rows) {
    const p = normPlatform(r.platform);
    const id = clean(r.ad_id);
    const nom = clean(r.ad_name);
    if (!isPaid(p) || !id || !nom) continue;
    if (!out.nomParId.has(`${p}:${id}`)) out.nomParId.set(`${p}:${id}`, nom);
    if (!out.idParNom.has(`${p}:${nom.toLowerCase()}`)) out.idParNom.set(`${p}:${nom.toLowerCase()}`, id);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Construction du fil                                                 */
/* ------------------------------------------------------------------ */

/** Pub Meta ou Google d'un lead (null : le visiteur n'est pas venu d'une pub). */
function pubDuLead(l: LeadRaw, noms: Noms): NotifPub | null {
  const p = normPlatform(l.platform);
  if (!isPaid(p)) return null;
  const id = resolveAdId(p, l, noms.idParNom);
  const reseau = publisherOf(p, l.placement, l.utm_source);
  return {
    platform: p,
    // Le suffixe Google ne transmet pas le réseau : on ne devine pas « Recherche ».
    network:
      (p === "google" && !clean(l.placement)) || reseau === "meta_autre" || reseau === "autre"
        ? null
        : (PUBLISHER_LABELS[reseau] ?? null),
    name: id === NO_ID ? null : (noms.nomParId.get(`${p}:${id}`) ?? clean(l.utm_content)),
    href: adHref(p, id),
  };
}

/** Lead enregistré par le même envoi que la soumission : même courriel, quelques instants d'écart. */
function leadDeLaSoumission(
  s: Soumission,
  leadsParCourriel: Map<string, LeadRaw[]>,
  pris: Set<string>,
): LeadRaw | null {
  const candidats = leadsParCourriel.get(s.courriel?.trim().toLowerCase() ?? "") ?? [];
  const recue = Date.parse(s.date);
  let meilleur: LeadRaw | null = null;
  let ecart = LIEN_LEAD_MS;
  for (const l of candidats) {
    const e = Math.abs(Date.parse(l.created_at) - recue);
    if (!pris.has(l.id) && e <= ecart) {
      meilleur = l;
      ecart = e;
    }
  }
  if (meilleur) pris.add(meilleur.id);
  return meilleur;
}

function venteEbay(o: OrderRaw, seuil: number): NotificationItem {
  const items = Array.isArray(o.items) ? o.items : [];
  const premier = items[0];
  const arrivedAt = o.first_seen_at ?? o.created_at;
  return {
    kind: "vente-ebay",
    key: `ebay:${o.order_id}`,
    at: o.created_at,
    arrivedAt,
    isNew: Date.parse(arrivedAt) > seuil,
    orderId: o.order_id,
    total: num(o.total),
    currency: o.currency || "CAD",
    title: clean(premier?.title) ?? `Commande ${o.order_id}`,
    quantity: items.reduce((n, it) => n + (Number(it.quantity) || 1), 0) || 1,
    others: Math.max(0, items.length - 1),
    buyer: clean(o.buyer),
    itemUrl: premier?.itemId ? `https://www.ebay.ca/itm/${premier.itemId}` : null,
    status: ebayOrderStatus({
      cancelled: o.cancelled,
      payment_status: o.payment_status,
      fulfillment_status: o.fulfillment_status,
      refunded: num(o.refunded),
    }),
    counted: isCountedOrder(o),
  };
}

/**
 * Fil complet, plus récent d'abord. Chaque soumission reprend la provenance
 * de son lead ; un lead sans soumission retrouvée (lecture des soumissions
 * en échec) devient lui-même une soumission.
 */
function construireFil(rows: Rows, seuil: number, noms: Noms): NotificationItem[] {
  const leadsParCourriel = new Map<string, LeadRaw[]>();
  for (const l of rows.leads) {
    const k = l.courriel?.trim().toLowerCase();
    if (!k) continue;
    const liste = leadsParCourriel.get(k);
    if (liste) liste.push(l);
    else leadsParCourriel.set(k, [l]);
  }
  const pris = new Set<string>();
  const items: NotificationItem[] = [];

  for (const s of rows.soumissions) {
    const lead = leadDeLaSoumission(s, leadsParCourriel, pris);
    items.push({
      kind: "soumission",
      key: `soumission:${s.id}`,
      at: s.date,
      arrivedAt: s.date,
      isNew: Date.parse(s.date) > seuil,
      soumissionId: s.id,
      nom: clean(s.nom) ?? "Sans nom",
      courriel: clean(s.courriel),
      telephone: clean(s.telephone),
      entreprise: s.entreprise,
      ville: s.ville,
      lotId: s.lotId,
      source: lead ? normPlatform(lead.platform) : null,
      pub: lead ? pubDuLead(lead, noms) : null,
    });
  }

  for (const l of rows.leads) {
    if (pris.has(l.id)) continue;
    items.push({
      kind: "soumission",
      key: `lead:${l.id}`,
      at: l.created_at,
      arrivedAt: l.created_at,
      isNew: Date.parse(l.created_at) > seuil,
      soumissionId: null,
      nom: clean(l.nom) ?? "Sans nom",
      courriel: clean(l.courriel),
      telephone: clean(l.telephone),
      entreprise: null,
      ville: null,
      lotId: null,
      source: normPlatform(l.platform),
      pub: pubDuLead(l, noms),
    });
  }

  for (const o of rows.orders) items.push(venteEbay(o, seuil));

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function plusRecente(items: NotificationItem[]): string | null {
  let max: string | null = null;
  for (const it of items) if (!max || Date.parse(it.arrivedAt) > Date.parse(max)) max = it.arrivedAt;
  return max;
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/** Pastille du menu : nouveautés depuis la dernière visite (lecture légère, appelée chaque 30 s). */
export async function getNotificationsSummary(supabase: Supa, user: User): Promise<NotificationsSummary> {
  const now = Date.now();
  const seuil = seuilNouveau(await getSeenAt(supabase, user.id), now);
  const rows = await fetchRows(supabase, iso(seuil - LIEN_LEAD_MS), iso(now - FIL_JOURS * DAY_MS));
  const items = construireFil(rows, seuil, SANS_NOMS);
  return { unseen: countByFiltre(items.filter((i) => i.isNew)), latest: plusRecente(items) };
}

export type NotificationsFeed = {
  /** Les 200 plus récentes des 30 derniers jours */
  items: NotificationItem[];
  /** Nombre par filtre sur les 30 jours */
  counts: NotifCounts;
  /** Nouveautés par filtre à l'ouverture */
  unseen: NotifCounts;
  /** Arrivée la plus récente (ISO) */
  latest: string | null;
  /** Instant du rendu : l'ouverture marque le fil comme vu jusque-là */
  renderedAt: string;
  errors: string[];
};

/** Fil de l'onglet Notifications. */
export async function getNotificationsFeed(supabase: Supa, user: User): Promise<NotificationsFeed> {
  const now = Date.now();
  const seuil = seuilNouveau(await getSeenAt(supabase, user.id), now);
  const debut = iso(now - FIL_JOURS * DAY_MS);
  const rows = await fetchRows(supabase, debut, debut);
  const items = construireFil(rows, seuil, await fetchNoms(supabase, rows.leads));
  const latest = plusRecente(items);
  return {
    items: items.slice(0, MAX_ITEMS),
    counts: countByFiltre(items),
    unseen: countByFiltre(items.filter((i) => i.isNew)),
    latest,
    renderedAt: iso(Math.max(now, latest ? Date.parse(latest) : 0)),
    errors: rows.errors,
  };
}
