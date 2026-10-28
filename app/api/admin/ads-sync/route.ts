import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import {
  adsSyncedRecently,
  isGoogleConfigured,
  isMetaConfigured,
  LIVE_DAYS,
  syncAds,
} from "@/lib/ads/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
  return NextResponse.json({
    meta: isMetaConfigured(),
    google: isGoogleConfigured(),
  });
}

/**
 * POST : synchronise les stats pub. Auth : admin connecté, ou
 * `Authorization: Bearer $CRON_SECRET` (cron). Corps optionnel : { days }.
 * `{ auto: true }` (pages admin ouvertes) : aujourd'hui et hier seulement,
 * sauté si une synchro a eu lieu il y a moins de 50 s.
 * Réponse : { results: [{ platform, ok, rows, message }] } ou { skipped: true }
 */
export async function POST(request: Request) {
  let body: { days?: unknown; auto?: unknown } = {};
  try {
    body = (await request.json()) as { days?: unknown; auto?: unknown };
  } catch {
    // corps absent ou invalide : valeurs par défaut
  }
  const auto = body?.auto === true;
  const days = auto ? LIVE_DAYS : typeof body?.days === "number" ? body.days : 30;

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
    return NextResponse.json({ skipped: true, results: [] });
  }

  const results = await syncAds({ days, supabase });
  return NextResponse.json({ results });
}
