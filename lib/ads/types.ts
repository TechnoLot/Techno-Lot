/**
 * Types de la section « Publicités » du dashboard admin.
 * Les lignes brutes reflètent les tables Supabase ad_* (colonnes utiles
 * seulement) ; les types agrégés sont produits par lib/ads/queries.ts.
 */

export type AdPlatform = "meta" | "google";
export type SessionPlatform =
  | AdPlatform
  | "organic"
  | "referral"
  | "direct"
  | "email"
  | "other";
export type PlatformFilter = "all" | AdPlatform;
export type AdsPeriodKey = "7d" | "30d" | "90d" | "custom";

export const ADS_PERIODS: { key: Exclude<AdsPeriodKey, "custom">; label: string; days: number }[] = [
  { key: "7d", label: "7 jours", days: 7 },
  { key: "30d", label: "30 jours", days: 30 },
  { key: "90d", label: "90 jours", days: 90 },
];

export const NO_ID = "(sans identifiant)";

/* ------------------------------------------------------------------ */
/* Lignes brutes                                                       */
/* ------------------------------------------------------------------ */

export type SessionRow = {
  id: string;
  created_at: string;
  platform: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  campaign_id: string | null;
  ad_id: string | null;
  placement: string | null;
  device: string | null;
};

export type EventRow = {
  session_id: string | null;
  type: string;
};

export type LeadRow = {
  id: string;
  created_at: string;
  session_id: string | null;
  nom: string | null;
  courriel: string | null;
  telephone: string | null;
  platform: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  campaign_id: string | null;
  ad_id: string | null;
  placement: string | null;
};

export type MetricRow = {
  platform: string;
  date: string; // YYYY-MM-DD
  campaign_id: string | null;
  campaign_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  publisher: string | null;
  impressions: number | string | null;
  clicks: number | string | null;
  link_clicks: number | string | null;
  spend: number | string | null;
};

export type LotRow = {
  client_email: string | null;
  purchase_price: number | string | null;
  sale_price: number | string | null;
  status: string | null;
};

export type SyncRunRow = {
  created_at: string;
  platform: string;
  ok: boolean;
  rows_upserted: number | null;
  message: string | null;
};

export type RawAdsData = {
  sessions: SessionRow[];
  events: EventRow[];
  leads: LeadRow[];
  metrics: MetricRow[];
};

/* ------------------------------------------------------------------ */
/* Agrégats                                                            */
/* ------------------------------------------------------------------ */

export type DateRange = {
  from: string; // YYYY-MM-DD (inclus, fuseau America/Toronto)
  to: string; // YYYY-MM-DD (inclus)
  days: number;
};

export type Funnel = {
  impressions: number;
  clicks: number;
  visits: number;
  formViews: number;
  formStarts: number;
  leads: number;
  clients: number;
};

export type Totals = Funnel & {
  spend: number;
  ctr: number | null; // 0..1
  cpl: number | null;
  convRate: number | null; // visite → lead, 0..1
  profit: number;
};

export type AdSummary = Totals & {
  key: string; // `${platform}:${id}`
  platform: AdPlatform;
  adId: string;
  name: string;
  campaign: string | null;
  publishers: string[]; // facebook, instagram…
  href: string;
};

export type DailyPoint = {
  day: string;
  spend: number;
  leads: number;
  visits: number;
  clicks: number;
};

export type BreakdownItem = {
  key: string;
  label: string;
  visits: number;
  leads: number;
  spend: number;
};

export type LeadItem = {
  id: string;
  createdAt: string;
  nom: string;
  courriel: string | null;
  telephone: string | null;
  platform: SessionPlatform;
  adKey: string | null;
  adName: string | null;
  adHref: string | null;
  placement: string | null;
  converted: boolean;
  profit: number | null;
};

export type ConfigStatus = { meta: boolean; google: boolean };

export type LastSync = { at: string; ok: boolean; platform: string; message: string | null } | null;

export type AdsOverview = {
  range: DateRange;
  prevRange: DateRange;
  totals: Totals;
  prevTotals: Totals;
  daily: DailyPoint[];
  ads: AdSummary[];
  bySource: BreakdownItem[];
  byPublisher: BreakdownItem[];
  byDevice: BreakdownItem[];
  recentLeads: LeadItem[];
  hasAnyData: boolean;
};

export type AdDetail = {
  range: DateRange;
  prevRange: DateRange;
  ad: AdSummary | null;
  prevTotals: Totals;
  daily: DailyPoint[];
  leads: LeadItem[];
  byPublisher: BreakdownItem[];
  byDevice: BreakdownItem[];
};
