/**
 * Calculs purs sur les commandes eBay (aucun accès réseau ni base) :
 * conversion d'une commande de l'API en ligne de `ebay_orders`, règles de
 * comptage, totaux et séries quotidiennes. Utilisable côté serveur et client.
 */

export const EBAY_TZ = "America/Toronto";

/** Ligne de la table `ebay_orders`. */
export type EbayOrderRow = {
  order_id: string;
  created_at: string;
  buyer: string | null;
  fulfillment_status: string | null;
  payment_status: string | null;
  cancelled: boolean;
  currency: string;
  total: number;
  subtotal: number | null;
  shipping: number | null;
  tax: number | null;
  refunded: number;
  fees: number | null;
  items: EbayOrderItem[];
  synced_at: string;
};

export type EbayOrderItem = {
  title: string;
  quantity: number;
  price: number;
  itemId: string | null;
};

/** Champs minimaux nécessaires aux totaux. */
export type EbayCountable = Pick<EbayOrderRow, "total" | "refunded" | "fees" | "cancelled" | "payment_status">;

export type EbaySums = {
  /** Total payé par les acheteurs (articles + livraison + taxes) */
  revenue: number;
  /** Somme des frais connus ; null si aucun frais connu */
  fees: number | null;
  /** Commandes comptées */
  orders: number;
  /** Commandes comptées dont les frais sont inconnus */
  ordersWithoutFees: number;
};

/* ------------------------------------------------------------------ */
/* Règles de comptage                                                  */
/* ------------------------------------------------------------------ */

/**
 * Une commande compte si elle n'est ni annulée ni entièrement remboursée.
 * (Un remboursement partiel est retiré : seul le montant finalement payé compte.)
 */
export function isCountedOrder(o: Pick<EbayOrderRow, "cancelled" | "payment_status">): boolean {
  if (o.cancelled) return false;
  return (o.payment_status ?? "").toUpperCase() !== "FULLY_REFUNDED";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Additionne les commandes comptées. */
export function sumEbayOrders(rows: EbayCountable[]): EbaySums {
  let revenue = 0;
  let fees = 0;
  let feesKnown = 0;
  let orders = 0;
  for (const r of rows) {
    if (!isCountedOrder(r)) continue;
    orders += 1;
    // Remboursement partiel : seul ce que l'acheteur a finalement payé compte.
    revenue += Math.max(0, (Number(r.total) || 0) - (Number(r.refunded) || 0));
    if (r.fees != null && Number.isFinite(Number(r.fees))) {
      fees += Number(r.fees);
      feesKnown += 1;
    }
  }
  return {
    revenue: round2(revenue),
    fees: feesKnown > 0 ? round2(fees) : null,
    orders,
    ordersWithoutFees: orders - feesKnown,
  };
}

/* ------------------------------------------------------------------ */
/* Dates — fuseau America/Toronto                                      */
/* ------------------------------------------------------------------ */

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: EBAY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Jour local (Toronto) d'un instant → "YYYY-MM-DD". */
export function torontoDay(at: string | Date = new Date()): string {
  return dayFmt.format(typeof at === "string" ? new Date(at) : at);
}

/** Ajoute n jours à un jour "YYYY-MM-DD". */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function tzOffsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EBAY_TZ,
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

/** Instant UTC (ISO) de minuit, heure de Toronto, du jour donné. */
export function torontoStartUtc(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  // 5 h UTC ≈ minuit/1 h à Toronto : avant le changement d'heure de 2 h.
  const offset = tzOffsetMinutes(Date.UTC(y, m - 1, d, 5));
  return new Date(Date.UTC(y, m - 1, d) - offset * 60_000).toISOString();
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Bornes UTC [gte, lt[ d'une période de jours inclusifs à l'heure de Toronto.
 * null = sans borne. Un jour mal formé est ignoré (sans borne).
 */
export function torontoRangeUtc(from: string | null, to: string | null): { gte: string | null; lt: string | null } {
  return {
    gte: from && DAY_RE.test(from) ? torontoStartUtc(from) : null,
    lt: to && DAY_RE.test(to) ? torontoStartUtc(addDays(to, 1)) : null,
  };
}

/** Filtre en mémoire sur une période de jours inclusifs (Toronto). */
export function inTorontoRange(createdAt: string, from: string | null, to: string | null): boolean {
  const day = torontoDay(createdAt);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/** Série quotidienne des ventes comptées sur `days` jours se terminant à `today`. */
export function dailyEbayRevenue(
  rows: Array<EbayCountable & { created_at: string }>,
  days: number,
  today: string = torontoDay(),
): Array<{ day: string; total: number; orders: number }> {
  const byDay = new Map<string, { total: number; orders: number }>();
  for (const r of rows) {
    if (!isCountedOrder(r)) continue;
    const d = torontoDay(r.created_at);
    const cur = byDay.get(d) ?? { total: 0, orders: 0 };
    cur.total += Number(r.total) || 0;
    cur.orders += 1;
    byDay.set(d, cur);
  }
  const out: Array<{ day: string; total: number; orders: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const v = byDay.get(day);
    out.push({ day, total: round2(v?.total ?? 0), orders: v?.orders ?? 0 });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Conversion d'une commande de l'API Fulfillment                      */
/* ------------------------------------------------------------------ */

type Money = { value?: string; currency?: string };

/** Commande telle que renvoyée par GET /sell/fulfillment/v1/order. */
export type EbayApiOrder = {
  orderId?: string;
  creationDate?: string;
  orderFulfillmentStatus?: string;
  orderPaymentStatus?: string;
  cancelStatus?: { cancelState?: string };
  buyer?: { username?: string };
  pricingSummary?: {
    total?: Money;
    priceSubtotal?: Money;
    deliveryCost?: Money;
    tax?: Money;
  };
  paymentSummary?: {
    refunds?: Array<{ amount?: Money; refundStatus?: string }>;
  };
  totalMarketplaceFee?: Money;
  lineItems?: Array<{
    title?: string;
    quantity?: number;
    total?: Money;
    legacyItemId?: string;
    taxes?: Array<{ amount?: Money }>;
    ebayCollectAndRemitTaxes?: Array<{ amount?: Money }>;
  }>;
};

const num = (m?: Money): number | null => {
  if (!m || m.value == null) return null;
  const n = Number(m.value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Convertit une commande de l'API en ligne `ebay_orders` (sans `fees` ni
 * `synced_at`, ajoutés par la synchronisation). null si la commande est
 * inexploitable (sans identifiant ni date).
 */
export function mapApiOrder(o: EbayApiOrder): Omit<EbayOrderRow, "fees" | "synced_at"> & { marketplaceFee: number | null } | null {
  if (!o.orderId || !o.creationDate) return null;
  const lines = o.lineItems ?? [];

  let lineTax = 0;
  for (const l of lines) {
    for (const t of l.taxes ?? []) lineTax += num(t.amount) ?? 0;
    for (const t of l.ebayCollectAndRemitTaxes ?? []) lineTax += num(t.amount) ?? 0;
  }
  const tax = lineTax > 0 ? round2(lineTax) : num(o.pricingSummary?.tax);

  let refunded = 0;
  for (const r of o.paymentSummary?.refunds ?? []) {
    const status = (r.refundStatus ?? "").toUpperCase();
    if (status === "FAILED") continue;
    refunded += num(r.amount) ?? 0;
  }

  return {
    order_id: o.orderId,
    created_at: new Date(o.creationDate).toISOString(),
    buyer: o.buyer?.username ?? null,
    fulfillment_status: o.orderFulfillmentStatus ?? null,
    payment_status: o.orderPaymentStatus ?? null,
    cancelled: (o.cancelStatus?.cancelState ?? "").toUpperCase() === "CANCELED",
    currency: o.pricingSummary?.total?.currency ?? "CAD",
    total: num(o.pricingSummary?.total) ?? 0,
    subtotal: num(o.pricingSummary?.priceSubtotal),
    shipping: num(o.pricingSummary?.deliveryCost),
    tax,
    refunded: round2(refunded),
    items: lines.map((l) => ({
      title: l.title ?? "",
      quantity: l.quantity ?? 1,
      price: num(l.total) ?? 0,
      itemId: l.legacyItemId ?? null,
    })),
    marketplaceFee: num(o.totalMarketplaceFee),
  };
}

/** Statut lisible d'une commande pour l'affichage. */
export function ebayOrderStatus(o: Pick<EbayOrderRow, "cancelled" | "payment_status" | "fulfillment_status" | "refunded">):
  | { label: string; tone: "ok" | "warn" | "bad" | "neutral" } {
  if (o.cancelled) return { label: "Annulée", tone: "bad" };
  const pay = (o.payment_status ?? "").toUpperCase();
  if (pay === "FULLY_REFUNDED") return { label: "Remboursée", tone: "bad" };
  if (pay === "PARTIALLY_REFUNDED" || o.refunded > 0) return { label: "Remb. partiel", tone: "warn" };
  if (pay === "PENDING" || pay === "FAILED") return { label: "Paiement en attente", tone: "warn" };
  const ful = (o.fulfillment_status ?? "").toUpperCase();
  if (ful === "FULFILLED") return { label: "Expédiée", tone: "ok" };
  return { label: "À expédier", tone: "neutral" };
}
