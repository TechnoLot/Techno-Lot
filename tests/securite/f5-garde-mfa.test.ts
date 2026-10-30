import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* Garde (F5) : verifierAdmin exige aal2 ; la garde de session MFA accepte aal1. */

const supa = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; last_sign_in_at?: string },
  estAdmin: { data: true as unknown, error: null as unknown },
  claims: null as null | Record<string, unknown>,
  rpc: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: supa.user }, error: null }),
      getClaims: async () =>
        supa.claims ? { data: { claims: supa.claims }, error: null } : { data: null, error: { message: "x" } },
    },
    rpc: async (nom: string) => {
      supa.rpc.push(nom);
      return nom === "est_admin" ? supa.estAdmin : { data: null, error: { code: "42883" } };
    },
  }),
}));

import {
  adminPourAction,
  estRefus,
  exigerAdminPage,
  exigerAdminRoute,
  exigerSessionMfaPage,
  exigerSessionMfaRoute,
  verifierAdmin,
  verifierSessionMfa,
} from "@/lib/securite/garde";

const ADMIN = { id: "11111111-2222-4333-8444-555555555555", email: "info@technolot.ca" };
const maintenant = () => Math.floor(Date.now() / 1000);
const claims = (aal: string | undefined, age = 60) => ({
  sub: ADMIN.id,
  ...(aal ? { aal } : {}),
  amr: [{ method: "password", timestamp: maintenant() - age }],
});

async function cibleRedirection(appel: () => Promise<unknown>): Promise<string> {
  try {
    await appel();
  } catch (e) {
    const digest = String((e as { digest?: string }).digest ?? "");
    return digest.split(";")[2] ?? digest;
  }
  return "AUCUNE";
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("SITE_URL", "https://technolot.ca");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("SECURITE_RPC_SECRET", "");
  supa.user = null;
  supa.estAdmin = { data: true, error: null };
  supa.claims = null;
  supa.rpc = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("verifierAdmin exige aal2", () => {
  it("aal1 → 401 mfa_requise, AVANT est_admin (aucun appel)", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    expect(await verifierAdmin()).toMatchObject({ ok: false, status: 401, motif: "mfa_requise" });
    expect(supa.rpc).toEqual([]);
  });

  it("aal1 et est_admin faux (migration aal2 appliquée) → toujours mfa_requise, pas « accès refusé »", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    supa.estAdmin = { data: false, error: null };
    expect(await verifierAdmin()).toMatchObject({ motif: "mfa_requise" });
  });

  it("aal absent, illisible ou d'un autre utilisateur → refus", async () => {
    supa.user = { ...ADMIN, last_sign_in_at: new Date().toISOString() };
    supa.claims = claims(undefined);
    expect(await verifierAdmin()).toMatchObject({ motif: "mfa_requise" });
    supa.claims = { ...claims("aal2"), sub: "autre" };
    expect(await verifierAdmin()).toMatchObject({ motif: "mfa_requise" });
    supa.claims = null;
    expect(await verifierAdmin()).toMatchObject({ motif: "mfa_requise" });
  });

  it("session de plus de 24 h : session_expiree reste prioritaire, même en aal2", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal2", 25 * 3600);
    expect(await verifierAdmin()).toMatchObject({ motif: "session_expiree" });
  });

  it("aal2 → accès ; est_admin toujours vérifié ensuite", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal2");
    expect((await verifierAdmin()).ok).toBe(true);
    expect(supa.rpc).toEqual(["est_admin"]);
    supa.estAdmin = { data: false, error: null };
    expect(await verifierAdmin()).toMatchObject({ status: 403, motif: "role_refuse" });
  });
});

describe("routes, actions et pages admin", () => {
  it("route : aal1 → 401 « Double authentification requise. » no-store ; aal2 → contexte", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    const refus = await exigerAdminRoute(new Request("https://technolot.ca/api/admin/x"));
    expect(estRefus(refus)).toBe(true);
    if (estRefus(refus)) {
      expect(refus.status).toBe(401);
      expect(refus.headers.get("cache-control")).toBe("no-store");
      expect(await refus.json()).toEqual({ error: "Double authentification requise." });
    }
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"motif":"mfa_requise"'));

    supa.claims = claims("aal2");
    expect(estRefus(await exigerAdminRoute(new Request("https://technolot.ca/api/admin/x")))).toBe(false);
  });

  it("action serveur : aal1 → null ; aal2 → contexte", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    expect(await adminPourAction()).toBeNull();
    supa.claims = claims("aal2");
    expect(await adminPourAction()).not.toBeNull();
  });

  it("page : aal1 → /admin/auth/mfa?next=<chemin interne, requête comprise>", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    expect(await cibleRedirection(() => exigerAdminPage("/admin/crm?x=1"))).toBe(
      "/admin/auth/mfa?next=%2Fadmin%2Fcrm%3Fx%3D1",
    );
    expect(await cibleRedirection(() => exigerAdminPage("//evil.example"))).toBe("/admin/auth/mfa?next=%2Fadmin");
    supa.claims = claims("aal2");
    expect(await cibleRedirection(() => exigerAdminPage("/admin/crm"))).toBe("AUCUNE");
  });
});

describe("garde de session MFA (aal1 suffit)", () => {
  it("aal1 → contexte avec le niveau, sans appeler est_admin", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    const v = await verifierSessionMfa();
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.ctx.aal).toBe("aal1");
    expect(supa.rpc).toEqual([]);
  });

  it("sans session → 401 ; courriel hors ADMIN_EMAILS → 403 ; plus de 24 h → session_expiree", async () => {
    expect(await verifierSessionMfa()).toMatchObject({ status: 401, motif: "non_connecte" });
    supa.user = { id: ADMIN.id, email: "pirate@exemple.com" };
    expect(await verifierSessionMfa()).toMatchObject({ status: 403, motif: "courriel_non_autorise" });
    supa.user = ADMIN;
    supa.claims = claims("aal1", 25 * 3600);
    expect(await verifierSessionMfa()).toMatchObject({ status: 401, motif: "session_expiree" });
  });

  it("page MFA sans session → connexion avec la destination ; expirée → session_expiree", async () => {
    expect(await cibleRedirection(() => exigerSessionMfaPage("/admin/crm"))).toBe("/admin/login?next=%2Fadmin%2Fcrm");
    supa.user = ADMIN;
    supa.claims = claims("aal1", 25 * 3600);
    expect(await cibleRedirection(() => exigerSessionMfaPage("/admin"))).toBe(
      "/admin/login?error=session_expiree&next=%2Fadmin",
    );
    supa.claims = claims("aal1");
    expect(await cibleRedirection(() => exigerSessionMfaPage("/admin"))).toBe("AUCUNE");
  });

  it("route MFA : origine étrangère → 403 avant la session ; sans session → 401 ; aal1 → contexte", async () => {
    supa.user = ADMIN;
    supa.claims = claims("aal1");
    const evil = await exigerSessionMfaRoute(
      new Request("https://technolot.ca/admin/auth/mfa/verification", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(estRefus(evil) && evil.status).toBe(403);

    const post = () =>
      new Request("https://technolot.ca/admin/auth/mfa/verification", {
        method: "POST",
        headers: { origin: "https://technolot.ca" },
      });
    expect(estRefus(await exigerSessionMfaRoute(post()))).toBe(false);
    supa.user = null;
    const sans = await exigerSessionMfaRoute(post());
    expect(estRefus(sans) && sans.status).toBe(401);
  });
});
