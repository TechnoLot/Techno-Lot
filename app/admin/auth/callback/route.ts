import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /admin/auth/callback?code=…&next=…
 * Point de retour après clic sur un lien magique. Échange le code
 * temporaire contre une session Supabase (cookie), puis redirige vers
 * la destination initiale (typiquement /admin).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[admin/auth/callback] exchangeCodeForSession :", error);
      const loginUrl = new URL("/admin/login", url.origin);
      loginUrl.searchParams.set("error", "Session invalide ou expirée.");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
