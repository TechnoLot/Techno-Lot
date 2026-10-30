import { NextResponse } from "next/server";
import { estRefus, exigerAdminRoute, type ContexteAdmin } from "@/lib/securite/garde";
import { reponseErreur } from "@/lib/securite/erreurs";
import { lireJsonFacultatif, PRIVE } from "@/lib/admin/requete-admin";
import {
  effacerNotifications,
  getNotificationsPoll,
  markNotificationsSeen,
  retirerNotifications,
} from "@/lib/admin/notifications";
import { lireActionNotifications } from "@/lib/admin/notifications-regles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Erreur interne : message générique + référence ; détail au journal. */
function erreur(request: Request, ctx: ContexteAdmin, err: unknown) {
  return reponseErreur(500, "Lecture des notifications impossible. Réessayez plus tard.", {
    request,
    err,
    requestId: ctx.requestId,
    userId: ctx.user.id,
  });
}

/**
 * GET [?depuis=ISO] : nouveautés depuis la dernière visite de l'onglet
 * (pastille du menu) ; `nouveaux` : arrivées après `depuis` (alertes), 5 au
 * plus, plus récentes d'abord. `depuis` illisible : ignoré ; plus vieux que
 * 7 jours : ramené à 7 jours.
 * Réponse : { unseen, latest, nouveaux, now }
 */
export async function GET(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;
  const depuis = new URL(request.url).searchParams.get("depuis");
  try {
    const poll = await getNotificationsPoll(garde.supabase, garde.user, depuis);
    return NextResponse.json(poll, { headers: PRIVE });
  } catch (e) {
    return erreur(request, garde, e);
  }
}

/**
 * POST (JSON exigé, origine vérifiée par la garde) :
 * - { action: "vu", upTo } (ou sans action) : l'onglet a été vu jusqu'à cet
 *   instant, la pastille retombe à zéro → { ok, seenAt }
 * - { action: "retirer", keys } : retire 1 à 200 éléments du fil → { ok, retirees }
 * - { action: "effacer", upTo } : retire tout ce qui est arrivé jusque-là → { ok, clearedAt, seenAt }
 * Entrée invalide : 400 { error }.
 */
export async function POST(request: Request) {
  const garde = await exigerAdminRoute(request);
  if (estRefus(garde)) return garde;

  const lu = await lireJsonFacultatif(request, 20_000);
  if (!lu.ok) return lu.reponse;
  const action = lireActionNotifications(lu.donnees);
  if (!action.ok) return NextResponse.json({ error: action.message }, { status: 400, headers: PRIVE });

  const { supabase, user } = garde;
  try {
    const a = action.value;
    if (a.action === "retirer") {
      const retirees = await retirerNotifications(supabase, user.id, a.keys);
      return NextResponse.json({ ok: true, retirees }, { headers: PRIVE });
    }
    if (a.action === "effacer") {
      const { clearedAt, seenAt } = await effacerNotifications(supabase, user.id, a.upTo);
      return NextResponse.json({ ok: true, clearedAt, seenAt }, { headers: PRIVE });
    }
    const seenAt = await markNotificationsSeen(supabase, user.id, a.upTo);
    return NextResponse.json({ ok: true, seenAt }, { headers: PRIVE });
  } catch (e) {
    return erreur(request, garde, e);
  }
}
