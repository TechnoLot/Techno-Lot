import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bearerCronValide, estRefus, exigerAdminRoute, type ContexteAdmin } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { clientServiceCron, reponseServiceManquant, signalerCronRefuse } from "@/lib/admin/cron";
import { journaliserAction } from "@/lib/admin/erreurs-admin";
import { lireJsonFacultatif, PRIVE, reponseInvalide } from "@/lib/admin/requete-admin";
import { synchroPubsSchema } from "@/lib/admin/schemas";
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

/** GET : statut de configuration (admin seulement, lecture seule), sans aucun secret. */
export async function GET(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  return NextResponse.json({ meta: isMetaConfigured(), google: isGoogleConfigured() }, { headers: PRIVE });
}

/**
 * POST : synchronise les stats pub. Auth : `Authorization: Bearer $CRON_SECRET`
 * (cron), sinon admin connecté (garde : origine, session, rôle). Corps JSON
 * facultatif et strict : { days?: 1-365, auto?: boolean }.
 * `{ auto: true }` (pages admin ouvertes) : sauté si une synchro a eu lieu il
 * y a moins de 50 s ; sinon aujourd'hui et hier, ou, à la première synchro du
 * jour, depuis la dernière synchro réussie (30 à 365 jours, voir joursSynchroAuto).
 * Réponse : { results: [{ platform, ok, rows, message }], lastSync: { meta, google } }
 * (dernière tentative par plateforme), ou { skipped: true, lastSync }
 */
export async function POST(request: Request) {
  const cron = bearerCronValide(request);
  let supabase: SupabaseClient;
  let ctx: ContexteAdmin | null = null;

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
  }

  const lu = await lireJsonFacultatif(request, 2_000, { exigerType: !cron });
  if (!lu.ok) return lu.reponse;
  const parse = synchroPubsSchema.safeParse(lu.donnees);
  if (!parse.success) return reponseInvalide(parse.error, ctx?.requestId);
  const auto = parse.data.auto === true;

  if (!isMetaConfigured() && !isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Aucune plateforme publicitaire n'est configurée.", results: [] },
      { status: 400, headers: PRIVE },
    );
  }

  try {
    if (auto && (await adsSyncedRecently(supabase))) {
      return NextResponse.json(
        { skipped: true, results: [], lastSync: await getLastAdsRunsByPlatform(supabase) },
        { headers: PRIVE },
      );
    }

    const days = auto ? await joursSynchroAuto(supabase) : (parse.data.days ?? 30);
    const results = await syncAds({ days, supabase });
    if (ctx && !auto) {
      void journaliserAction(
        "pubs.synchro",
        ctx,
        { jours: days, reussies: results.filter((r) => r.ok).length, echouees: results.filter((r) => !r.ok).length },
        request,
      );
    }
    return NextResponse.json({ results, lastSync: await getLastAdsRunsByPlatform(supabase) }, { headers: PRIVE });
  } catch (err) {
    return reponseErreur(500, "Synchronisation impossible. Réessayez plus tard.", {
      request,
      err,
      requestId: ctx?.requestId,
      userId: ctx?.user.id ?? null,
    });
  }
}
