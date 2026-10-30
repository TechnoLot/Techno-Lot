/**
 * Récupération des statistiques Google Ads via l'API REST (v26, searchStream).
 * Un « adset » correspond à un groupe d'annonces (ad_group).
 *
 * Authentification : compte de service Google Cloud (méthode actuelle de Google,
 * sans developer token) via GOOGLE_ADS_SERVICE_ACCOUNT_JSON, ou l'ancien trio
 * OAuth (client ID / secret / refresh token) + developer token.
 */
import { createSign } from "crypto";
import type { AdMetricRow } from "./meta";
import { ErreurAffichable } from "@/lib/admin/erreur-affichable";

const API_VERSION = "v26";
const ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords";

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };

/** Clé JSON du compte de service : contenu brut du fichier ou encodé en base64. */
function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_ADS_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  for (const text of [raw, Buffer.from(raw, "base64").toString("utf8")]) {
    try {
      const json = JSON.parse(text) as Partial<ServiceAccount>;
      if (json.client_email && json.private_key) return json as ServiceAccount;
    } catch {
      // essaie le format suivant
    }
  }
  return null;
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

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

async function postToken(url: string, body: URLSearchParams): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch {
    throw new ErreurAffichable("Impossible de joindre Google OAuth (erreur réseau).");
  }
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    if (json.error === "invalid_grant") {
      throw new ErreurAffichable(
        "Identifiants Google refusés (invalid_grant) : clé du compte de service supprimée, ou refresh token expiré/révoqué.",
      );
    }
    // Description brute de Google : au journal seulement.
    throw new ErreurAffichable(`Authentification Google refusée (${res.status}).`, {
      error: json.error,
      error_description: json.error_description,
    });
  }
  return json.access_token;
}

/** Jeton d'accès signé avec la clé du compte de service (JWT RS256). */
async function getServiceAccountToken(sa: ServiceAccount): Promise<string> {
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
    JSON.stringify({ iss: sa.client_email, scope: ADWORDS_SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }),
  )}`;
  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  } catch {
    throw new ErreurAffichable("Clé privée du compte de service Google illisible (GOOGLE_ADS_SERVICE_ACCOUNT_JSON).");
  }
  return postToken(
    tokenUri,
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  );
}

async function getAccessToken(): Promise<string> {
  const sa = getServiceAccount();
  if (sa) return getServiceAccountToken(sa);
  return postToken(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  );
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
