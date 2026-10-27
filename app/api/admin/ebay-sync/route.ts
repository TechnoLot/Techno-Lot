import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import { isEbayConfigured } from "@/lib/ebay/client";
import { syncEbayOrders } from "@/lib/ebay/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
 * Réponse : { ok, mode, orders, feesAvailable, feesUpdated, message }
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization");
  let supabase: SupabaseClient | null;

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
  }

  if (!isEbayConfigured()) {
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
    const result = await syncEbayOrders(supabase);
    return NextResponse.json({ configured: true, ...result }, { status: result.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, configured: true, message: e instanceof Error ? e.message.slice(0, 400) : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
