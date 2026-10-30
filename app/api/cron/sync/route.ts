import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bearerCronValide } from "@/lib/securite/garde";
import { clientServiceCron, refusCron, reponseServiceManquant } from "@/lib/admin/cron";
import { avecRef, journaliserErreur } from "@/lib/admin/erreurs-admin";
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
 * Auth : `Authorization: Bearer $CRON_SECRET` (comparé en temps constant ;
 * refus journalisé `cron.refus`). Écrit avec SUPABASE_SERVICE_ROLE_KEY.
 * POST seulement (pg_cron appelle `net.http_post`) : un GET ne doit jamais
 * modifier l'état (synchros, ménage des journaux).
 */
export async function POST(request: Request) {
  if (!bearerCronValide(request)) return refusCron(request);
  const supabase = clientServiceCron();
  if (!supabase) return reponseServiceManquant();
  const requestId = randomUUID();

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

  // Raison d'un échec inattendu : au journal seulement (la réponse est copiée
  // dans net._http_response par pg_cron).
  const out = async (r: PromiseSettledResult<unknown>, source: string) => {
    if (r.status === "fulfilled") return r.value;
    const ref = await journaliserErreur(r.reason, `cron.sync.${source}`, { requestId }, { request, durable: false });
    return { ok: false, message: avecRef("Synchronisation impossible.", ref) };
  };
  return NextResponse.json(
    { days, ebay: await out(ebay, "ebay"), ads: await out(ads, "pubs") },
    { headers: { "Cache-Control": "no-store" } },
  );
}
