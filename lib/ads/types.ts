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
  id: string;
  created_at: string;
  purchased_at: string | null; // date "YYYY-MM-DD"
  client_email: string | null;
  client_phone: string | null;
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
  /** Ce lead a amené un client : lot acheté/vendu à son courriel ou téléphone, après le lead */
  converted: boolean;
  /** Profit des lots vendus rattachés à ce lead (null si rien de vendu) */
  profit: number | null;
};

/** Ce que le suivi voit vraiment, pour ne pas confondre « 0 lead » et « suivi absent ». */
export type TrackingCoverage = {
  /** Formulaires reçus sur le site pendant la période (null si la table n'est pas lisible) */
  siteForms: number | null;
  /** Formulaires rattachés à une pub (filtre de plateforme appliqué) */
  attributedLeads: number;
  /** Premier jour où le site a enregistré une visite suivie (null : jamais) */
  trackingSince: string | null;
  /** Conversions comptées par Google / Meta sur la période (null si illisible) */
  platformConversions: number | null;
};

export type ConfigStatus = { meta: boolean; google: boolean };

export type LastSync = { at: string; ok: boolean; platform: string; message: string | null } | null;

/** État de la synchro automatique d'une plateforme (pastille « Synchro auto »). */
export type AdsSyncState = {
  configured: boolean;
  /** Dernière tentative (ISO), null : jamais */
  at: string | null;
  ok: boolean;
  message: string | null;
};

export type AdsOverview = {
  range: DateRange;
  totals: Totals;
  /** CPL moyen de la période (dépenses ÷ leads), null sans lead ou sans dépense */
  avgCpl: number | null;
  ads: AdSummary[];
};

export type AdDetail = {
  range: DateRange;
  ad: AdSummary | null;
  /** CPL moyen de la plateforme sur la période, pour le verdict */
  avgCpl: number | null;
  daily: DailyPoint[];
  leads: LeadItem[];
};
