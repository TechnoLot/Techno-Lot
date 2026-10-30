import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DUREE_MAX_SESSION_S, derniereAuthentification, sessionExpiree } from "@/lib/securite/age-session";
import * as garde from "@/lib/securite/garde";
import {
  MESSAGE_COURRIEL_REFUSE,
  cspAdmin,
  estRouteAdminPublique,
  genererNonce,
  poserCspAdmin,
  urlConnexion,
} from "@/lib/securite/regles-middleware";

// --- Client Supabase simulé pour le middleware (aucun appel réseau) ------------------
const supa = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; last_sign_in_at?: string },
  claims: null as null | Record<string, unknown>,
  signOut: [] as unknown[],
  options: null as null | Record<string, unknown>,
  cookiesASupprimer: [] as string[],
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _cle: string, options: Record<string, unknown>) => {
    supa.options = options;
    const cookies = options.cookies as {
      setAll: (c: { name: string; value: string; options: Record<string, unknown> }[], h: Record<string, string>) => void;
    };
    return {
      auth: {
        getUser: async () => ({ data: { user: supa.user }, error: null }),
        getClaims: async () =>
          supa.claims ? { data: { claims: supa.claims }, error: null } : { data: null, error: { message: "x" } },
        signOut: async (o: unknown) => {
          supa.signOut.push(o);
          // Comme @supabase/ssr : effacement des témoins via setAll.
          cookies.setAll(
            supa.cookiesASupprimer.map((name) => ({ name, value: "", options: { maxAge: 0, path: "/" } })),
            { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0" },
          );
          return { error: null };
        },
      },
    };
  },
}));

import { middleware } from "@/middleware";

const ADMIN = { id: "11111111-2222-4333-8444-555555555555", email: "info@technolot.ca" };
const maintenant = () => Math.floor(Date.now() / 1000);
const requete = (chemin: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(new URL(chemin, "https://technolot.ca"), init);
const ENTETE = "content-security-policy";
const AUTRE_ENTETE = "content-security-policy-report-only";

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://projet.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  supa.user = null;
  supa.claims = null;
  supa.signOut = [];
  supa.options = null;
  supa.cookiesASupprimer = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// --- Âge de la session (calcul partagé avec la garde) ----------------------------------

describe("âge de la session (24 h)", () => {
  it("la garde réutilise exactement les fonctions Edge partagées", () => {
    expect(garde.sessionExpiree).toBe(sessionExpiree);
    expect(garde.derniereAuthentification).toBe(derniereAuthentification);
    expect(garde.DUREE_MAX_SESSION_S).toBe(24 * 60 * 60);
  });

  it("expire après 24 h, pas avant", () => {
    const t = 1_800_000_000;
    expect(sessionExpiree(t - DUREE_MAX_SESSION_S, t)).toBe(false);
    expect(sessionExpiree(t - DUREE_MAX_SESSION_S - 1, t)).toBe(true);
    expect(sessionExpiree(null, t)).toBe(true);
  });

  it("le second facteur (totp) ne prolonge pas la session", () => {
    const amr = [
      { method: "password", timestamp: 1000 },
      { method: "totp", timestamp: 5000 },
    ];
    expect(derniereAuthentification(amr)).toBe(1000);
  });

  it("repli sur last_sign_in_at, sinon inconnu", () => {
    expect(derniereAuthentification(undefined, "2026-10-30T00:00:00Z")).toBe(
      Math.floor(Date.parse("2026-10-30T00:00:00Z") / 1000),
    );
    expect(derniereAuthentification("n'importe quoi", null)).toBeNull();
  });
});

// --- Règles pures ---------------------------------------------------------------------

describe("règles du middleware", () => {
  it("routes publiques de l'admin", () => {
    expect(estRouteAdminPublique("/admin/login")).toBe(true);
    expect(estRouteAdminPublique("/admin/auth/callback")).toBe(true);
    expect(estRouteAdminPublique("/admin")).toBe(false);
    expect(estRouteAdminPublique("/admin/login2")).toBe(false);
  });

  it("CSP à nonce sur les pages, pas sur les API ni les outils encadrés", () => {
    expect(poserCspAdmin("/admin")).toBe(true);
    expect(poserCspAdmin("/admin/login")).toBe(true);
    expect(poserCspAdmin("/admin/soumissions")).toBe(true);
    expect(poserCspAdmin("/admin/calculatrice/embed")).toBe(false);
    expect(poserCspAdmin("/admin/ebay/embed")).toBe(false);
    expect(poserCspAdmin("/admin/calculatrice/api/saved")).toBe(false);
    expect(poserCspAdmin("/admin/calculatrice/api/saved/abc")).toBe(false);
  });

  it("nonce : 128 bits en base64, différent à chaque appel", () => {
    const a = genererNonce();
    const b = genererNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(a).not.toBe(b);
  });

  it("politique de l'admin (modèle T7 b)", () => {
    const p = cspAdmin("abc123==", { supabaseUrl: "https://projet.supabase.co/rest" });
    expect(p).toContain("script-src 'self' 'nonce-abc123==' 'strict-dynamic'");
    expect(p).not.toContain("unsafe-eval");
    expect(p).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(p).toContain("connect-src 'self' https://projet.supabase.co;");
    for (const d of [
      "default-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "frame-src 'self'",
    ]) {
      expect(p).toContain(d);
    }
    expect(cspAdmin("n", { dev: true })).toContain("'unsafe-eval'");
    expect(cspAdmin("n", { supabaseUrl: "javascript:alert(1)" })).toContain("connect-src 'self';");
  });

  it("`next` toujours interne", () => {
    expect(urlConnexion("non_connecte", "/admin/crm?x=1")).toBe("/admin/login?next=%2Fadmin%2Fcrm%3Fx%3D1");
    expect(urlConnexion("session_expiree", "/admin/lots")).toBe(
      "/admin/login?error=session_expiree&next=%2Fadmin%2Flots",
    );
    for (const mauvais of ["//evil.example", "/\\evil.example", "https://evil.example", "/blog", "javascript:alert(1)"]) {
      expect(urlConnexion("session_expiree", mauvais)).toBe("/admin/login?error=session_expiree&next=%2Fadmin");
    }
    expect(urlConnexion("courriel_refuse")).toBe(`/admin/login?error=${encodeURIComponent(MESSAGE_COURRIEL_REFUSE)}`);
  });
});

// --- Middleware complet (Supabase simulé) ----------------------------------------------

function nonceDe(politique: string | null): string | null {
  return politique ? (/'nonce-([^']+)'/.exec(politique)?.[1] ?? null) : null;
}

describe("middleware", () => {
  it("/admin/login : CSP imposée à nonce dans la requête transmise ET la réponse, sans vérifier la session", async () => {
    const r = await middleware(requete("/admin/login"));
    const politique = r.headers.get(ENTETE);
    expect(politique).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    // En-têtes de requête réécrits par NextResponse.next({ request: { headers } }).
    expect(r.headers.get(`x-middleware-request-${ENTETE}`)).toBe(politique);
    expect(r.headers.get("x-middleware-request-x-nonce")).toBe(nonceDe(politique));
    // Une seule politique : pas d'en-tête de l'autre mode (rapport seulement).
    expect(r.headers.get(AUTRE_ENTETE)).toBeNull();
    expect(supa.options).toBeNull(); // aucun client Supabase créé
  });

  it("deux requêtes → deux nonces différents", async () => {
    const a = nonceDe((await middleware(requete("/admin/login"))).headers.get(ENTETE));
    const b = nonceDe((await middleware(requete("/admin/login"))).headers.get(ENTETE));
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it("une CSP ou un nonce envoyés par le client sont ignorés", async () => {
    const r = await middleware(
      requete("/admin/login", {
        headers: {
          "content-security-policy": "script-src 'nonce-choisi'",
          "content-security-policy-report-only": "script-src 'nonce-choisi'",
          "x-nonce": "choisi",
        },
      }),
    );
    // La politique transmise à Next est la nôtre, jamais celle du client.
    expect(r.headers.get(`x-middleware-request-${ENTETE}`)).toBe(r.headers.get(ENTETE));
    expect(r.headers.get(`x-middleware-request-${ENTETE}`)).not.toContain("nonce-choisi");
    expect(r.headers.get(`x-middleware-request-${AUTRE_ENTETE}`)).toBeNull();
    expect(r.headers.get("x-middleware-request-x-nonce")).not.toBe("choisi");
  });

  it("sans session → connexion avec next interne (requête comprise)", async () => {
    const r = await middleware(requete("/admin/crm?filtre=a"));
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toBe(
      "https://technolot.ca/admin/login?next=%2Fadmin%2Fcrm%3Ffiltre%3Da",
    );
    expect(supa.options?.cookieOptions).toEqual({ path: "/", sameSite: "lax", httpOnly: true, secure: false });
  });

  it("courriel hors ADMIN_EMAILS → déconnexion (cette session) + message", async () => {
    supa.user = { id: "x", email: "pirate@exemple.com" };
    supa.cookiesASupprimer = ["sb-projet-auth-token"];
    const r = await middleware(requete("/admin/lots"));
    expect(supa.signOut).toEqual([{ scope: "local" }]);
    const location = new URL(r.headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe("https://technolot.ca/admin/login");
    expect(location.searchParams.get("error")).toBe(MESSAGE_COURRIEL_REFUSE);
    expect(location.searchParams.has("next")).toBe(false);
    // Le témoin effacé par signOut part avec la redirection.
    expect(r.headers.get("set-cookie")).toMatch(/sb-projet-auth-token=;/);
  });

  it("dernière connexion > 24 h → déconnexion + session_expiree&next=…", async () => {
    supa.user = ADMIN;
    supa.claims = { sub: ADMIN.id, amr: [{ method: "password", timestamp: maintenant() - DUREE_MAX_SESSION_S - 60 }] };
    const r = await middleware(requete("/admin/soumissions"));
    expect(supa.signOut).toEqual([{ scope: "local" }]);
    expect(r.headers.get("location")).toBe(
      "https://technolot.ca/admin/login?error=session_expiree&next=%2Fadmin%2Fsoumissions",
    );
  });

  it("revendications d'un autre utilisateur ignorées (repli last_sign_in_at)", async () => {
    supa.user = { ...ADMIN, last_sign_in_at: new Date(Date.now() - 2 * 86_400_000).toISOString() };
    supa.claims = { sub: "autre", amr: [{ method: "password", timestamp: maintenant() }] };
    const r = await middleware(requete("/admin"));
    expect(r.headers.get("location")).toMatch(/error=session_expiree/);
  });

  it("admin connecté depuis moins de 24 h → page servie avec la CSP", async () => {
    supa.user = ADMIN;
    supa.claims = { sub: ADMIN.id, amr: [{ method: "otp", timestamp: maintenant() - 3600 }] };
    const r = await middleware(requete("/admin/soumissions"));
    expect(r.headers.get("location")).toBeNull();
    expect(supa.signOut).toEqual([]);
    expect(r.headers.get(ENTETE)).toContain("'strict-dynamic'");
    expect(r.headers.get(`x-middleware-request-${ENTETE}`)).toBe(r.headers.get(ENTETE));
  });

  it("outil encadré et API sous /admin : session vérifiée, sans CSP du middleware", async () => {
    supa.user = ADMIN;
    supa.claims = { sub: ADMIN.id, amr: [{ method: "password", timestamp: maintenant() }] };
    for (const chemin of ["/admin/calculatrice/embed", "/admin/calculatrice/api/saved"]) {
      const r = await middleware(requete(chemin));
      expect(r.headers.get("location")).toBeNull();
      expect(r.headers.get(ENTETE)).toBeNull();
      expect(r.headers.get(`x-middleware-request-${ENTETE}`)).toBeNull();
    }
  });

  it("filets conservés : paramètres d'auth sur / et anciens liens ?post=", async () => {
    const auth = await middleware(requete("/?code=abc"));
    expect(auth.headers.get("location")).toBe("https://technolot.ca/admin/auth/callback?code=abc");
    const blogue = await middleware(requete("/blog?post=mon-article"));
    expect(blogue.headers.get("x-middleware-rewrite")).toBe("https://technolot.ca/blog/ancien-lien?post=mon-article");
    const accueil = await middleware(requete("/"));
    expect(accueil.headers.get(ENTETE)).toBeNull();
  });
});
