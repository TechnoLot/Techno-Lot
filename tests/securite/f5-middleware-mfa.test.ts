import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DUREE_MAX_SESSION_S } from "@/lib/securite/age-session";

/* Middleware (F5) : une session aal1 est envoyée vers /admin/auth/mfa ; les
 * règles existantes (sans session, courriel refusé, 24 h) restent prioritaires. */

const supa = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; last_sign_in_at?: string },
  claims: null as null | Record<string, unknown>,
  signOut: [] as unknown[],
  clients: 0,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => {
    supa.clients += 1;
    return {
      auth: {
        getUser: async () => ({ data: { user: supa.user }, error: null }),
        getClaims: async () =>
          supa.claims ? { data: { claims: supa.claims }, error: null } : { data: null, error: { message: "x" } },
        signOut: async (o: unknown) => {
          supa.signOut.push(o);
          return { error: null };
        },
      },
    };
  },
}));

import { middleware } from "@/middleware";

const ADMIN = { id: "11111111-2222-4333-8444-555555555555", email: "info@technolot.ca" };
const maintenant = () => Math.floor(Date.now() / 1000);
const claims = (aal: string | undefined, age = 60) => ({
  sub: ADMIN.id,
  ...(aal ? { aal } : {}),
  amr: [{ method: "password", timestamp: maintenant() - age }],
});
const requete = (chemin: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(new URL(chemin, "https://technolot.ca"), init);

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://projet.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  supa.user = null;
  supa.claims = null;
  supa.signOut = [];
  supa.clients = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("middleware : double authentification", () => {
  it("aal1 → /admin/auth/mfa?next=<chemin interne, requête comprise>, session gardée", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    const r = await middleware(requete("/admin/crm?filtre=a"));
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toBe("https://technolot.ca/admin/auth/mfa?next=%2Fadmin%2Fcrm%3Ffiltre%3Da");
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(supa.signOut).toEqual([]);
  });

  it("niveau illisible → même redirection (refus par défaut)", async () => {
    supa.user = ADMIN;
    supa.claims = claims(undefined);
    expect((await middleware(requete("/admin"))).headers.get("location")).toBe(
      "https://technolot.ca/admin/auth/mfa?next=%2Fadmin",
    );
  });

  it("aal1 sur une API ou un outil encadré sous /admin → aussi vers le code", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    for (const chemin of ["/admin/calculatrice/api/saved", "/admin/calculatrice/embed"]) {
      expect((await middleware(requete(chemin))).headers.get("location")).toMatch(
        /^https:\/\/technolot\.ca\/admin\/auth\/mfa\?next=/,
      );
    }
  });

  it("aal2 → page servie", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal2");
    const r = await middleware(requete("/admin/crm"));
    expect(r.headers.get("location")).toBeNull();
    expect(r.headers.get("content-security-policy")).toContain("'strict-dynamic'");
  });

  it("page /admin/auth/mfa : aal1 servie (avec la CSP), jamais redirigée vers elle-même", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    const r = await middleware(requete("/admin/auth/mfa?next=%2Fadmin%2Fcrm"));
    expect(r.headers.get("location")).toBeNull();
    expect(r.headers.get("content-security-policy")).toContain("'strict-dynamic'");
  });

  it("page /admin/auth/mfa sans session → connexion", async () => {
    const r = await middleware(requete("/admin/auth/mfa?next=%2Fadmin%2Fcrm"));
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get("location") ?? "").pathname).toBe("/admin/login");
  });

  it("page /admin/auth/mfa : session de plus de 24 h → déconnexion + session_expiree ; courriel refusé → déconnexion", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1", DUREE_MAX_SESSION_S + 60);
    const r = await middleware(requete("/admin/auth/mfa"));
    expect(r.headers.get("location")).toMatch(/\/admin\/login\?error=session_expiree/);
    expect(supa.signOut).toEqual([{ scope: "local" }]);

    supa.signOut = [];
    supa.user = { id: "x", email: "pirate@exemple.com" };
    const refuse = await middleware(requete("/admin/auth/mfa"));
    expect(new URL(refuse.headers.get("location") ?? "").pathname).toBe("/admin/login");
    expect(supa.signOut).toEqual([{ scope: "local" }]);
  });

  it("règles existantes prioritaires : sans session → connexion ; > 24 h → session_expiree (pas le code)", async () => {
    expect((await middleware(requete("/admin/lots"))).headers.get("location")).toBe(
      "https://technolot.ca/admin/login?next=%2Fadmin%2Flots",
    );
    supa.user = ADMIN;
    supa.claims = claims("aal1", DUREE_MAX_SESSION_S + 60);
    expect((await middleware(requete("/admin/lots"))).headers.get("location")).toBe(
      "https://technolot.ca/admin/login?error=session_expiree&next=%2Fadmin%2Flots",
    );
  });

  it("routes POST de /admin/auth/mfa et connexion : publiques au middleware (garde dans la route)", async () => {
    for (const chemin of ["/admin/auth/mfa/verification", "/admin/auth/mfa/activation", "/admin/login"]) {
      const r = await middleware(requete(chemin, { method: "POST" }));
      expect(r.headers.get("location")).toBeNull();
    }
    expect(supa.clients).toBe(0);
  });
});
