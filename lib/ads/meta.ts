/**
 * Récupération des statistiques publicitaires Meta (Facebook + Instagram)
 * via la Graph API. Niveau annonce, une ligne par jour et par placement.
 */

import { ErreurAffichable } from "@/lib/admin/erreur-affichable";

const GRAPH_VERSION = "v21.0";
/** Seul hôte que la synchro Meta appelle. */
const HOTE_GRAPH = "graph.facebook.com";

export type AdMetricRow = {
  platform: "meta" | "google";
  date: string;
  account_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string;
  ad_name: string | null;
  publisher: string;
  impressions: number;
  reach: number;
  clicks: number;
  link_clicks: number;
  spend: number;
  platform_leads: number;
  currency: string | null;
};

type MetaAction = { action_type: string; value: string };

type MetaInsight = {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  spend?: string;
  actions?: MetaAction[];
  account_currency?: string;
  date_start?: string;
  publisher_platform?: string;
};

type MetaPage = {
  data?: MetaInsight[];
  paging?: { next?: string };
  error?: { message?: string; code?: number };
};

export function getMetaAccountId(): string | null {
  const raw = process.env.META_AD_ACCOUNT_ID?.trim();
  if (!raw) return null;
  return raw.replace(/^act_/, "");
}

export function isMetaConfigured(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN?.trim() && getMetaAccountId());
}

function metaErrorMessage(
  err: NonNullable<MetaPage["error"]>,
  status: number,
): string {
  const code = err.code;
  if (code === 190) {
    return "Jeton Meta expiré ou invalide (code 190). Génère un nouveau jeton d'utilisateur système et mets à jour META_ACCESS_TOKEN.";
  }
  if (code === 10 || (code !== undefined && code >= 200 && code <= 299)) {
    return `Permissions Meta insuffisantes (code ${code}). Le jeton doit avoir la permission ads_read et l'utilisateur système doit avoir accès au compte publicitaire.`;
  }
  if (
    code === 4 ||
    code === 17 ||
    code === 32 ||
    code === 613 ||
    status === 429
  ) {
    return "Limite de requêtes Meta atteinte. Réessaie dans quelques minutes.";
  }
  // Message brut de Meta : au journal seulement (detail de ErreurAffichable).
  return `Erreur Meta${code ? ` (code ${code})` : ""}.`;
}

/** Prospects : 'lead' s'il existe, sinon le max des autres types (évite le double compte). */
function countLeads(actions: MetaAction[] | undefined): number {
  if (!actions) return 0;
  const val = (type: string) => {
    const a = actions.find((x) => x.action_type === type);
    return a ? Number(a.value) || 0 : 0;
  };
  if (actions.some((x) => x.action_type === "lead")) return val("lead");
  return Math.max(
    val("onsite_conversion.lead_grouped"),
    val("offsite_conversion.fb_pixel_lead"),
  );
}

export async function fetchMetaInsights(range: {
  since: string;
  until: string;
}): Promise<AdMetricRow[]> {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const accountId = getMetaAccountId();
  if (!token || !accountId) {
    throw new ErreurAffichable(
      "Meta n'est pas configuré (META_ACCESS_TOKEN / META_AD_ACCOUNT_ID).",
    );
  }

  const params = new URLSearchParams({
    level: "ad",
    time_increment: "1",
    breakdowns: "publisher_platform",
    fields:
      "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,reach,clicks,inline_link_clicks,spend,actions,account_currency,date_start",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    limit: "500",
  });

  // Jeton dans l'en-tête Authorization (jamais dans l'URL : évite sa présence
  // dans d'éventuels journaux de requêtes).
  let url: string | null = `https://${HOTE_GRAPH}/${GRAPH_VERSION}/act_${accountId}/insights?${params.toString()}`;
  const rows: AdMetricRow[] = [];
  let pages = 0;

  while (url && pages < 200) {
    pages += 1;
    let res: Response;
    try {
      res = await fetch(url, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new ErreurAffichable("Impossible de joindre l'API Meta (erreur réseau).");
    }
    const json = (await res.json().catch(() => ({}))) as MetaPage;
    if (!res.ok || json.error) {
      throw new ErreurAffichable(
        json.error
          ? metaErrorMessage(json.error, res.status)
          : `Erreur Meta HTTP ${res.status}.`,
        json.error ?? { statut: res.status },
      );
    }
    for (const r of json.data ?? []) {
      if (!r.ad_id || !r.date_start) continue;
      rows.push({
        platform: "meta",
        date: r.date_start,
        account_id: accountId,
        campaign_id: r.campaign_id ?? null,
        campaign_name: r.campaign_name ?? null,
        adset_id: r.adset_id ?? null,
        adset_name: r.adset_name ?? null,
        ad_id: r.ad_id,
        ad_name: r.ad_name ?? null,
        publisher: r.publisher_platform || "all",
        impressions: Number(r.impressions) || 0,
        reach: Number(r.reach) || 0,
        clicks: Number(r.clicks) || 0,
        link_clicks: Number(r.inline_link_clicks) || 0,
        spend: Number(r.spend) || 0,
        platform_leads: countLeads(r.actions),
        currency: r.account_currency ?? null,
      });
    }
    const suivante = json.paging?.next;
    url = suivante ? pageSuivanteMeta(suivante) : null;
    if (suivante && !url) {
      // Réponse inattendue : on n'appelle jamais un autre hôte que l'API Graph.
      // Seuls le protocole et l'hôte vont au journal (jamais l'URL complète).
      let origine = "illisible";
      try {
        const u = new URL(String(suivante));
        origine = `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`;
      } catch {
        // URL illisible.
      }
      console.warn(
        `[ads/meta] Pagination arrêtée : page suivante hors de https://${HOTE_GRAPH} (${origine.slice(0, 100)}). Données partielles (${rows.length} lignes).`,
      );
    }
  }
  return rows;
}

/**
 * URL de la page suivante (`paging.next`) à suivre, ou null si elle ne pointe
 * pas EXACTEMENT vers https://graph.facebook.com (port par défaut, sans
 * identifiants). Un éventuel `access_token` renvoyé par Meta dans l'URL est
 * retiré : le jeton passe toujours par l'en-tête Authorization.
 */
export function pageSuivanteMeta(next: unknown): string | null {
  if (typeof next !== "string" || next.length === 0 || next.length > 8000) return null;
  let u: URL;
  try {
    u = new URL(next);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== HOTE_GRAPH) return null;
  if (u.port !== "" || u.username !== "" || u.password !== "") return null;
  u.searchParams.delete("access_token");
  return u.toString();
}

/** Présence (jamais la valeur) de chaque variable Meta, pour l'écran de connexion. */
export function getMetaEnvStatus(): { token: boolean; account: boolean } {
  return {
    token: Boolean(process.env.META_ACCESS_TOKEN?.trim()),
    account: Boolean(getMetaAccountId()),
  };
}
