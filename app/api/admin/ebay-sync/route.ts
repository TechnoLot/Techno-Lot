import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import { isEbayConfigured } from "@/lib/ebay/client";
import { syncEbayOrders, type EbaySyncResult } from "@/lib/ebay/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Mode auto (pages admin ouvertes) : pas de nouvelle synchro si la dernière tentative a moins de 90 s. */
const AUTO_MIN_INTERVAL_MS = 90_000;

type SyncOutcome = { result: EbaySyncResult; lastSync: string | null };

/**
 * Verrou en mémoire (par processus Node) : une synchro à la fois. Une requête
 * qui arrive pendant une synchro réutilise la promesse en cours.
 */
let inFlight: Promise<SyncOutcome> | null = null;

/** Dernière synchro réussie (ran_at ISO) ou null. */
async function getLastOkRun(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("ebay_sync_runs")
    .select("ran_at")
    .eq("ok", true)
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.ran_at as string | undefined) ?? null;
}

/** Dernière tentative (réussie ou non) : ran_at ISO ou null. */
async function getLastRunAt(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("ebay_sync_runs")
    .select("ran_at")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.ran_at as string | undefined) ?? null;
}

function runSync(supabase: SupabaseClient): Promise<SyncOutcome> {
  if (!inFlight) {
    inFlight = (async () => {
      const result = await syncEbayOrders(supabase);
      const lastSync = await getLastOkRun(supabase).catch(() => null);
      return { result, lastSync };
    })().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function readAutoFlag(request: Request): Promise<boolean> {
  try {
    const text = await request.text();
    if (!text) return false;
    const body = JSON.parse(text) as { auto?: unknown };
    return body?.auto === true;
  } catch {
    return false;
  }
}

async function getAdminClient(): Promise<SupabaseClient | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdminEmail(user.email) ? supabase : null;
}

/** GET : statut de configuration (admin seulement), sans aucun secret. */
export async function GET() {
  if (!(await getAdminClient())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  return NextResponse.json({ configured: isEbayConfigured() });
}

/**
 * POST : synchronise les commandes eBay dans `ebay_orders`. Auth : admin
 * connecté, ou `Authorization: Bearer $CRON_SECRET` (cron, écrit avec
 * SUPABASE_SERVICE_ROLE_KEY).
 * Corps facultatif `{ auto: true }` (admin connecté) : synchro de fond,
 * sautée si la dernière tentative a moins de 90 s.
 * Réponse : { ok, configured, mode, orders, feesAvailable, feesUpdated, message, lastSync }
 * ou, en mode auto sauté : { ok: true, configured: true, skipped: true, lastSync }
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization");
  let supabase: SupabaseClient | null;
  let auto = false;

  if (cronSecret && bearer === `Bearer ${cronSecret}`) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY est requis côté serveur pour la synchronisation par cron." },
        { status: 503 },
      );
    }
    supabase = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
  } else {
    supabase = await getAdminClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, message: "Non autorisé." }, { status: 401 });
    }
    // Mode auto : réservé à l'admin connecté (synchro de fond des pages admin)
    auto = await readAutoFlag(request);
  }

  if (!isEbayConfigured()) {
    if (auto) {
      return NextResponse.json({ ok: false, configured: false, skipped: true });
    }
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "eBay n'est pas encore connecté : ajoute EBAY_APP_ID, EBAY_CERT_ID et EBAY_REFRESH_TOKEN dans .env.local et chez l'hébergeur, puis redémarre le site.",
      },
      { status: 400 },
    );
  }

  try {
    // Mode auto sans synchro en cours : on saute si la dernière tentative est trop récente.
    if (auto && !inFlight) {
      const lastRunAt = await getLastRunAt(supabase);
      if (lastRunAt && Date.now() - new Date(lastRunAt).getTime() < AUTO_MIN_INTERVAL_MS) {
        const lastSync = await getLastOkRun(supabase);
        return NextResponse.json({ ok: true, configured: true, skipped: true, lastSync });
      }
    }

    const { result, lastSync } = await runSync(supabase);
    return NextResponse.json({ configured: true, ...result, lastSync }, { status: result.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, configured: true, message: e instanceof Error ? e.message.slice(0, 400) : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
