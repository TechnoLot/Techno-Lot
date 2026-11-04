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
 *
 * `?raison=inactivite` (assets/outils/garde-activite.js) : ferme CETTE session
 * seulement (portée « local ») : l'utilisateur travaille sur plusieurs
 * ordinateurs, un onglet oublié ne doit pas fermer les autres.
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
  const inactivite = new URL(request.url).searchParams.get("raison") === "inactivite";
  const { error } = await supabase.auth.signOut({ scope: inactivite ? "local" : "global" });
  void journaliser(EVENEMENTS.authDeconnexion, {
    resultat: error ? "echec" : "ok",
    request,
    userId: user?.id ?? null,
    statut: 303,
    details:
      error || inactivite
        ? {
            ...(error ? { errcode: error.code ?? undefined } : {}),
            ...(inactivite ? { motif: "inactivite" } : {}),
          }
        : undefined,
  });

  const destination = inactivite ? "/admin/login?error=inactivite" : "/admin/login";
  return NextResponse.redirect(new URL(destination, origineConfiguree(request)), { status: 303 });
}
