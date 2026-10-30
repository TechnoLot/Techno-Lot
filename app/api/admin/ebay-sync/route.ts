import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bearerCronValide, estRefus, exigerAdminRoute, type ContexteAdmin } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { clientServiceCron, reponseServiceManquant, signalerCronRefuse } from "@/lib/admin/cron";
import { journaliserAction } from "@/lib/admin/erreurs-admin";
import { lireJsonFacultatif, PRIVE, reponseInvalide } from "@/lib/admin/requete-admin";
import { synchroEbaySchema } from "@/lib/admin/schemas";
import { isEbayConfigured } from "@/lib/ebay/client";
import { syncEbayOrders, type EbaySyncResult } from "@/lib/ebay/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Mode auto (pages admin ouvertes) : pas de nouvelle synchro si la dernière tentative a moins de 50 s. */
const AUTO_MIN_INTERVAL_MS = 50_000;

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

/** GET : statut de configuration (admin seulement, lecture seule), sans aucun secret. */
export async function GET(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  return NextResponse.json({ configured: isEbayConfigured() }, { headers: PRIVE });
}

/**
 * POST : synchronise les commandes eBay dans `ebay_orders`. Auth :
 * `Authorization: Bearer $CRON_SECRET` (cron, écrit avec
 * SUPABASE_SERVICE_ROLE_KEY), sinon admin connecté (garde : origine, session, rôle).
 * Corps JSON facultatif et strict `{ auto?: boolean }` (admin connecté) :
 * synchro de fond, sautée si la dernière tentative a moins de 50 s.
 * Réponse : { ok, configured, mode, orders, feesAvailable, feesUpdated, message, lastSync }
 * ou, en mode auto sauté : { ok: true, configured: true, skipped: true, lastSync }
 */
export async function POST(request: Request) {
  const cron = bearerCronValide(request);
  let supabase: SupabaseClient;
  let ctx: ContexteAdmin | null = null;
  let auto = false;

  if (cron) {
    const service = clientServiceCron();
    if (!service) return reponseServiceManquant();
    supabase = service;
  } else {
    const garde = await exigerAdminRoute(request);
    if (estRefus(garde)) {
      if (request.headers.has("authorization")) signalerCronRefuse(request);
      return garde;
    }
    ctx = garde;
    supabase = garde.supabase;
    // Mode auto : réservé à l'admin connecté (synchro de fond des pages admin)
    const lu = await lireJsonFacultatif(request, 1_000);
    if (!lu.ok) return lu.reponse;
    const parse = synchroEbaySchema.safeParse(lu.donnees);
    if (!parse.success) return reponseInvalide(parse.error, ctx.requestId);
    auto = parse.data.auto === true;
  }

  if (!isEbayConfigured()) {
    if (auto) {
      return NextResponse.json({ ok: false, configured: false, skipped: true }, { headers: PRIVE });
    }
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "eBay n'est pas encore connecté : ajoute EBAY_APP_ID, EBAY_CERT_ID et EBAY_REFRESH_TOKEN dans .env.local et chez l'hébergeur, puis redémarre le site.",
      },
      { status: 400, headers: PRIVE },
    );
  }

  try {
    // Mode auto sans synchro en cours : on saute si la dernière tentative est trop récente.
    if (auto && !inFlight) {
      const lastRunAt = await getLastRunAt(supabase);
      if (lastRunAt && Date.now() - new Date(lastRunAt).getTime() < AUTO_MIN_INTERVAL_MS) {
        const lastSync = await getLastOkRun(supabase);
        return NextResponse.json({ ok: true, configured: true, skipped: true, lastSync }, { headers: PRIVE });
      }
    }

    const { result, lastSync } = await runSync(supabase);
    if (ctx && !auto) {
      void journaliserAction("ebay.synchro", ctx, { reussie: result.ok, commandes: result.orders }, request);
    }
    return NextResponse.json(
      { configured: true, ...result, lastSync },
      { status: result.ok ? 200 : 502, headers: PRIVE },
    );
  } catch (err) {
    const reponse = reponseErreur(500, "Synchronisation eBay impossible. Réessayez plus tard.", {
      request,
      err,
      requestId: ctx?.requestId,
      userId: ctx?.user.id ?? null,
    });
    // Les pages eBay lisent `message` : même texte générique, avec la référence.
    const corps = (await reponse.clone().json()) as { error: string; ref: string };
    return NextResponse.json(
      { ok: false, configured: true, message: `${corps.error} (réf. ${corps.ref})`, ...corps },
      { status: 500, headers: reponse.headers },
    );
  }
}
