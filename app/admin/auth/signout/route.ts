import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { origineConfiguree } from "@/lib/admin/origin";
import { origineValide } from "@/lib/securite/garde";
import { EVENEMENTS, journaliser } from "@/lib/securite/journal";

export const runtime = "nodejs";

/**
 * POST /admin/auth/signout (POST seulement : un GET reçoit 405).
 * Ferme la session Supabase sur TOUS les appareils (portée « global » :
 * jetons de rafraîchissement révoqués) puis redirige vers la page de
 * connexion. L'en-tête `Origin` doit être celle du site : un autre site ne
 * peut pas déconnecter l'admin (CSRF).
 */
export async function POST(request: Request) {
  if (!origineValide(request)) {
    void journaliser(EVENEMENTS.authDeconnexion, {
      resultat: "refus",
      request,
      statut: 403,
      details: { motif: "origine_refusee" },
    });
    return NextResponse.json(
      { error: "Origine refusée." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  void journaliser(EVENEMENTS.authDeconnexion, {
    resultat: error ? "echec" : "ok",
    request,
    userId: user?.id ?? null,
    statut: 303,
    details: error ? { errcode: error.code ?? undefined } : undefined,
  });

  return NextResponse.redirect(new URL("/admin/login", origineConfiguree(request)), { status: 303 });
}
