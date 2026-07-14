import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /admin/auth/callback
 * Point de retour après clic sur un lien magique. Supabase peut renvoyer
 * l'utilisateur avec plusieurs formats d'URL selon la version du client
 * et le type de flow (PKCE, OTP magic link, etc.). On gère les deux plus
 * courants :
 *   - ?code=…              → PKCE (OAuth)
 *   - ?token_hash=…&type=… → OTP (magic link, invite, recovery)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabaseError = url.searchParams.get("error");
  const supabaseErrorDesc = url.searchParams.get("error_description");
  const next = url.searchParams.get("next") ?? "/admin";

  // Supabase peut inclure une erreur directement dans les query params
  // (lien expiré, déjà utilisé, etc.)
  if (supabaseError) {
    return redirectToLogin(
      url.origin,
      supabaseErrorDesc ?? supabaseError,
    );
  }

  const supabase = createClient();

  // — Flow PKCE : ?code=xxx
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error(
        "[admin/auth/callback] exchangeCodeForSession :",
        error,
      );
      return redirectToLogin(url.origin, `Échange code : ${error.message}`);
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // — Flow OTP magic link : ?token_hash=xxx&type=magiclink
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      console.error("[admin/auth/callback] verifyOtp :", error);
      return redirectToLogin(
        url.origin,
        `Vérification du lien : ${error.message}`,
      );
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // — Aucun paramètre reconnu : lien mal formé
  console.error(
    "[admin/auth/callback] Aucun paramètre d'auth. URL reçue :",
    request.url,
  );
  return redirectToLogin(
    url.origin,
    "Lien invalide : aucun code trouvé dans l'URL.",
  );
}

function redirectToLogin(origin: string, error: string) {
  const loginUrl = new URL("/admin/login", origin);
  loginUrl.searchParams.set("error", error);
  return NextResponse.redirect(loginUrl);
}
