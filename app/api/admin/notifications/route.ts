import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/config";
import {
  effacerNotifications,
  getNotificationsPoll,
  markNotificationsSeen,
  retirerNotifications,
} from "@/lib/admin/notifications";
import { lireActionNotifications } from "@/lib/admin/notifications-regles";

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

function erreur(e: unknown) {
  const message = e instanceof Error ? e.message : "Erreur inconnue";
  return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
}

/**
 * GET [?depuis=ISO] : nouveautés depuis la dernière visite de l'onglet
 * (pastille du menu) ; `nouveaux` : arrivées après `depuis` (alertes), 5 au
 * plus, plus récentes d'abord. `depuis` illisible : ignoré ; plus vieux que
 * 7 jours : ramené à 7 jours.
 * Réponse : { unseen, latest, nouveaux, now }
 */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const depuis = new URL(request.url).searchParams.get("depuis");
  try {
    const poll = await getNotificationsPoll(admin.supabase, admin.user, depuis);
    return NextResponse.json(poll, { headers: NO_STORE });
  } catch (e) {
    return erreur(e);
  }
}

/**
 * POST :
 * - { action: "vu", upTo } (ou sans action) : l'onglet a été vu jusqu'à cet
 *   instant, la pastille retombe à zéro → { ok, seenAt }
 * - { action: "retirer", keys } : retire 1 à 200 éléments du fil → { ok, retirees }
 * - { action: "effacer", upTo } : retire tout ce qui est arrivé jusque-là → { ok, clearedAt, seenAt }
 * Entrée invalide : 400 { error }.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Requête illisible." }, { status: 400, headers: NO_STORE });
  }
  const lu = lireActionNotifications(body);
  if (!lu.ok) return NextResponse.json({ error: lu.message }, { status: 400, headers: NO_STORE });

  const { supabase, user } = admin;
  try {
    const a = lu.value;
    if (a.action === "retirer") {
      const retirees = await retirerNotifications(supabase, user.id, a.keys);
      return NextResponse.json({ ok: true, retirees }, { headers: NO_STORE });
    }
    if (a.action === "effacer") {
      const { clearedAt, seenAt } = await effacerNotifications(supabase, user.id, a.upTo);
      return NextResponse.json({ ok: true, clearedAt, seenAt }, { headers: NO_STORE });
    }
    const seenAt = await markNotificationsSeen(supabase, user.id, a.upTo);
    return NextResponse.json({ ok: true, seenAt }, { headers: NO_STORE });
  } catch (e) {
    return erreur(e);
  }
}
