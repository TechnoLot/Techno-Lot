import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware Next.js : protège les routes /admin/* en exigeant une session
 * Supabase valide, sauf pour le login et le callback OAuth.
 *
 * Ne s'exécute que sur /admin/* (voir `matcher` plus bas) pour ne pas
 * pénaliser les pages publiques.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes toujours accessibles sans authentification.
  const isPublicAdminRoute =
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/auth/");
  if (isPublicAdminRoute) return NextResponse.next();

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

  // getUser() rafraîchit aussi le token si nécessaire.
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
  matcher: ["/admin/:path*"],
};
