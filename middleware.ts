import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminEmail } from "@/lib/admin/config";
import { OPTIONS_COOKIES } from "@/lib/supabase/options-cookies";
import { derniereAuthentification, sessionExpiree } from "@/lib/securite/age-session";
import { doitPasserParMfa, niveauAal, urlMfa } from "@/lib/securite/mfa";
import {
  cspAdmin,
  estRouteAdminPublique,
  genererNonce,
  poserCspAdmin,
  urlConnexion,
} from "@/lib/securite/regles-middleware";

/**
 * Mode de la Content-Security-Policy de l'admin :
 *  - "report-only" : le navigateur signale les violations (console) sans rien bloquer ;
 *  - "enforce" : la politique est imposée.
 * Passer à "enforce" après une tournée des pages admin sans violation.
 * La CSP publique (next.config.mjs) a sa propre constante MODE_CSP.
 */
const MODE_CSP = "enforce" as "report-only" | "enforce";

const ENTETE_CSP =
  MODE_CSP === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

/**
 * Middleware Next.js (runtime Edge) :
 *
 * 1. Filet de sécurité auth : si Supabase renvoie un ?code=… ou
 *    ?token_hash=… sur n'importe quelle route non-admin (typiquement /
 *    en cas de fallback Site URL), on redirige vers le vrai callback.
 *
 * 2. Anciens liens ?post= du blogue (widget Soro).
 *
 * 3. /admin/* :
 *    - CSP à nonce sur les pages (en-tête de la REQUÊTE pour que Next pose le
 *      nonce sur ses scripts, et de la RÉPONSE pour le navigateur) ; pas sur
 *      les routes d'API ni les outils encadrés (…/embed) ;
 *    - sauf /admin/login et /admin/auth/* : session vérifiée par `getUser()`,
 *      courriel dans ADMIN_EMAILS (sinon déconnexion), dernière connexion de
 *      moins de 24 h (sinon déconnexion et retour à la connexion), puis
 *      double authentification : une session de niveau aal1 est renvoyée vers
 *      /admin/auth/mfa?next=<chemin>. La page /admin/auth/mfa elle-même passe
 *      par les mêmes contrôles de session, sans exiger aal2.
 *    Ce n'est qu'un premier filtre : chaque page, route et action admin
 *    revérifie elle-même (lib/securite/garde.ts).
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

  // — Anciens liens du widget Soro : /blog?post=<slug> et /en/blog?post=<slug>.
  // Réécriture (paramètre ?post= conservé) vers un gestionnaire de route qui
  // connaît la langue de l'article et répond par une redirection permanente
  // (308) vers son URL, ou vers l'index du blogue si le slug est inconnu.
  if ((pathname === "/blog" || pathname === "/en/blog") && searchParams.has("post")) {
    const target = request.nextUrl.clone();
    target.pathname = `${pathname}/ancien-lien`;
    return NextResponse.rewrite(target);
  }

  // Hors /admin, on laisse tout passer (le matcher couvre "/", "/blog" et
  // "/en/blog" pour les filets ci-dessus, mais rien d'autre à vérifier ici).
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // — CSP à nonce (une valeur par requête).
  const csp = poserCspAdmin(pathname)
    ? cspAdmin(genererNonce(), {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        dev: process.env.NODE_ENV === "development",
      })
    : null;

  /**
   * En-têtes de requête transmis à Next : ceux du navigateur (témoins à jour
   * compris : `request.cookies.set` réécrit l'en-tête `cookie`), sans CSP ni
   * nonce venus du client, plus notre CSP (Next y lit le nonce).
   */
  const entetesRequete = () => {
    const entetes = new Headers(request.headers);
    entetes.delete("content-security-policy");
    entetes.delete("content-security-policy-report-only");
    entetes.delete("x-nonce");
    if (csp) {
      entetes.set(ENTETE_CSP, csp);
      const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
      if (nonce) entetes.set("x-nonce", nonce);
    }
    return entetes;
  };

  /** NextResponse.next() avec la CSP dans la requête ET la réponse. */
  const suivant = () => {
    const reponse = NextResponse.next({ request: { headers: entetesRequete() } });
    if (csp) reponse.headers.set(ENTETE_CSP, csp);
    return reponse;
  };

  // Routes admin publiques (connexion)
  if (estRouteAdminPublique(pathname)) return suivant();

  // Vérification de session pour toutes les autres routes /admin/*
  let response = suivant();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { flowType: "implicit" },
      cookieOptions: OPTIONS_COOKIES,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, entetes) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = suivant();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Pas de cache partagé d'une réponse qui pose des témoins de session.
          Object.entries(entetes ?? {}).forEach(([cle, valeur]) =>
            response.headers.set(cle, valeur),
          );
        },
      },
    },
  );

  /** Redirection qui garde les témoins posés ou effacés par Supabase. */
  const rediriger = (chemin: string) => {
    const redirection = NextResponse.redirect(new URL(chemin, request.url));
    response.cookies.getAll().forEach((cookie) => redirection.cookies.set(cookie));
    redirection.headers.set("Cache-Control", "private, no-store");
    return redirection;
  };

  const cheminDemande = pathname + request.nextUrl.search;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return rediriger(urlConnexion("non_connecte", cheminDemande));
  }

  // Compte connecté mais pas dans ADMIN_EMAILS : déconnecté (cette session seulement).
  if (!isAdminEmail(user.email)) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return rediriger(urlConnexion("courriel_refuse"));
  }

  // Reconnexion chaque jour : même calcul que verifierAdmin (lib/securite/garde.ts),
  // sur les revendications VÉRIFIÉES du jeton (amr), repli sur last_sign_in_at.
  let amr: unknown = undefined;
  let aal: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    if (data?.claims && data.claims.sub === user.id) amr = data.claims.amr;
    aal = niveauAal(data?.claims, user.id);
  } catch {
    // Repli sur last_sign_in_at ; niveau inconnu = pas aal2.
  }
  if (sessionExpiree(derniereAuthentification(amr, user.last_sign_in_at))) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return rediriger(urlConnexion("session_expiree", cheminDemande));
  }

  // Double authentification exigée (même règle que verifierAdmin) : la session
  // est gardée, seul le code manque.
  if (doitPasserParMfa(pathname, aal)) {
    return rediriger(urlMfa(cheminDemande));
  }

  return response;
}

export const config = {
  // "/" est ajouté pour attraper les redirections d'auth qui atterrissent
  // par erreur sur la racine (fallback Supabase Site URL) ; "/blog" et
  // "/en/blog" pour les anciens liens ?post=<slug>.
  matcher: ["/", "/blog", "/en/blog", "/admin/:path*"],
};
