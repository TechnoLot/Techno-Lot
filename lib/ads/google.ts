/**
 * Récupération des statistiques Google Ads via l'API REST (v18, searchStream).
 * Un « adset » correspond à un groupe d'annonces (ad_group).
 */
import type { AdMetricRow } from "./meta";

const API_VERSION = "v18";

export function getGoogleCustomerId(): string | null {
  const raw = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, "").trim();
  return raw || null;
}

export function isGoogleConfigured(): boolean {
  const e = process.env;
  return Boolean(
    e.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() &&
      e.GOOGLE_ADS_CLIENT_ID?.trim() &&
      e.GOOGLE_ADS_CLIENT_SECRET?.trim() &&
      e.GOOGLE_ADS_REFRESH_TOKEN?.trim() &&
      getGoogleCustomerId(),
  );
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "",
    grant_type: "refresh_token",
  });
  let res: Response;
  try {
    res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch {
    throw new Error("Impossible de joindre Google OAuth (erreur réseau).");
  }
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    if (json.error === "invalid_grant") {
      throw new Error(
        "Jeton d'actualisation Google expiré ou révoqué (invalid_grant). Génère un nouveau refresh token.",
      );
    }
    throw new Error(
      `Authentification Google refusée : ${json.error_description ?? json.error ?? res.status}`,
    );
  }
  return json.access_token;
}

type GoogleResult = {
  campaign?: { id?: string; name?: string };
  adGroup?: { id?: string; name?: string };
  adGroupAd?: { ad?: { id?: string; name?: string } };
  segments?: { date?: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
  };
  customer?: { currencyCode?: string };
};

type GoogleChunk = { results?: GoogleResult[] };

type GoogleError = {
  error?: {
    message?: string;
    details?: { errors?: { message?: string }[] }[];
  };
};

function googleErrorMessage(status: number, payload: unknown): string {
  const first = (Array.isArray(payload) ? payload[0] : payload) as
    | GoogleError
    | null
    | undefined;
  const err = first?.error;
  const detail = err?.details?.[0]?.errors?.[0]?.message ?? err?.message ?? "";
  if (status === 401) {
    return "Jeton Google Ads refusé (401). Vérifie le refresh token et le client OAuth.";
  }
  if (status === 403) {
    return `Accès Google Ads refusé (403) : vérifie le developer token (niveau d'accès), GOOGLE_ADS_LOGIN_CUSTOMER_ID et l'accès au compte. ${detail}`.trim();
  }
  if (status === 429) {
    return "Limite de requêtes Google Ads atteinte. Réessaie plus tard.";
  }
  return `Erreur Google Ads (${status}) : ${detail || "réponse inconnue"}`;
}

export async function fetchGoogleInsights(range: {
  since: string;
  until: string;
}): Promise<AdMetricRow[]> {
  const customerId = getGoogleCustomerId();
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (!customerId || !devToken) {
    throw new Error("Google Ads n'est pas configuré.");
  }
  const accessToken = await getAccessToken();

  const query = `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.name, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, customer.currency_code FROM ad_group_ad WHERE segments.date BETWEEN '${range.since}' AND '${range.until}'`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": devToken,
    "Content-Type": "application/json",
  };
  const login = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(
    /-/g,
    "",
  ).trim();
  if (login) headers["login-customer-id"] = login;

  let res: Response;
  try {
    res = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
        cache: "no-store",
      },
    );
  } catch {
    throw new Error("Impossible de joindre l'API Google Ads (erreur réseau).");
  }
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error(googleErrorMessage(res.status, payload));

  const chunks = (Array.isArray(payload) ? payload : []) as GoogleChunk[];
  const rows: AdMetricRow[] = [];
  for (const chunk of chunks) {
    for (const r of chunk.results ?? []) {
      const adId = r.adGroupAd?.ad?.id;
      const date = r.segments?.date;
      if (!adId || !date) continue;
      const clicks = Number(r.metrics?.clicks) || 0;
      rows.push({
        platform: "google",
        date,
        account_id: customerId,
        campaign_id: r.campaign?.id ?? null,
        campaign_name: r.campaign?.name ?? null,
        adset_id: r.adGroup?.id ?? null,
        adset_name: r.adGroup?.name ?? null,
        ad_id: adId,
        ad_name: r.adGroupAd?.ad?.name || `Annonce ${adId}`,
        publisher: "all",
        impressions: Number(r.metrics?.impressions) || 0,
        reach: 0,
        clicks,
        link_clicks: clicks,
        spend: (Number(r.metrics?.costMicros) || 0) / 1e6,
        platform_leads: Number(r.metrics?.conversions) || 0,
        currency: r.customer?.currencyCode ?? null,
      });
    }
  }
  return rows;
}
