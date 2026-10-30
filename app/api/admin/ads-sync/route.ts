import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import {
  adsSyncedRecently,
  getLastAdsRunsByPlatform,
  isGoogleConfigured,
  isMetaConfigured,
  joursSynchroAuto,
  syncAds,
} from "@/lib/ads/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function getAdminClient(): Promise<SupabaseClient | null> {
  const supabase = await createClient();
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
  return NextResponse.json({
    meta: isMetaConfigured(),
    google: isGoogleConfigured(),
  });
}

/**
 * POST : synchronise les stats pub. Auth : admin connecté, ou
 * `Authorization: Bearer $CRON_SECRET` (cron). Corps optionnel : { days }.
 * `{ auto: true }` (pages admin ouvertes) : sauté si une synchro a eu lieu il
 * y a moins de 50 s ; sinon aujourd'hui et hier, ou, à la première synchro du
 * jour, depuis la dernière synchro réussie (30 à 365 jours, voir joursSynchroAuto).
 * Réponse : { results: [{ platform, ok, rows, message }], lastSync: { meta, google } }
 * (dernière tentative par plateforme), ou { skipped: true, lastSync }
 */
export async function POST(request: Request) {
  let body: { days?: unknown; auto?: unknown } = {};
  try {
    body = (await request.json()) as { days?: unknown; auto?: unknown };
  } catch {
    // corps absent ou invalide : valeurs par défaut
  }
  const auto = body?.auto === true;
  const manualDays = typeof body?.days === "number" ? body.days : 30;

  const cronSecret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization");
  let supabase: SupabaseClient | null;

  if (cronSecret && bearer === `Bearer ${cronSecret}`) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY est requis côté serveur pour la synchronisation par cron.",
        },
        { status: 503 },
      );
    }
    supabase = createServiceClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  } else {
    supabase = await getAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
  }

  if (!isMetaConfigured() && !isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Aucune plateforme publicitaire n'est configurée.", results: [] },
      { status: 400 },
    );
  }

  if (auto && (await adsSyncedRecently(supabase))) {
    return NextResponse.json({ skipped: true, results: [], lastSync: await getLastAdsRunsByPlatform(supabase) });
  }

  const days = auto ? await joursSynchroAuto(supabase) : manualDays;
  const results = await syncAds({ days, supabase });
  return NextResponse.json({ results, lastSync: await getLastAdsRunsByPlatform(supabase) });
}
