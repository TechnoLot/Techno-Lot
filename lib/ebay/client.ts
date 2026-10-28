/**
 * Client eBay API — gère le refresh token et retourne un access token.
 * Cache l'access token en mémoire pour éviter de le re-générer à chaque appel.
 */

const MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID || "EBAY_CA";
const EBAY_BASE = "https://api.ebay.com";
const EBAY_BASE_Z = "https://apiz.ebay.com"; // commerce APIs

type CachedToken = { token: string; expiresAt: number };
let cached: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  // Réutilise le token si valide pour > 5 min
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  const refreshToken = process.env.EBAY_REFRESH_TOKEN;
  if (!appId || !certId || !refreshToken) {
    throw new Error("eBay not configured. Set EBAY_APP_ID / EBAY_CERT_ID / EBAY_REFRESH_TOKEN côté serveur (variables d’environnement Hostinger).");
  }

  const scopes = [
    "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
    "https://api.ebay.com/oauth/api_scope/sell.analytics.readonly",
    "https://api.ebay.com/oauth/api_scope/sell.finances",
    "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly"
  ].join(" ");

  const basic = Buffer.from(`${appId}:${certId}`).toString("base64");
  const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: scopes
    }).toString()
  });

  const data = await r.json();
  if (!r.ok || !data.access_token) {
    throw new Error(`eBay token refresh failed: ${JSON.stringify(data)}`);
  }
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000
  };
  return cached.token;
}

export async function ebayFetch<T>(
  path: string,
  opts: { base?: "api" | "apiz"; marketplace?: boolean; init?: RequestInit } = {}
): Promise<T> {
  const token = await getAccessToken();
  const base = opts.base === "apiz" ? EBAY_BASE_Z : EBAY_BASE;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json"
  };
  if (opts.marketplace !== false) headers["X-EBAY-C-MARKETPLACE-ID"] = MARKETPLACE_ID;
  const r = await fetch(base + path, { ...opts.init, headers });
  const text = await r.text();
  const data = text ? JSON.parse(text) : {};
  if (!r.ok) {
    throw new Error(`eBay API ${r.status}: ${JSON.stringify(data)}`);
  }
  return data as T;
}

/** Résumé consolidé pour le dashboard. */
export async function getSummary() {
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

  // Appels parallèles pour la vitesse
  const [orders30, orders90, awaitingShip, user] = await Promise.allSettled([
    ebayFetch<EbayOrdersResp>(`/sell/fulfillment/v1/order?limit=200&filter=creationdate:%5B${since30}..%5D`),
    ebayFetch<EbayOrdersResp>(`/sell/fulfillment/v1/order?limit=200&filter=creationdate:%5B${since90}..%5D`),
    ebayFetch<EbayOrdersResp>(`/sell/fulfillment/v1/order?limit=100&filter=orderfulfillmentstatus:%7BNOT_STARTED|IN_PROGRESS%7D`),
    ebayFetch<EbayUser>(`/commerce/identity/v1/user/`, { base: "apiz" })
  ]);

  const o30 = orders30.status === "fulfilled" ? orders30.value.orders ?? [] : [];
  const o90 = orders90.status === "fulfilled" ? orders90.value.orders ?? [] : [];
  const ship = awaitingShip.status === "fulfilled" ? awaitingShip.value.orders ?? [] : [];
  const u = user.status === "fulfilled" ? user.value : null;

  // Ventes du jour
  // "Aujourd'hui" en heure du Québec (America/Toronto), pas en UTC
  const today = localDateString(new Date(), "America/Toronto");
  const todayOrders = o30.filter(
    (o) => o.creationDate && localDateString(new Date(o.creationDate), "America/Toronto") === today
  );
  const todayRev = sumOrders(todayOrders);
  const rev7 = sumOrders(o30.filter((o) => dateMinusDays(o.creationDate ?? "", 7)));
  const rev30 = sumOrders(o30);
  const rev90 = sumOrders(o90);

  return {
    user: u ? { username: u.username, name: u.registrationMarketplaceId } : null,
    salesToday: Math.round(todayRev),
    sales7d: Math.round(rev7),
    sales30d: Math.round(rev30),
    sales90d: Math.round(rev90),
    ordersCount30d: o30.length,
    ordersCount90d: o90.length,
    awaitingShipCount: ship.length,
    ordersToday: todayOrders.length,
    lastSync: new Date().toISOString()
  };
}

/** Derniers ventes finalisées pour affichage dans le dashboard. */
export async function getRecentOrders(limit = 10) {
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const data = await ebayFetch<EbayOrdersResp>(
    `/sell/fulfillment/v1/order?limit=${limit}&filter=creationdate:%5B${since30}..%5D`
  );
  const orders = (data.orders ?? []).slice(0, limit);
  return orders.map((o) => ({
    id: o.orderId,
    date: o.creationDate,
    status: o.orderFulfillmentStatus,
    buyer: o.buyer?.username,
    total: Number(o.pricingSummary?.total?.value ?? 0),
    currency: o.pricingSummary?.total?.currency,
    items: (o.lineItems ?? []).map((l) => ({
      title: l.title,
      quantity: l.quantity,
      price: Number(l.total?.value ?? 0),
      itemId: l.legacyItemId,
      url: l.legacyItemId ? `https://www.ebay.ca/itm/${l.legacyItemId}` : null
    }))
  }));
}

/** Ventes journalières sur N jours pour le graphique. */
export async function getDailyRevenue(days = 30) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const data = await ebayFetch<EbayOrdersResp>(
    `/sell/fulfillment/v1/order?limit=200&filter=creationdate:%5B${since}..%5D`
  );
  const orders = data.orders ?? [];
  const byDay = new Map<string, number>();
  for (const o of orders) {
    if (!o.creationDate) continue;
    const d = localDateString(new Date(o.creationDate), "America/Toronto");
    const v = Number(o.pricingSummary?.total?.value ?? 0);
    byDay.set(d, (byDay.get(d) ?? 0) + v);
  }
  const result: Array<[string, number]> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = localDateString(new Date(Date.now() - i * 24 * 3600 * 1000), "America/Toronto");
    result.push([d, Math.round((byDay.get(d) ?? 0) * 100) / 100]);
  }
  return result;
}

/** Nombre d'annonces actives. */
export async function getActiveListingsCount(): Promise<number> {
  // Essaie d'abord Trading API (le plus fiable pour le compte vendeur)
  try {
    const xml = await tradingCall(
      "GetMyeBaySelling",
      "<ActiveList><Include>true</Include><Pagination><EntriesPerPage>1</EntriesPerPage><PageNumber>1</PageNumber></Pagination></ActiveList>"
    );
    const total = parseInt(xmlField(xml, "TotalNumberOfEntries") ?? "0", 10);
    if (total > 0) return total;
  } catch {
    /* fallback */
  }
  // Fallback REST : offres (annonces publiées via Inventory API)
  try {
    const data = await ebayFetch<{ total?: number }>(`/sell/inventory/v1/offer?limit=1`);
    return data.total ?? 0;
  } catch {
    return 0;
  }
}

/* ─────────────── Trading API (XML legacy) ─────────────── */

async function tradingCall(callName: string, bodyXml: string): Promise<string> {
  const token = await getAccessToken();
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
${bodyXml}
</${callName}Request>`;
  const r = await fetch("https://api.ebay.com/ws/api.dll", {
    method: "POST",
    headers: {
      "X-EBAY-API-IAF-TOKEN": token,
      "X-EBAY-API-SITEID": "2", // 2 = eBay Canada
      "X-EBAY-API-COMPATIBILITY-LEVEL": "1193",
      "X-EBAY-API-CALL-NAME": callName,
      "Content-Type": "text/xml"
    },
    body: envelope
  });
  return r.text();
}

function xmlField(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`));
  return m ? m[1] : null;
}

/** Stats de feedback complètes (score total, pourcentage positif, counts uniques). */
export async function getFeedbackSummary() {
  try {
    const xml = await tradingCall("GetUser", "<DetailLevel>ReturnAll</DetailLevel>");
    return {
      score: parseInt(xmlField(xml, "FeedbackScore") ?? "0", 10),
      positivePercent: parseFloat(xmlField(xml, "PositiveFeedbackPercent") ?? "0"),
      uniqueNegative: parseInt(xmlField(xml, "UniqueNegativeFeedbackCount") ?? "0", 10),
      uniqueNeutral: parseInt(xmlField(xml, "UniqueNeutralFeedbackCount") ?? "0", 10),
      uniquePositive: parseInt(xmlField(xml, "UniquePositiveFeedbackCount") ?? "0", 10)
    };
  } catch (e) {
    console.warn("[eBay] getFeedbackSummary failed:", e);
    return { score: 0, positivePercent: 0, uniqueNegative: 0, uniqueNeutral: 0, uniquePositive: 0 };
  }
}

/** Rapport de trafic (vues) sur N jours via Analytics API. */
export async function getTrafficReport(days = 90) {
  try {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 1); // hier
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - days);
    const fmt = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");
    const params = new URLSearchParams({
      dimension: "DAY",
      metric: "LISTING_VIEWS_SRP,LISTING_IMPRESSION_TOTAL",
      marketplace_ids: MARKETPLACE_ID,
      date_from: fmt(start),
      date_to: fmt(end)
    });
    const data = await ebayFetch<EbayTrafficResp>(`/sell/analytics/v1/traffic_report?${params.toString()}`);
    let views = 0;
    let impressions = 0;
    for (const rec of data.records ?? []) {
      for (const m of rec.metrics ?? []) {
        if (m.metricKey === "LISTING_VIEWS_SRP") views += Number(m.value ?? 0);
        if (m.metricKey === "LISTING_IMPRESSION_TOTAL") impressions += Number(m.value ?? 0);
      }
    }
    return { views, impressions };
  } catch (e) {
    console.warn("[eBay] getTrafficReport failed:", e);
    return { views: 0, impressions: 0 };
  }
}

type EbayTrafficResp = {
  records?: Array<{ metrics?: Array<{ metricKey?: string; value?: number }> }>;
};

/** Nombre de retours / remboursements actifs côté vendeur (Post-Order API). */
export async function getActiveReturnsCount(): Promise<number> {
  const token = await getAccessToken();
  const url = "https://api.ebay.com/post-order/v2/return/search?role=SELLER&return_state=ACTIVE&limit=1";
  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID
      }
    });
    if (!r.ok) return 0;
    const d = (await r.json()) as { total?: number; members?: unknown[] };
    return d.total ?? d.members?.length ?? 0;
  } catch {
    return 0;
  }
}

/* ─────────────── Helpers ─────────────── */

/** Retourne la date "YYYY-MM-DD" dans le fuseau horaire demandé. */
function localDateString(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

function sumOrders(orders: EbayOrder[]): number {
  return orders.reduce((acc, o) => acc + Number(o.pricingSummary?.total?.value ?? 0), 0);
}

function dateMinusDays(iso: string, days: number): boolean {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  return d >= Date.now() - days * 24 * 3600 * 1000;
}

/* ─────────────── Types ─────────────── */

type EbayUser = { username?: string; registrationMarketplaceId?: string };

type EbayOrder = {
  orderId?: string;
  creationDate?: string;
  orderFulfillmentStatus?: string;
  buyer?: { username?: string };
  pricingSummary?: {
    total?: { value?: string; currency?: string };
  };
  lineItems?: Array<{
    title?: string;
    quantity?: number;
    total?: { value?: string; currency?: string };
    legacyItemId?: string;
  }>;
};

type EbayOrdersResp = {
  orders?: EbayOrder[];
  total?: number;
  next?: string;
  prev?: string;
};
