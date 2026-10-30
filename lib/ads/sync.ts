import type { SupabaseClient } from "@supabase/supabase-js";
import { avecRef, journaliserErreur } from "@/lib/admin/erreurs-admin";
import { ErreurAffichable, texteDetail } from "@/lib/admin/erreur-affichable";
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

/**
 * Message d'échec affiché (et gardé dans ad_sync_runs) : seulement nos messages
 * français (ErreurAffichable) ; le détail brut de Meta, Google ou Supabase va
 * au journal, et l'écran reçoit la référence (check 20).
 */
async function messageEchec(platform: "meta" | "google", e: unknown): Promise<string> {
  const nom = platform === "meta" ? "Meta" : "Google Ads";
  if (e instanceof ErreurAffichable && e.detail === undefined) return e.message;
  const message = e instanceof ErreurAffichable ? e.message : `Synchronisation ${nom} impossible.`;
  const detail = e instanceof ErreurAffichable ? texteDetail(e.detail) : texteDetail(e);
  const ref = await journaliserErreur(
    { name: "SynchroPubs", message: `${message} | ${detail}` },
    `pubs.synchro.${platform}`,
    {},
    { durable: false },
  );
  return avecRef(message, ref);
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
      if (error) throw new ErreurAffichable("Écriture des statistiques dans la base impossible.", error);
    }
    result = {
      platform,
      ok: true,
      rows: rows.length,
      message: `${rows.length} ligne(s) synchronisée(s) du ${range.since} au ${range.until}.`,
    };
  } catch (e) {
    result = { platform, ok: false, rows: 0, message: await messageEchec(platform, e) };
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

/**
 * Jours à resynchroniser en mode `auto` : 30 si aucune synchro n'a jamais
 * réussi ; à la première synchro du jour (heure de Toronto), du jour de la
 * dernière synchro réussie à aujourd'hui (min. 30, max. 365) pour rattraper
 * les jours manqués ; sinon LIVE_DAYS.
 */
export async function joursSynchroAuto(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("ad_sync_runs")
    .select("created_at")
    .eq("ok", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const at = data?.created_at as string | undefined;
  if (!at) return 30;
  const dernier = torontoDate((new Date(at).getTime() - Date.now()) / 86_400_000);
  const aujourdhui = torontoDate(0);
  if (dernier >= aujourdhui) return LIVE_DAYS;
  const ecart = Math.round((Date.parse(aujourdhui) - Date.parse(dernier)) / 86_400_000) + 1;
  return Math.min(365, Math.max(30, ecart));
}

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
