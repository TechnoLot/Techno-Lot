import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import { getNotificationsSummary, markNotificationsSeen } from "@/lib/admin/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

async function getAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdminEmail(user.email) ? { supabase, user } : null;
}

/** GET : nouveautés depuis la dernière visite de l'onglet (pastille du menu). */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  try {
    const summary = await getNotificationsSummary(admin.supabase, admin.user);
    return NextResponse.json(summary, { headers: NO_STORE });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}

/** POST { upTo } : l'onglet a été vu jusqu'à cet instant (ISO), ce qui remet la pastille à zéro. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  let upTo: string | null = null;
  try {
    const body = (await request.json()) as { upTo?: unknown };
    if (typeof body.upTo === "string") upTo = body.upTo;
  } catch {
    /* corps absent : maintenant */
  }
  try {
    const seenAt = await markNotificationsSeen(admin.supabase, admin.user.id, upTo);
    return NextResponse.json({ ok: true, seenAt }, { headers: NO_STORE });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}
