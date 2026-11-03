/**
 * Récupération des statistiques Google Ads via l'API REST (v26, searchStream).
 * Un « adset » correspond à un groupe d'annonces (ad_group).
 *
 * Authentification : compte de service Google Cloud (méthode actuelle de Google,
 * sans developer token) via GOOGLE_ADS_SERVICE_ACCOUNT_JSON, ou l'ancien trio
 * OAuth (client ID / secret / refresh token) + developer token. Lecture de la
 * clé et jeton signé : lib/google/compte-service.ts (partagé avec Google Agenda).
 */
import type { AdMetricRow } from "./meta";
import { ErreurAffichable } from "@/lib/admin/erreur-affichable";
import { demanderJeton, jetonCompteService, lireCompteService, type CompteService } from "@/lib/google/compte-service";

const API_VERSION = "v26";
const ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords";

/** Clé JSON du compte de service : contenu brut du fichier ou encodé en base64. */
function getServiceAccount(): CompteService | null {
  return lireCompteService(process.env.GOOGLE_ADS_SERVICE_ACCOUNT_JSON);
}

export function getGoogleCustomerId(): string | null {
  const raw = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, "").trim();
  return raw || null;
}

export function isGoogleConfigured(): boolean {
  const e = process.env;
  const legacy = Boolean(
    e.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() &&
      e.GOOGLE_ADS_CLIENT_ID?.trim() &&
      e.GOOGLE_ADS_CLIENT_SECRET?.trim() &&
      e.GOOGLE_ADS_REFRESH_TOKEN?.trim(),
  );
  return Boolean((getServiceAccount() || legacy) && getGoogleCustomerId());
}

async function getAccessToken(): Promise<string> {
  const sa = getServiceAccount();
  if (sa) return jetonCompteService(sa, ADWORDS_SCOPE, "GOOGLE_ADS_SERVICE_ACCOUNT_JSON");
  const { jeton } = await demanderJeton(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  );
  return jeton;
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
    return "Jeton Google Ads refusé (401). Vérifie la clé du compte de service (ou le refresh token).";
  }
  if (status === 403) {
    return `Accès Google Ads refusé (403) : vérifie que l'API Google Ads est activée dans le projet Cloud (niveau Explorateur ou plus), que le compte de service est utilisateur du compte Google Ads, et GOOGLE_ADS_LOGIN_CUSTOMER_ID.`;
  }
  if (status === 429) {
    return "Limite de requêtes Google Ads atteinte. Réessaie plus tard.";
  }
  // Détail brut de Google : au journal seulement (detail de ErreurAffichable).
  return `Erreur Google Ads (${status}).`;
}

export async function fetchGoogleInsights(range: {
  since: string;
  until: string;
}): Promise<AdMetricRow[]> {
  const customerId = getGoogleCustomerId();
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (!customerId || !isGoogleConfigured()) {
    throw new ErreurAffichable("Google Ads n'est pas configuré.");
  }
  const accessToken = await getAccessToken();

  const query = `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.name, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, customer.currency_code FROM ad_group_ad WHERE segments.date BETWEEN '${range.since}' AND '${range.until}'`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  // Le compte de service n'en a pas besoin ; seulement l'ancienne méthode OAuth.
  if (devToken && !getServiceAccount()) headers["developer-token"] = devToken;
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
    throw new ErreurAffichable("Impossible de joindre l'API Google Ads (erreur réseau).");
  }
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ErreurAffichable(googleErrorMessage(res.status, payload), payload);

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
