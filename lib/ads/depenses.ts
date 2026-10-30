import { createClient } from "@/lib/supabase/server";
import { dedupeMetrics, getConfigStatus, num } from "@/lib/ads/queries";
import type { MetricRow } from "@/lib/ads/types";

export type AdSpend = {
  /** Au moins une plateforme (Meta ou Google) a ses clés */
  configured: boolean;
  /** Dépenses synchronisées sur la période, en $ */
  spend: number;
};

/**
 * Dépenses de pub de la période (ad_metrics_daily, remplie par la
 * synchronisation Meta / Google). Jours inclusifs « YYYY-MM-DD » à l'heure
 * de Toronto ; null = sans borne. Pour la tuile « Pubs » du tableau de bord :
 * ces dépenses ne sont pas retirées du profit (choix du client).
 */
export async function getAdSpend(from: string | null, to: string | null): Promise<AdSpend> {
  const status = getConfigStatus();
  const supabase = await createClient();
  let query = supabase
    .from("ad_metrics_daily")
    .select(
      "platform, date, campaign_id, campaign_name, ad_id, ad_name, publisher, impressions, clicks, link_clicks, spend",
    );
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const { data } = await query;
  const rows = dedupeMetrics((data ?? []) as MetricRow[]);
  const spend = rows.reduce((sum, r) => sum + num(r.spend), 0);
  return { configured: status.meta || status.google, spend: Math.round(spend * 100) / 100 };
}
