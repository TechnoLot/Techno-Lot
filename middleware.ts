import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware Next.js :
 *
 * 1. Filet de sécurité auth : si Supabase renvoie un ?code=… ou
 *    ?token_hash=… sur n'importe quelle route non-admin (typiquement /
 *    en cas de fallback Site URL), on redirige vers le vrai callback.
 *
 * 2. Protection /admin/* : exige une session Supabase valide, sauf pour
 *    /admin/login et /admin/auth/*.
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // — Filet de sécurité : rattraper les paramètres d'auth Supabase
  // s'ils tombent sur une route qui n'est pas le callback (ex: si le
  // Site URL Supabase les renvoie à tort sur /).
  const hasAuthParams =
    searchParams.has("code") || searchParams.has("token_hash");
  if (
    hasAuthParams &&
    !pathname.startsWith("/admin/auth/callback")
  ) {
    const callbackUrl = new URL("/admin/auth/callback", request.url);
    callbackUrl.search = request.nextUrl.search;
    return NextResponse.redirect(callbackUrl);
  }

  // Hors /admin, on laisse tout passer (le matcher couvre "/" pour le
  // filet ci-dessus, mais rien d'autre à vérifier ici).
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Routes admin publiques
  const isPublicAdminRoute =
    pathname === "/admin/login" || pathname.startsWith("/admin/auth/");
  if (isPublicAdminRoute) return NextResponse.next();

  // Vérification de session pour toutes les autres routes /admin/*
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // "/" est ajouté pour attraper les redirections d'auth qui atterrissent
  // par erreur sur la racine (fallback Supabase Site URL).
  matcher: ["/", "/admin/:path*"],
};
