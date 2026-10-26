import { createClient } from "@/lib/supabase/server";
import { isGoogleConfigured, isMetaConfigured } from "@/lib/ads/sync";
import {
  ADS_PERIODS,
  NO_ID,
  type AdDetail,
  type AdPlatform,
  type AdsOverview,
  type AdSummary,
  type BreakdownItem,
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
  if (s.includes("messenger")) return "messenger";
  if (s.includes("audience")) return "audience_network";
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

export const SOURCE_LABELS: Record<SessionPlatform, string> = {
  meta: "Meta (Facebook / Instagram)",
  google: "Google Ads",
  organic: "Organique",
  referral: "Sites référents",
  direct: "Direct",
  email: "Courriel",
  other: "Autre",
};

export const DEVICE_LABELS: Record<string, string> = {
  mobile: "Mobile",
  tablet: "Tablette",
  desktop: "Ordinateur",
  inconnu: "Inconnu",
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

export type ClientIndex = Map<string, { profit: number | null }>;

/** courriel (minuscules) → profit cumulé des lots vendus (null si rien vendu). */
export function buildClientIndex(lots: LotRow[]): ClientIndex {
  const idx: ClientIndex = new Map();
  for (const l of lots) {
    const email = clean(l.client_email)?.toLowerCase();
    if (!email) continue;
    const cur = idx.get(email) ?? { profit: null };
    if (l.sale_price != null) {
      cur.profit = (cur.profit ?? 0) + num(l.sale_price) - num(l.purchase_price);
    }
    idx.set(email, cur);
  }
  return idx;
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
  clientEmails: Set<string>;
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
    clientEmails: new Set(),
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

function bump(map: Map<string, BreakdownItem>, key: string, label: string, f: Partial<BreakdownItem>) {
  const cur = map.get(key) ?? { key, label, visits: 0, leads: 0, spend: 0 };
  cur.visits += f.visits ?? 0;
  cur.leads += f.leads ?? 0;
  cur.spend += f.spend ?? 0;
  map.set(key, cur);
}

function sortBreakdown(map: Map<string, BreakdownItem>): BreakdownItem[] {
  return Array.from(map.values()).sort(
    (a, b) => b.visits - a.visits || b.leads - a.leads || b.spend - a.spend,
  );
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
  bySource: BreakdownItem[];
  byPublisher: BreakdownItem[];
  byDevice: BreakdownItem[];
  leads: LeadItem[];
  bestAdKey: string | null;
};

/**
 * Agrège les données brutes d'une période. Pure : aucune I/O, testable
 * avec des fixtures. Les totaux / funnel ne comptent que le payant
 * (Meta + Google) ; la répartition par source inclut organique, direct…
 */
export function analyze(raw: RawAdsData, clients: ClientIndex, opts: AnalyzeOptions): Analysis {
  const { range, platform: filter, adKey: onlyKey } = opts;
  const metrics = dedupeMetrics(raw.metrics);
  const nameIndex = buildNameIndex(metrics);
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

  const bySource = new Map<string, BreakdownItem>();
  const byPublisher = new Map<string, BreakdownItem>();
  const byDevice = new Map<string, BreakdownItem>();

  /* --- Métriques plateformes ------------------------------------- */
  for (const m of metrics) {
    const p = normPlatform(m.platform);
    if (!keep(p)) continue;
    const id = clean(m.ad_id) ?? clean(m.ad_name) ?? clean(m.campaign_id) ?? NO_ID;
    const k = adKey(p, id);
    const spend = num(m.spend);
    const clicks = num(m.link_clicks) > 0 ? num(m.link_clicks) : num(m.clicks);
    if (onlyKey === undefined || onlyKey === k) {
      const a = accFor(p, id);
      a.name = a.name ?? clean(m.ad_name);
      a.campaign = a.campaign ?? clean(m.campaign_name);
      a.spend += spend;
      a.impressions += num(m.impressions);
      a.clicks += clicks;
      const pub = (m.publisher ?? "all").toLowerCase();
      if (pub !== "all") a.publishers.add(pub);
      const dp = daily.get(m.date);
      if (dp) {
        dp.spend += spend;
        dp.clicks += clicks;
      }
      if (pub !== "all") {
        const pk = publisherOf(p, pub, null);
        bump(byPublisher, pk, PUBLISHER_LABELS[pk] ?? pub, { spend });
      }
    }
    if (!onlyKey) bump(bySource, p, SOURCE_LABELS[p], { spend });
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
    const device = (s.device ?? "inconnu").toLowerCase();
    if (!onlyKey) bump(bySource, p, SOURCE_LABELS[p], { visits: 1 });
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
    const pub = publisherOf(p, s.placement, s.utm_source);
    a.publishers.add(pub);
    const ev = sessionEvents.get(s.id);
    if (ev?.has("form_view")) a.formViews += 1;
    if (ev?.has("form_start")) a.formStarts += 1;
    const dp = daily.get(torontoDay(s.created_at));
    if (dp) dp.visits += 1;
    bump(byPublisher, pub, PUBLISHER_LABELS[pub] ?? pub, { visits: 1 });
    bump(byDevice, device, DEVICE_LABELS[device] ?? device, { visits: 1 });
  }

  /* --- Leads ---------------------------------------------------- */
  type PendingLead = { row: LeadRow; platform: SessionPlatform; key: string | null };
  const pending: PendingLead[] = [];
  for (const l of raw.leads) {
    const session = l.session_id ? sessionById.get(l.session_id) : undefined;
    const p = normPlatform(l.platform ?? session?.platform);
    if (!onlyKey) bump(bySource, p, SOURCE_LABELS[p], { leads: 1 });
    if (!keep(p)) continue;
    const hasOwnId = clean(l.ad_id) || clean(l.utm_content) || clean(l.utm_campaign);
    const id = hasOwnId
      ? resolveAdId(p, l, nameIndex)
      : session && sessionKey.get(session.id)
        ? (sessionKey.get(session.id) as string).slice(p.length + 1)
        : NO_ID;
    const k = adKey(p, id);
    if (!inScope(k)) continue;
    const a = accFor(p, id);
    a.fallbackName = a.fallbackName ?? clean(l.utm_content);
    a.campaign = a.campaign ?? clean(l.utm_campaign);
    a.leads += 1;
    const email = clean(l.courriel)?.toLowerCase();
    const client = email ? clients.get(email) : undefined;
    if (email && client && !a.clientEmails.has(email)) {
      a.clientEmails.add(email);
      a.profit += client.profit ?? 0;
    }
    const dp = daily.get(torontoDay(l.created_at));
    if (dp) dp.leads += 1;
    const pub = publisherOf(p, l.placement ?? session?.placement ?? null, l.utm_source ?? session?.utm_source ?? null);
    bump(byPublisher, pub, PUBLISHER_LABELS[pub] ?? pub, { leads: 1 });
    const device = (session?.device ?? "inconnu").toLowerCase();
    bump(byDevice, device, DEVICE_LABELS[device] ?? device, { leads: 1 });
    pending.push({ row: l, platform: p, key: k });
  }

  /* --- Résumés par pub ------------------------------------------ */
  const ads: AdSummary[] = [];
  const total = { ...emptyTotals() };
  const allClients = new Set<string>();
  for (const [k, a] of Array.from(accs.entries())) {
    if (!inScope(k)) continue;
    const t = finalizeTotals({
      impressions: a.impressions,
      clicks: a.clicks,
      visits: a.visits,
      formViews: a.formViews,
      formStarts: a.formStarts,
      leads: a.leads,
      clients: a.clientEmails.size,
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
    total.spend += t.spend;
    for (const e of Array.from(a.clientEmails)) {
      if (!allClients.has(e)) {
        allClients.add(e);
        total.profit += clients.get(e)?.profit ?? 0;
      }
    }
  }
  total.clients = allClients.size;
  ads.sort((x, y) => y.leads - x.leads || y.spend - x.spend || y.visits - x.visits);

  let bestAdKey: string | null = null;
  let bestCpl = Infinity;
  for (const a of ads) {
    if (a.leads >= 2 && a.cpl != null && a.cpl < bestCpl) {
      bestCpl = a.cpl;
      bestAdKey = a.key;
    }
  }

  const byKey = new Map(ads.map((a) => [a.key, a]));
  const leads: LeadItem[] = pending
    .map(({ row, platform, key }) => {
      const email = clean(row.courriel);
      const client = email ? clients.get(email.toLowerCase()) : undefined;
      const ad = key ? byKey.get(key) : undefined;
      return {
        id: row.id,
        createdAt: row.created_at,
        nom: clean(row.nom) ?? "Sans nom",
        courriel: email,
        telephone: clean(row.telephone),
        platform,
        adKey: key,
        adName: ad?.name ?? null,
        adHref: ad?.href ?? null,
        placement: row.placement ?? null,
        converted: Boolean(client),
        profit: client?.profit ?? null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    totals: finalizeTotals(total),
    ads,
    daily: Array.from(daily.values()),
    bySource: sortBreakdown(bySource),
    byPublisher: sortBreakdown(byPublisher),
    byDevice: sortBreakdown(byDevice),
    leads,
    bestAdKey,
  };
}

/* ================================================================== */
/* Accès Supabase                                                      */
/* ================================================================== */

type Supa = ReturnType<typeof createClient>;
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

export async function fetchClientIndex(supabase: Supa): Promise<ClientIndex> {
  const lots = await fetchPaged<LotRow>((a, b) =>
    supabase
      .from("lots")
      .select("client_email, purchase_price, sale_price, status")
      .not("client_email", "is", null)
      .order("id", { ascending: true })
      .range(a, b),
  );
  return buildClientIndex(lots);
}

export async function getLastSync(supabase: Supa = createClient()): Promise<LastSync> {
  const { data } = await supabase
    .from("ad_sync_runs")
    .select("created_at, platform, ok, rows_upserted, message")
    .order("created_at", { ascending: false })
    .limit(1);
  const row = (data?.[0] ?? null) as SyncRunRow | null;
  return row
    ? { at: row.created_at, ok: row.ok, platform: row.platform, message: row.message }
    : null;
}

/** Statut de configuration des API (variables d'environnement serveur). */
export function getConfigStatus(): ConfigStatus {
  return { meta: isMetaConfigured(), google: isGoogleConfigured() };
}

export function parsePlatformFilter(v: string | undefined): PlatformFilter {
  return v === "meta" || v === "google" ? v : "all";
}

export async function getAdsOverview(params: {
  period?: string;
  from?: string;
  to?: string;
  platform?: string;
}): Promise<AdsOverview & { periodKey: string; platform: PlatformFilter; bestAdKey: string | null; error: string | null }> {
  const supabase = createClient();
  const { key, range, prevRange } = resolveRange(params);
  const platform = parsePlatformFilter(params.platform);
  let error: string | null = null;
  let raw: RawAdsData = { sessions: [], events: [], leads: [], metrics: [] };
  let prevRaw: RawAdsData = raw;
  let clients: ClientIndex = new Map();
  try {
    [raw, prevRaw, clients] = await Promise.all([
      fetchRaw(supabase, range),
      fetchRaw(supabase, prevRange),
      fetchClientIndex(supabase),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const cur = analyze(raw, clients, { range, platform });
  const prev = analyze(prevRaw, clients, { range: prevRange, platform });
  return {
    periodKey: key,
    platform,
    error,
    range,
    prevRange,
    totals: cur.totals,
    prevTotals: prev.totals,
    daily: cur.daily,
    ads: cur.ads,
    bestAdKey: cur.bestAdKey,
    bySource: cur.bySource,
    byPublisher: cur.byPublisher,
    byDevice: cur.byDevice,
    recentLeads: cur.leads.slice(0, 8),
    hasAnyData:
      raw.sessions.length + raw.leads.length + raw.metrics.length > 0 ||
      prevRaw.sessions.length + prevRaw.leads.length + prevRaw.metrics.length > 0,
  };
}

export async function getAdDetail(params: {
  platform: AdPlatform;
  adId: string;
  period?: string;
  from?: string;
  to?: string;
}): Promise<AdDetail & { periodKey: string; error: string | null }> {
  const supabase = createClient();
  const { key, range, prevRange } = resolveRange(params);
  const k = adKey(params.platform, params.adId);
  let error: string | null = null;
  let raw: RawAdsData = { sessions: [], events: [], leads: [], metrics: [] };
  let prevRaw: RawAdsData = raw;
  let clients: ClientIndex = new Map();
  try {
    [raw, prevRaw, clients] = await Promise.all([
      fetchRaw(supabase, range),
      fetchRaw(supabase, prevRange),
      fetchClientIndex(supabase),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const cur = analyze(raw, clients, { range, platform: params.platform, adKey: k });
  const prev = analyze(prevRaw, clients, { range: prevRange, platform: params.platform, adKey: k });
  return {
    periodKey: key,
    error,
    range,
    prevRange,
    ad: cur.ads[0] ?? null,
    prevTotals: prev.totals,
    daily: cur.daily,
    leads: cur.leads,
    byPublisher: cur.byPublisher,
    byDevice: cur.byDevice,
  };
}
