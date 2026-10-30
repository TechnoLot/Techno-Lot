import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";
import { fetchSoumissions, type Soumission } from "@/lib/admin/soumissions";
import { adHref, isPaid, normPlatform, publisherOf, PUBLISHER_LABELS, resolveAdId } from "@/lib/ads/queries";
import { NO_ID } from "@/lib/ads/types";
import {
  ebayOrderStatus,
  isCountedOrder,
  torontoDay,
  torontoRangeUtc,
  type EbayOrderItem,
} from "@/lib/ebay/totaux";
import { bornesPeriode, type PeriodeKey } from "@/lib/admin/periodes";
import {
  countByFiltre,
  type NotifCounts,
  type NotifPub,
  type NotificationItem,
  type NotificationsPoll,
} from "@/lib/admin/notifications-types";
import {
  dansFenetre,
  normaliserDepuis,
  plusGrandeArrivee,
  sansRetirees,
  selectionnerNouveaux,
} from "@/lib/admin/notifications-regles";

type Supa = Awaited<ReturnType<typeof createClient>>;

const DAY_MS = 86_400_000;
/** Pastille et alertes : les ventes passées il y a plus de 30 jours (synchronisées très en retard) sont ignorées. */
const VENTES_RECENTES_JOURS = 30;
/** Aucune visite enregistrée : ce qui est arrivé dans les dernières 24 h compte comme nouveau. */
const PREMIERE_VISITE_MS = DAY_MS;
/** Une soumission et son lead sont enregistrés par le même envoi, à quelques millisecondes d'écart. */
const LIEN_LEAD_MS = 10 * 60_000;
const MAX_ROWS = 1000;
const MAX_ITEMS = 1000;
/** Retraits lus au plus (« Tout effacer » purge ceux qu'il couvre). */
const MAX_RETIREES = 5000;

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
/* Dernière visite, retraits                                           */
/* ------------------------------------------------------------------ */

type EtatNotifications = {
  /** Dernière visite de l'onglet (ISO), null : jamais */
  seenAt: string | null;
  /** Dernier « Tout effacer » (ISO), null : jamais */
  clearedAt: string | null;
};

async function getEtat(supabase: Supa, userId: string): Promise<EtatNotifications> {
  const { data } = await supabase
    .from("admin_notification_state")
    .select("seen_at, cleared_at")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    seenAt: (data?.seen_at as string | undefined) ?? null,
    clearedAt: (data?.cleared_at as string | null | undefined) ?? null,
  };
}

/** Dernière visite de l'onglet Notifications (ISO), null : jamais. */
export async function getSeenAt(supabase: Supa, userId: string): Promise<string | null> {
  return (await getEtat(supabase, userId)).seenAt;
}

/** Instant demandé, jamais dans le futur (maintenant s'il est illisible). */
function cible(upTo: string | null, now: number): number {
  const asked = upTo ? Date.parse(upTo) : NaN;
  return Number.isFinite(asked) ? Math.min(asked, now) : now;
}

/** Le plus tardif entre un instant (ms) et une valeur ISO déjà enregistrée. */
function sansReculer(target: number, prev: string | null): string {
  const p = prev ? Date.parse(prev) : NaN;
  return iso(Number.isFinite(p) ? Math.max(target, p) : target);
}

/** Marque le fil comme vu jusqu'à `upTo` (jamais en arrière ni dans le futur) ; renvoie la valeur retenue. */
export async function markNotificationsSeen(
  supabase: Supa,
  userId: string,
  upTo: string | null,
): Promise<string> {
  const now = Date.now();
  const target = cible(upTo, now);
  const prev = await getSeenAt(supabase, userId);
  if (prev && Date.parse(prev) >= target) return prev;
  const seenAt = iso(target);
  const { error } = await supabase
    .from("admin_notification_state")
    .upsert({ user_id: userId, seen_at: seenAt, updated_at: iso(now) }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  return seenAt;
}

/** Retire des éléments du fil (la vente ou la demande reste dans son onglet) ; doublons ignorés. */
export async function retirerNotifications(supabase: Supa, userId: string, keys: string[]): Promise<number> {
  const uniques = Array.from(new Set(keys));
  if (uniques.length === 0) return 0;
  const { error } = await supabase
    .from("admin_notification_dismissed")
    .upsert(
      uniques.map((k) => ({ user_id: userId, item_key: k })),
      { onConflict: "user_id,item_key", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
  return uniques.length;
}

/**
 * « Tout effacer » : tout ce qui est arrivé jusqu'à `upTo` (jamais dans le
 * futur) quitte le fil et compte comme vu. Aucune des deux dates ne recule.
 */
export async function effacerNotifications(
  supabase: Supa,
  userId: string,
  upTo: string,
): Promise<{ clearedAt: string; seenAt: string }> {
  const now = Date.now();
  const target = cible(upTo, now);
  const etat = await getEtat(supabase, userId);
  const clearedAt = sansReculer(target, etat.clearedAt);
  const seenAt = sansReculer(target, etat.seenAt);
  const { error } = await supabase
    .from("admin_notification_state")
    .upsert(
      { user_id: userId, seen_at: seenAt, cleared_at: clearedAt, updated_at: iso(now) },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(error.message);
  // Un élément était arrivé avant d'être retiré : les retraits antérieurs à
  // l'effacement sont couverts par cleared_at. Purge sans effet si elle échoue.
  await supabase
    .from("admin_notification_dismissed")
    .delete()
    .eq("user_id", userId)
    .lte("dismissed_at", clearedAt);
  return { clearedAt, seenAt };
}

/** Clés retirées par l'admin. */
async function getRetirees(supabase: Supa, userId: string): Promise<{ keys: Set<string>; error: string | null }> {
  const { data, error } = await supabase
    .from("admin_notification_dismissed")
    .select("item_key")
    .eq("user_id", userId)
    .order("dismissed_at", { ascending: false })
    .limit(MAX_RETIREES);
  return {
    keys: new Set(((data ?? []) as { item_key: string }[]).map((r) => r.item_key)),
    error: error ? `retraits : ${error.message}` : null,
  };
}

/** Seuil « nouveau » (ms) : dernière visite, sinon les dernières 24 h. */
function seuilNouveau(seenAt: string | null, now: number): number {
  return seenAt ? Date.parse(seenAt) : now - PREMIERE_VISITE_MS;
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Bornes de lecture (ISO) ; null : sans borne. */
type Fenetre = {
  /** Soumissions et leads reçus à partir de */
  depuis: string | null;
  /** Leads reçus avant (les soumissions sont bornées en mémoire) */
  avant: string | null;
  /** Ventes arrivées dans la base (first_seen_at) à partir de */
  ventesArrivees: string | null;
  /** Ventes passées (created_at) à partir de */
  ventesDepuis: string | null;
  /** Ventes passées avant */
  ventesAvant: string | null;
};

/**
 * Soumissions (fonction admin_soumissions), leads (ad_leads : un par envoi du
 * formulaire, avec sa provenance) et commandes eBay de la fenêtre, plus
 * récents d'abord, 1000 au plus par source.
 */
async function fetchRows(supabase: Supa, f: Fenetre): Promise<Rows> {
  let leadsQ = supabase.from("ad_leads").select(LEAD_COLS);
  if (f.depuis) leadsQ = leadsQ.gte("created_at", f.depuis);
  if (f.avant) leadsQ = leadsQ.lt("created_at", f.avant);

  let ordersQ = supabase.from("ebay_orders").select(ORDER_COLS);
  if (f.ventesArrivees) ordersQ = ordersQ.gte("first_seen_at", f.ventesArrivees);
  if (f.ventesDepuis) ordersQ = ordersQ.gte("created_at", f.ventesDepuis);
  if (f.ventesAvant) ordersQ = ordersQ.lt("created_at", f.ventesAvant);

  const [leads, orders, soumissions] = await Promise.all([
    leadsQ.order("created_at", { ascending: false }).limit(MAX_ROWS),
    ordersQ.order("created_at", { ascending: false }).limit(MAX_ROWS),
    fetchSoumissions(supabase, { since: f.depuis ?? undefined, limit: MAX_ROWS }),
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

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Pastille du menu (nouveautés depuis la dernière visite) et, avec `depuis`,
 * les arrivées à signaler (son et fenêtre). Lecture légère, chaque 30 s.
 * Les éléments retirés ou effacés ne comptent nulle part.
 */
export async function getNotificationsPoll(
  supabase: Supa,
  user: User,
  depuisBrut: string | null,
): Promise<NotificationsPoll> {
  const now = Date.now();
  const depuis = normaliserDepuis(depuisBrut, now);
  const [etat, retirees] = await Promise.all([getEtat(supabase, user.id), getRetirees(supabase, user.id)]);
  const seuil = seuilNouveau(etat.seenAt, now);
  const debut = depuis ? Math.min(seuil, Date.parse(depuis)) : seuil;
  const rows = await fetchRows(supabase, {
    depuis: iso(debut - LIEN_LEAD_MS),
    avant: null,
    ventesArrivees: iso(debut - LIEN_LEAD_MS),
    ventesDepuis: iso(now - VENTES_RECENTES_JOURS * DAY_MS),
    ventesAvant: null,
  });
  const items = sansRetirees(construireFil(rows, seuil, SANS_NOMS), retirees.keys, etat.clearedAt);
  return {
    unseen: countByFiltre(items.filter((i) => i.isNew)),
    latest: plusGrandeArrivee(items),
    nouveaux: selectionnerNouveaux(items, depuis),
    now: iso(now),
  };
}

export type NotificationsFeed = {
  /** Les 1000 plus récentes de la période */
  items: NotificationItem[];
  /** Nombre par filtre sur la période */
  counts: NotifCounts;
  /** Nouveautés par filtre à l'ouverture */
  unseen: NotifCounts;
  /** Arrivée la plus récente (ISO) */
  latest: string | null;
  /** Instant du rendu : l'ouverture marque le fil comme vu jusque-là */
  renderedAt: string;
  /** Dernier « Tout effacer » (ISO), null : jamais */
  clearedAt: string | null;
  errors: string[];
};

/** Fil de l'onglet Notifications : éléments dont l'événement tombe dans la période (Toronto). */
export async function getNotificationsFeed(
  supabase: Supa,
  user: User,
  { periode }: { periode: PeriodeKey },
): Promise<NotificationsFeed> {
  const now = Date.now();
  const [etat, retirees] = await Promise.all([getEtat(supabase, user.id), getRetirees(supabase, user.id)]);
  const seuil = seuilNouveau(etat.seenAt, now);
  const { from, to } = bornesPeriode(periode, torontoDay());
  const { gte, lt } = torontoRangeUtc(from, to);
  // Marge pour retrouver le lead d'une soumission reçue pile à une borne.
  const rows = await fetchRows(supabase, {
    depuis: gte ? iso(Date.parse(gte) - LIEN_LEAD_MS) : null,
    avant: lt ? iso(Date.parse(lt) + LIEN_LEAD_MS) : null,
    ventesArrivees: null,
    ventesDepuis: gte,
    ventesAvant: lt,
  });
  const fil = construireFil(rows, seuil, await fetchNoms(supabase, rows.leads));
  const items = sansRetirees(fil, retirees.keys, etat.clearedAt).filter((i) => dansFenetre(i.at, gte, lt));
  const latest = plusGrandeArrivee(items);
  return {
    items: items.slice(0, MAX_ITEMS),
    counts: countByFiltre(items),
    unseen: countByFiltre(items.filter((i) => i.isNew)),
    latest,
    renderedAt: iso(Math.max(now, latest ? Date.parse(latest) : 0)),
    clearedAt: etat.clearedAt,
    errors: retirees.error ? [...rows.errors, retirees.error] : rows.errors,
  };
}
