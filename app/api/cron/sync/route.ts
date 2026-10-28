import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  adsSyncedRecently,
  isGoogleConfigured,
  isMetaConfigured,
  LIVE_DAYS,
  LIVE_MIN_INTERVAL_MS,
  syncAds,
} from "@/lib/ads/sync";
import { isEbayConfigured } from "@/lib/ebay/client";
import { syncEbayOrders } from "@/lib/ebay/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Journaux de synchro gardés 14 jours (une ligne par minute et par source sinon). */
const LOG_RETENTION_DAYS = 14;

async function ebaySyncedRecently(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from("ebay_sync_runs")
    .select("ran_at")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const at = data?.ran_at as string | undefined;
  return Boolean(at && Date.now() - new Date(at).getTime() < LIVE_MIN_INTERVAL_MS);
}

async function pruneLogs(supabase: SupabaseClient) {
  const before = new Date(Date.now() - LOG_RETENTION_DAYS * 86_400_000).toISOString();
  await Promise.allSettled([
    supabase.from("ad_sync_runs").delete().lt("created_at", before),
    supabase.from("ebay_sync_runs").delete().lt("ran_at", before),
  ]);
}

/**
 * Synchro en direct, appelée chaque minute par pg_cron (Supabase) même quand
 * personne n'est sur le site : commandes eBay (incrémentale) et stats pub
 * (aujourd'hui et hier ; `?days=30` pour la passe horaire). Chaque source est
 * sautée si elle a déjà été synchronisée il y a moins de 50 s (pages ouvertes).
 * Auth : `Authorization: Bearer $CRON_SECRET`. Écrit avec SUPABASE_SERVICE_ROLE_KEY.
 */
async function handle(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY est requis côté serveur." }, { status: 503 });
  }
  const supabase = createServiceClient(url, serviceKey, { auth: { persistSession: false } });

  const daysParam = Number(new URL(request.url).searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(Math.floor(daysParam), 365) : LIVE_DAYS;
  const full = days > LIVE_DAYS;

  const [ebay, ads] = await Promise.allSettled([
    (async () => {
      if (!isEbayConfigured()) return { skipped: "non configuré" };
      if (await ebaySyncedRecently(supabase)) return { skipped: "synchro récente" };
      const r = await syncEbayOrders(supabase);
      return { ok: r.ok, orders: r.orders, message: r.message };
    })(),
    (async () => {
      if (!isMetaConfigured() && !isGoogleConfigured()) return { skipped: "non configuré" };
      if (!full && (await adsSyncedRecently(supabase))) return { skipped: "synchro récente" };
      return { results: await syncAds({ days, supabase }) };
    })(),
  ]);

  if (full) await pruneLogs(supabase);

  const out = (r: PromiseSettledResult<unknown>) =>
    r.status === "fulfilled" ? r.value : { ok: false, message: String(r.reason).slice(0, 300) };
  return NextResponse.json({ days, ebay: out(ebay), ads: out(ads) });
}

export const GET = handle;
export const POST = handle;
