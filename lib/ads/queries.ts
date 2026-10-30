import { createClient } from "@/lib/supabase/server";
import { isGoogleConfigured, isMetaConfigured } from "@/lib/ads/sync";
import { averageCpl } from "@/lib/ads/verdict";
import {
  ADS_PERIODS,
  NO_ID,
  type AdDetail,
  type AdPlatform,
  type AdsOverview,
  type AdSummary,
  type ConfigStatus,
  type DailyPoint,
  type DateRange,
  type EventRow,
  type LastSync,
  type LeadItem,
  type LeadRow,
  type LotRow,
  type MetricRow,
  type PlatformFilter,
  type RawAdsData,
  type AdsSyncState,
  type TrackingCoverage,
  type SessionPlatform,
  type SessionRow,
  type SyncRunRow,
  type Totals,
} from "@/lib/ads/types";

/* ================================================================== */
/* Dates — fuseau America/Toronto                                      */
/* ================================================================== */

export const TZ = "America/Toronto";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Jour local (Toronto) d'un instant ISO → "YYYY-MM-DD". */
export function torontoDay(iso: string | Date): string {
  return dayFmt.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** Ajoute n jours à un jour "YYYY-MM-DD" (arithmétique calendaire pure). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Nombre de jours inclusifs entre deux jours. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Décalage (minutes) de Toronto par rapport à UTC à un instant donné. */
function tzOffsetMinutes(utcMs: number): number {
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

/** Instant UTC (ISO) correspondant à minuit, heure de Toronto, du jour donné. */
export function torontoStartUtc(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  // 5 h UTC ≈ minuit/1 h à Toronto : avant le changement d'heure de 2 h.
  const offset = tzOffsetMinutes(Date.UTC(y, m - 1, d, 5));
  return new Date(Date.UTC(y, m - 1, d) - offset * 60_000).toISOString();
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Résout la période demandée (searchParams) en plage de jours + plage
 * précédente de même durée. Par défaut : 30 derniers jours.
 */
export function resolveRange(
  params: { period?: string; from?: string; to?: string },
  today: string = torontoDay(new Date()),
): { key: string; range: DateRange; prevRange: DateRange } {
  let key = params.period ?? "30d";
  let from: string;
  let to: string;

  if (
    key === "custom" &&
    params.from &&
    params.to &&
    DAY_RE.test(params.from) &&
    DAY_RE.test(params.to) &&
    params.from <= params.to
  ) {
    from = params.from;
    to = params.to > today ? today : params.to;
    if (from > to) from = to;
    if (daysBetween(from, to) > 366) from = addDays(to, -365);
  } else {
    const def = ADS_PERIODS.find((p) => p.key === key) ?? ADS_PERIODS[1];
    key = def.key;
    to = today;
    from = addDays(today, -(def.days - 1));
  }

  const days = daysBetween(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return {
    key,
    range: { from, to, days },
    prevRange: { from: prevFrom, to: prevTo, days },
  };
}

export function listDays(range: DateRange): string[] {
  const out: string[] = [];
  for (let i = 0; i < range.days; i++) out.push(addDays(range.from, i));
  return out;
}

/* ================================================================== */
/* Normalisation                                                       */
/* ================================================================== */

export function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

const SESSION_PLATFORMS: SessionPlatform[] = [
  "meta",
  "google",
  "organic",
  "referral",
  "direct",
  "email",
  "other",
];

export function normPlatform(p: string | null | undefined): SessionPlatform {
  const v = (p ?? "").toLowerCase() as SessionPlatform;
  return SESSION_PLATFORMS.includes(v) ? v : "other";
}

export function isPaid(p: SessionPlatform): p is AdPlatform {
  return p === "meta" || p === "google";
}

function clean(s: string | null | undefined): string | null {
  const t = (s ?? "").trim();
  return t ? t : null;
}

export function adHref(platform: AdPlatform, id: string): string {
  return `/admin/pubs/${platform}/${encodeURIComponent(id)}`;
}

export function adKey(platform: AdPlatform, id: string): string {
  return `${platform}:${id}`;
}

/** Index nom de pub (ad_name) → ad_id, pour rattacher les visites sans ad_id. */
export function buildNameIndex(metrics: MetricRow[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const m of metrics) {
    const name = clean(m.ad_name);
    const id = clean(m.ad_id);
    const p = normPlatform(m.platform);
    if (name && id && isPaid(p)) idx.set(`${p}:${name.toLowerCase()}`, id);
  }
  return idx;
}

/**
 * Identifiant de regroupement d'une visite / d'un lead : ad_id, sinon
 * utm_content (rattaché à l'ad_id si le nom correspond), sinon utm_campaign.
 */
export function resolveAdId(
  platform: AdPlatform,
  row: { ad_id: string | null; utm_content: string | null; utm_campaign: string | null },
  nameIndex: Map<string, string>,
): string {
  const id = clean(row.ad_id);
  if (id) return id;
  const content = clean(row.utm_content);
  if (content) return nameIndex.get(`${platform}:${content.toLowerCase()}`) ?? content;
  return clean(row.utm_campaign) ?? NO_ID;
}

/** Réseau de diffusion (Facebook, Instagram…) déduit du placement / utm_source. */
export function publisherOf(
  platform: SessionPlatform,
  placement: string | null,
  utmSource: string | null,
): string {
  const s = `${placement ?? ""} ${utmSource ?? ""}`.toLowerCase();
  if (platform === "google") {
    if (s.includes("youtube")) return "youtube";
    if (s.includes("display")) return "display";
    return "google";
  }
  if (s.includes("instagram") || /\big\b/.test(s)) return "instagram";
  if (s.includes("messenger") || /\bmsg\b/.test(s)) return "messenger";
  if (s.includes("audience") || /\ban\b/.test(s)) return "audience_network";
  if (s.includes("facebook") || /\bfb\b/.test(s)) return "facebook";
  if (s.includes("threads")) return "threads";
  return platform === "meta" ? "meta_autre" : "autre";
}

export const PUBLISHER_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  messenger: "Messenger",
  audience_network: "Audience Network",
  threads: "Threads",
  meta_autre: "Meta (non précisé)",
  google: "Google Recherche",
  youtube: "YouTube",
  display: "Google Display",
  autre: "Autre",
};

/**
 * Évite le double comptage quand une même pub/jour a à la fois une ligne
 * « all » et des lignes ventilées par réseau : on garde la ventilation.
 */
export function dedupeMetrics(rows: MetricRow[]): MetricRow[] {
  const groups = new Map<string, MetricRow[]>();
  for (const r of rows) {
    const k = `${r.platform}|${r.date}|${r.ad_id ?? r.ad_name ?? r.campaign_id ?? ""}`;
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  const out: MetricRow[] = [];
  for (const g of Array.from(groups.values())) {
    const split = g.filter((r) => (r.publisher ?? "all").toLowerCase() !== "all");
    out.push(...(split.length > 0 ? split : g));
  }
  return out;
}

/* ================================================================== */
/* Conversion → clients                                                */
/* ================================================================== */

/**
 * Un lead devient « client acquis » quand un lot ACHETÉ ou VENDU (les lots
 * en négociation ou annulés ne comptent pas) porte son courriel ou son
 * téléphone, et que ce lot date du lead ou d'après (petite tolérance pour
 * les dates saisies à la main). Chaque lot n'est rattaché qu'une fois, au
 * premier lead (ordre chronologique) qui y correspond : un client qui remplit
 * le formulaire deux fois n'est pas compté deux fois, et la somme des pubs
 * égale le total.
 */
export const CLIENT_LOT_STATUSES = ["purchased", "sold"] as const;
/** Un lot daté jusqu'à N jours AVANT le lead compte quand même (saisie approximative). */
export const LOT_BEFORE_LEAD_GRACE_DAYS = 2;

export type ClientLot = {
  id: string;
  /** Jour d'achat "YYYY-MM-DD" (purchased_at, sinon jour de création) */
  day: string;
  /** Profit si vendu (prix de vente − prix d'achat), sinon null */
  profit: number | null;
};

export type ClientIndex = {
  byEmail: Map<string, ClientLot[]>;
  byPhone: Map<string, ClientLot[]>;
};

export function emptyClientIndex(): ClientIndex {
  return { byEmail: new Map(), byPhone: new Map() };
}

/** Téléphone normalisé : 10 derniers chiffres (null si moins de 10). */
export function phoneKey(p: string | null | undefined): string | null {
  const digits = (p ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export function buildClientIndex(lots: LotRow[]): ClientIndex {
  const idx = emptyClientIndex();
  const push = (map: Map<string, ClientLot[]>, k: string, lot: ClientLot) => {
    const list = map.get(k);
    if (list) list.push(lot);
    else map.set(k, [lot]);
  };
  for (const l of lots) {
    if (!(CLIENT_LOT_STATUSES as readonly string[]).includes(l.status ?? "")) continue;
    const email = clean(l.client_email)?.toLowerCase() ?? null;
    const phone = phoneKey(l.client_phone);
    if (!email && !phone) continue;
    const purchased = (l.purchased_at ?? "").slice(0, 10);
    const lot: ClientLot = {
      id: l.id,
      day: DAY_RE.test(purchased) ? purchased : torontoDay(l.created_at),
      profit: l.sale_price != null ? num(l.sale_price) - num(l.purchase_price) : null,
    };
    if (email) push(idx.byEmail, email, lot);
    if (phone) push(idx.byPhone, phone, lot);
  }
  return idx;
}

export type LeadClaim = { lots: number; profit: number | null };

/**
 * Rattache les lots clients aux leads (premier lead chronologique gagnant).
 * Résultat : id du lead → nombre de lots rattachés et leur profit.
 */
export function claimClients(
  leads: Pick<LeadRow, "id" | "created_at" | "courriel" | "telephone">[],
  clients: ClientIndex,
): Map<string, LeadClaim> {
  const out = new Map<string, LeadClaim>();
  const taken = new Set<string>();
  const sorted = [...leads].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const l of sorted) {
    const minDay = addDays(torontoDay(l.created_at), -LOT_BEFORE_LEAD_GRACE_DAYS);
    const email = clean(l.courriel)?.toLowerCase();
    const phone = phoneKey(l.telephone);
    const candidates = [
      ...(email ? clients.byEmail.get(email) ?? [] : []),
      ...(phone ? clients.byPhone.get(phone) ?? [] : []),
    ];
    let lots = 0;
    let profit: number | null = null;
    for (const lot of candidates) {
      if (taken.has(lot.id) || lot.day < minDay) continue;
      taken.add(lot.id);
      lots += 1;
      if (lot.profit != null) profit = (profit ?? 0) + lot.profit;
    }
    if (lots > 0) out.set(l.id, { lots, profit });
  }
  return out;
}

/* ================================================================== */
/* Agrégation principale (pure)                                        */
/* ================================================================== */

type Acc = {
  platform: AdPlatform;
  adId: string;
  name: string | null;
  fallbackName: string | null;
  campaign: string | null;
  publishers: Set<string>;
  spend: number;
  impressions: number;
  clicks: number;
  visits: number;
  formViews: number;
  formStarts: number;
  leads: number;
  clients: number;
  profit: number;
};

function newAcc(platform: AdPlatform, adId: string): Acc {
  return {
    platform,
    adId,
    name: null,
    fallbackName: null,
    campaign: null,
    publishers: new Set(),
    spend: 0,
    impressions: 0,
    clicks: 0,
    visits: 0,
    formViews: 0,
    formStarts: 0,
    leads: 0,
    clients: 0,
    profit: 0,
  };
}

export function emptyTotals(): Totals {
  return {
    impressions: 0,
    clicks: 0,
    visits: 0,
    formViews: 0,
    formStarts: 0,
    leads: 0,
    clients: 0,
    spend: 0,
    ctr: null,
    cpl: null,
    convRate: null,
    profit: 0,
  };
}

/** Calcule les ratios et rend le funnel monotone (vu ≥ commencé ≥ envoyé). */
export function finalizeTotals(t: Omit<Totals, "ctr" | "cpl" | "convRate">): Totals {
  const formStarts = Math.max(t.formStarts, t.leads);
  const formViews = Math.max(t.formViews, formStarts);
  return {
    ...t,
    formStarts,
    formViews,
    ctr: t.impressions > 0 ? t.clicks / t.impressions : null,
    cpl: t.leads > 0 && t.spend > 0 ? t.spend / t.leads : null,
    convRate: t.visits > 0 ? t.leads / t.visits : null,
  };
}

export type AnalyzeOptions = {
  range: DateRange;
  platform: PlatformFilter;
  /** Limite l'analyse à une seule pub (clé `${platform}:${id}`). */
  adKey?: string;
};

export type Analysis = {
  totals: Totals;
  ads: AdSummary[];
  daily: DailyPoint[];
  leads: LeadItem[];
};

/**
 * Agrège les données brutes d'une période. Pure : aucune I/O, testable
 * avec des fixtures. Seul le payant (Meta + Google, selon le filtre) compte.
 * Le rattachement des clients se fait sur TOUS les leads de la période avant
 * filtrage, pour que la vue d'ensemble et le détail d'une pub concordent.
 */
export function analyze(raw: RawAdsData, clients: ClientIndex, opts: AnalyzeOptions): Analysis {
  const { range, platform: filter, adKey: onlyKey } = opts;
  const metrics = dedupeMetrics(raw.metrics);
  const nameIndex = buildNameIndex(metrics);
  const claims = claimClients(raw.leads, clients);
  const accs = new Map<string, Acc>();
  const keep = (p: SessionPlatform): p is AdPlatform =>
    isPaid(p) && (filter === "all" || filter === p);
  const accFor = (p: AdPlatform, id: string) => {
    const k = adKey(p, id);
    let a = accs.get(k);
    if (!a) {
      a = newAcc(p, id);
      accs.set(k, a);
    }
    return a;
  };
  const inScope = (k: string) => !onlyKey || onlyKey === k;

  const daily = new Map<string, DailyPoint>();
  for (const d of listDays(range)) daily.set(d, { day: d, spend: 0, leads: 0, visits: 0, clicks: 0 });

  /* --- Métriques plateformes ------------------------------------- */
  for (const m of metrics) {
    const p = normPlatform(m.platform);
    if (!keep(p)) continue;
    const id = clean(m.ad_id) ?? clean(m.ad_name) ?? clean(m.campaign_id) ?? NO_ID;
    if (!inScope(adKey(p, id))) continue;
    const spend = num(m.spend);
    const clicks = num(m.link_clicks) > 0 ? num(m.link_clicks) : num(m.clicks);
    const a = accFor(p, id);
    a.name = a.name ?? clean(m.ad_name);
    a.campaign = a.campaign ?? clean(m.campaign_name);
    a.spend += spend;
    a.impressions += num(m.impressions);
    a.clicks += clicks;
    const pub = (m.publisher ?? "all").toLowerCase();
    if (pub !== "all") a.publishers.add(publisherOf(p, pub, null));
    const dp = daily.get(m.date);
    if (dp) {
      dp.spend += spend;
      dp.clicks += clicks;
    }
  }

  /* --- Événements par session ----------------------------------- */
  const sessionEvents = new Map<string, Set<string>>();
  for (const e of raw.events) {
    if (!e.session_id) continue;
    const s = sessionEvents.get(e.session_id) ?? new Set<string>();
    s.add(e.type);
    sessionEvents.set(e.session_id, s);
  }

  /* --- Sessions (visites) --------------------------------------- */
  const sessionKey = new Map<string, string | null>();
  const sessionById = new Map<string, SessionRow>();
  for (const s of raw.sessions) {
    sessionById.set(s.id, s);
    const p = normPlatform(s.platform);
    if (!keep(p)) {
      sessionKey.set(s.id, null);
      continue;
    }
    const id = resolveAdId(p, s, nameIndex);
    const k = adKey(p, id);
    sessionKey.set(s.id, k);
    if (!inScope(k)) continue;
    const a = accFor(p, id);
    a.fallbackName = a.fallbackName ?? clean(s.utm_content);
    a.campaign = a.campaign ?? clean(s.utm_campaign);
    a.visits += 1;
    a.publishers.add(publisherOf(p, s.placement, s.utm_source));
    const ev = sessionEvents.get(s.id);
    if (ev?.has("form_view")) a.formViews += 1;
    if (ev?.has("form_start")) a.formStarts += 1;
    const dp = daily.get(torontoDay(s.created_at));
    if (dp) dp.visits += 1;
  }

  /* --- Leads ---------------------------------------------------- */
  type PendingLead = { row: LeadRow; platform: SessionPlatform; key: string; claim: LeadClaim | undefined };
  const pending: PendingLead[] = [];
  for (const l of raw.leads) {
    const session = l.session_id ? sessionById.get(l.session_id) : undefined;
    const p = normPlatform(l.platform ?? session?.platform);
    if (!keep(p)) continue;
    const hasOwnId = clean(l.ad_id) || clean(l.utm_content) || clean(l.utm_campaign);
    // Sans identifiant propre : on reprend la pub de la visite, si elle vient de la même plateforme
    const sKey = session ? sessionKey.get(session.id) : null;
    const id = hasOwnId
      ? resolveAdId(p, l, nameIndex)
      : sKey && sKey.startsWith(`${p}:`)
        ? sKey.slice(p.length + 1)
        : NO_ID;
    const k = adKey(p, id);
    if (!inScope(k)) continue;
    const a = accFor(p, id);
    a.fallbackName = a.fallbackName ?? clean(l.utm_content);
    a.campaign = a.campaign ?? clean(l.utm_campaign);
    a.leads += 1;
    const claim = claims.get(l.id);
    if (claim) {
      a.clients += 1;
      a.profit += claim.profit ?? 0;
    }
    const dp = daily.get(torontoDay(l.created_at));
    if (dp) dp.leads += 1;
    pending.push({ row: l, platform: p, key: k, claim });
  }

  /* --- Résumés par pub ------------------------------------------ */
  const ads: AdSummary[] = [];
  const total = { ...emptyTotals() };
  for (const [k, a] of Array.from(accs.entries())) {
    const t = finalizeTotals({
      impressions: a.impressions,
      clicks: a.clicks,
      visits: a.visits,
      formViews: a.formViews,
      formStarts: a.formStarts,
      leads: a.leads,
      clients: a.clients,
      spend: a.spend,
      profit: a.profit,
    });
    ads.push({
      ...t,
      key: k,
      platform: a.platform,
      adId: a.adId,
      name: a.name ?? a.fallbackName ?? a.adId,
      campaign: a.campaign,
      publishers: Array.from(a.publishers).sort(),
      href: adHref(a.platform, a.adId),
    });
    total.impressions += t.impressions;
    total.clicks += t.clicks;
    total.visits += t.visits;
    total.formViews += t.formViews;
    total.formStarts += t.formStarts;
    total.leads += t.leads;
    total.clients += t.clients;
    total.spend += t.spend;
    total.profit += t.profit;
  }
  ads.sort((x, y) => y.leads - x.leads || y.spend - x.spend || y.visits - x.visits);

  const byKey = new Map(ads.map((a) => [a.key, a]));
  const leads: LeadItem[] = pending
    .map(({ row, platform, key, claim }) => {
      const ad = byKey.get(key);
      return {
        id: row.id,
        createdAt: row.created_at,
        nom: clean(row.nom) ?? "Sans nom",
        courriel: clean(row.courriel),
        telephone: clean(row.telephone),
        platform,
        adKey: key,
        adName: ad?.name ?? null,
        adHref: ad?.href ?? null,
        placement: row.placement ?? null,
        converted: Boolean(claim),
        profit: claim?.profit ?? null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    totals: finalizeTotals(total),
    ads,
    daily: Array.from(daily.values()),
    leads,
  };
}

/* ================================================================== */
/* Accès Supabase                                                      */
/* ================================================================== */

type Supa = Awaited<ReturnType<typeof createClient>>;
const PAGE = 1000;
const MAX_PAGES = 50;

/** Pagine une requête Supabase (.range) au-delà de la limite de 1000 lignes. */
async function fetchPaged<T>(
  make: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await make(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const SESSION_COLS =
  "id, created_at, platform, utm_source, utm_campaign, utm_content, campaign_id, ad_id, placement, device";
const LEAD_COLS =
  "id, created_at, session_id, nom, courriel, telephone, platform, utm_source, utm_campaign, utm_content, campaign_id, ad_id, placement";
const METRIC_COLS =
  "platform, date, campaign_id, campaign_name, ad_id, ad_name, publisher, impressions, clicks, link_clicks, spend";

export async function fetchRaw(supabase: Supa, range: DateRange): Promise<RawAdsData> {
  const startIso = torontoStartUtc(range.from);
  const endIso = torontoStartUtc(addDays(range.to, 1));

  const [sessions, events, leads, metrics] = await Promise.all([
    fetchPaged<SessionRow>((a, b) =>
      supabase
        .from("ad_sessions")
        .select(SESSION_COLS)
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .order("created_at", { ascending: true })
        .range(a, b),
    ),
    fetchPaged<EventRow>((a, b) =>
      supabase
        .from("ad_events")
        .select("session_id, type")
        .in("type", ["form_view", "form_start", "form_submit"])
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .order("id", { ascending: true })
        .range(a, b),
    ),
    fetchPaged<LeadRow>((a, b) =>
      supabase
        .from("ad_leads")
        .select(LEAD_COLS)
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .order("created_at", { ascending: true })
        .range(a, b),
    ),
    fetchPaged<MetricRow>((a, b) =>
      supabase
        .from("ad_metrics_daily")
        .select(METRIC_COLS)
        .gte("date", range.from)
        .lte("date", range.to)
        .order("date", { ascending: true })
        .range(a, b),
    ),
  ]);
  return { sessions, events, leads, metrics };
}

/** Lots achetés / vendus (lecture seule), indexés par courriel et téléphone. */
export async function fetchClientIndex(supabase: Supa): Promise<ClientIndex> {
  const lots = await fetchPaged<LotRow>((a, b) =>
    supabase
      .from("lots")
      .select("id, created_at, purchased_at, client_email, client_phone, purchase_price, sale_price, status")
      .in("status", [...CLIENT_LOT_STATUSES])
      .order("id", { ascending: true })
      .range(a, b),
  );
  return buildClientIndex(lots);
}

/** Dernière synchronisation (toutes plateformes, ou une seule). */
export async function getLastSync(
  platform?: AdPlatform | null,
  supabase?: Supa,
): Promise<LastSync> {
  supabase ??= await createClient();
  let query = supabase
    .from("ad_sync_runs")
    .select("created_at, platform, ok, rows_upserted, message")
    .order("created_at", { ascending: false })
    .limit(1);
  if (platform) query = query.eq("platform", platform);
  const { data } = await query;
  const row = (data?.[0] ?? null) as SyncRunRow | null;
  return row
    ? { at: row.created_at, ok: row.ok, platform: row.platform, message: row.message }
    : null;
}

/** État de la synchro automatique de Meta et de Google (pastilles « Synchro auto »). */
export async function getAdsSyncState(
  supabase?: Supa,
): Promise<Record<AdPlatform, AdsSyncState>> {
  supabase ??= await createClient();
  const config = getConfigStatus();
  const [meta, google] = await Promise.all([getLastSync("meta", supabase), getLastSync("google", supabase)]);
  const state = (configured: boolean, last: LastSync): AdsSyncState => ({
    configured,
    at: last?.at ?? null,
    ok: last?.ok ?? true,
    message: last?.message ?? null,
  });
  return { meta: state(config.meta, meta), google: state(config.google, google) };
}

/** Statut de configuration des API (variables d'environnement serveur). */
export function getConfigStatus(): ConfigStatus {
  return { meta: isMetaConfigured(), google: isGoogleConfigured() };
}

/** Filtre plateforme : Meta par défaut, « all » pour tout voir. */
export function parsePlatformFilter(v: string | undefined): PlatformFilter {
  return v === "google" || v === "all" ? v : "meta";
}

async function loadPeriod(
  range: DateRange,
): Promise<{ raw: RawAdsData; clients: ClientIndex; error: string | null }> {
  const supabase = await createClient();
  try {
    const [raw, clients] = await Promise.all([fetchRaw(supabase, range), fetchClientIndex(supabase)]);
    return { raw, clients, error: null };
  } catch (e) {
    return {
      raw: { sessions: [], events: [], leads: [], metrics: [] },
      clients: emptyClientIndex(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function getAdsOverview(params: {
  period?: string;
  from?: string;
  to?: string;
  platform?: string;
}): Promise<AdsOverview & { periodKey: string; platform: PlatformFilter; error: string | null }> {
  const { key, range } = resolveRange(params);
  const platform = parsePlatformFilter(params.platform);
  const { raw, clients, error } = await loadPeriod(range);
  const cur = analyze(raw, clients, { range, platform });
  return {
    periodKey: key,
    platform,
    error,
    range,
    totals: cur.totals,
    avgCpl: averageCpl(cur.totals.spend, cur.totals.leads),
    ads: cur.ads,
  };
}

export async function getAdDetail(params: {
  platform: AdPlatform;
  adId: string;
  period?: string;
  from?: string;
  to?: string;
}): Promise<AdDetail & { periodKey: string; error: string | null }> {
  const { key, range } = resolveRange(params);
  const k = adKey(params.platform, params.adId);
  const { raw, clients, error } = await loadPeriod(range);
  // Toute la plateforme (CPL moyen, chiffres de la pub), puis cette pub seule (jour par jour, leads)
  const all = analyze(raw, clients, { range, platform: params.platform });
  const one = analyze(raw, clients, { range, platform: params.platform, adKey: k });
  return {
    periodKey: key,
    error,
    range,
    ad: all.ads.find((a) => a.key === k) ?? null,
    avgCpl: averageCpl(all.totals.spend, all.totals.leads),
    daily: one.daily,
    leads: one.leads,
  };
}

/**
 * Couverture du suivi sur la période : formulaires reçus sur le site (table
 * soumissions, sans politique pour « authenticated » : compte lu par la
 * fonction SQL soumissions_count), formulaires rattachés à une pub, début du suivi des
 * sources, et conversions comptées par les plateformes elles-mêmes.
 */
export async function getTrackingCoverage(params: {
  range: DateRange;
  platform: PlatformFilter;
  attributedLeads: number;
}): Promise<TrackingCoverage> {
  const { range, platform } = params;
  const supabase = await createClient();
  const startIso = torontoStartUtc(range.from);
  const endIso = torontoStartUtc(addDays(range.to, 1));

  // Fonction SQL qui ne renvoie que le compte (admin connecté) : null si illisible
  const forms = await supabase.rpc("soumissions_count", { p_from: startIso, p_to: endIso });
  const siteForms = !forms.error && typeof forms.data === "number" ? forms.data : null;

  const [first, conv] = await Promise.all([
    supabase.from("ad_sessions").select("created_at").order("created_at", { ascending: true }).limit(1),
    (() => {
      let q = supabase.from("ad_metrics_daily").select("platform_leads").gte("date", range.from).lte("date", range.to);
      if (platform !== "all") q = q.eq("platform", platform);
      return q.limit(10000);
    })(),
  ]);

  const trackingSince = first.data?.[0]?.created_at ? torontoDay(first.data[0].created_at as string) : null;
  const platformConversions = conv.error
    ? null
    : (conv.data ?? []).reduce((s, r) => s + num((r as { platform_leads: number | string | null }).platform_leads), 0);

  return { siteForms, attributedLeads: params.attributedLeads, trackingSince, platformConversions };
}
