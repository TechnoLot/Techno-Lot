import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchGoogleInsights, isGoogleConfigured } from "./google";
import { fetchMetaInsights, isMetaConfigured, type AdMetricRow } from "./meta";

export { isGoogleConfigured, isMetaConfigured };

export type SyncResult = {
  platform: "meta" | "google";
  ok: boolean;
  rows: number;
  message: string;
};

const TZ = "America/Toronto";
const BATCH = 500;

/** Date AAAA-MM-JJ en fuseau America/Toronto, décalée de `offsetDays` jours. */
function torontoDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

async function syncOne(
  platform: "meta" | "google",
  fetcher: (r: { since: string; until: string }) => Promise<AdMetricRow[]>,
  range: { since: string; until: string },
  supabase: SupabaseClient,
): Promise<SyncResult> {
  let result: SyncResult;
  try {
    const rows = await fetcher(range);
    const syncedAt = new Date().toISOString();
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows
        .slice(i, i + BATCH)
        .map((r) => ({ ...r, synced_at: syncedAt }));
      const { error } = await supabase
        .from("ad_metrics_daily")
        .upsert(chunk, { onConflict: "platform,date,ad_id,publisher" });
      if (error) throw new Error(`Écriture Supabase échouée : ${error.message}`);
    }
    result = {
      platform,
      ok: true,
      rows: rows.length,
      message: `${rows.length} ligne(s) synchronisée(s) du ${range.since} au ${range.until}.`,
    };
  } catch (e) {
    result = {
      platform,
      ok: false,
      rows: 0,
      message: e instanceof Error ? e.message : "Erreur inconnue.",
    };
  }
  // Journal : ne doit jamais faire échouer la synchronisation
  try {
    await supabase.from("ad_sync_runs").insert({
      platform,
      ok: result.ok,
      rows_upserted: result.rows,
      message: result.message.slice(0, 1000),
    });
  } catch {
    // ignoré
  }
  return result;
}

export async function syncAds({
  days = 30,
  supabase,
}: {
  days?: number;
  supabase: SupabaseClient;
}): Promise<SyncResult[]> {
  const n = Math.min(Math.max(Math.floor(days) || 30, 1), 365);
  const range = { since: torontoDate(-(n - 1)), until: torontoDate(0) };
  const results: SyncResult[] = [];
  if (isMetaConfigured()) {
    results.push(await syncOne("meta", fetchMetaInsights, range, supabase));
  }
  if (isGoogleConfigured()) {
    results.push(await syncOne("google", fetchGoogleInsights, range, supabase));
  }
  return results;
}

/** Synchro « en direct » : pas plus d'une toutes les 50 s, toutes sources confondues. */
export const LIVE_MIN_INTERVAL_MS = 50_000;
/** Jours resynchronisés à chaque passage en direct (aujourd'hui et hier). */
export const LIVE_DAYS = 2;

/** Date ISO de la dernière tentative de synchro pub (null : jamais). */
export async function getLastAdsRunAt(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("ad_sync_runs")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.created_at as string | undefined) ?? null;
}

/** Vrai si la dernière synchro pub a moins de LIVE_MIN_INTERVAL_MS. */
export async function adsSyncedRecently(supabase: SupabaseClient): Promise<boolean> {
  const at = await getLastAdsRunAt(supabase);
  return Boolean(at && Date.now() - new Date(at).getTime() < LIVE_MIN_INTERVAL_MS);
}

/** Dernière tentative de synchro par plateforme (ISO, null : jamais). */
export async function getLastAdsRunsByPlatform(
  supabase: SupabaseClient,
): Promise<Record<"meta" | "google", string | null>> {
  const one = async (platform: "meta" | "google") => {
    const { data } = await supabase
      .from("ad_sync_runs")
      .select("created_at")
      .eq("platform", platform)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.created_at as string | undefined) ?? null;
  };
  const [meta, google] = await Promise.all([one("meta"), one("google")]);
  return { meta, google };
}
