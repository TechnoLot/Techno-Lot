import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Client Supabase simulé (aucun appel réseau).
const supa = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; last_sign_in_at?: string },
  estAdmin: { data: true as unknown, error: null as unknown },
  claims: null as null | Record<string, unknown>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: supa.user }, error: null }),
      getClaims: async () =>
        supa.claims ? { data: { claims: supa.claims }, error: null } : { data: null, error: { message: "x" } },
    },
    rpc: async (nom: string) =>
      nom === "est_admin" ? supa.estAdmin : { data: null, error: { code: "42883" } },
  }),
}));

import {
  bearerCronValide,
  derniereAuthentification,
  estRefus,
  exigerAdminPage,
  exigerAdminRoute,
  origineValide,
  sessionExpiree,
  verifierAdmin,
} from "@/lib/securite/garde";

const ADMIN = { id: "11111111-2222-4333-8444-555555555555", email: "info@technolot.ca" };
const maintenant = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("SITE_URL", "https://technolot.ca");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("SECURITE_RPC_SECRET", ""); // journal : sortie standard seulement
  supa.user = null;
  supa.estAdmin = { data: true, error: null };
  supa.claims = null;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("bearerCronValide", () => {
  const SECRET = "s".repeat(40);
  const req = (auth?: string) =>
    new Request("https://technolot.ca/api/cron/sync", {
      method: "POST",
      headers: auth === undefined ? {} : { authorization: auth },
    });

  it("refuse si CRON_SECRET est absent", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(bearerCronValide(req("Bearer "))).toBe(false);
  });

  it("refuse si CRON_SECRET fait moins de 32 caractères, même avec le bon en-tête", () => {
    vi.stubEnv("CRON_SECRET", "c".repeat(31));
    expect(bearerCronValide(req(`Bearer ${"c".repeat(31)}`))).toBe(false);
  });

  it("refuse un en-tête absent, faux ou de longueur différente", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(bearerCronValide(req())).toBe(false);
    expect(bearerCronValide(req(`Bearer ${"t".repeat(40)}`))).toBe(false);
    expect(bearerCronValide(req("Bearer x"))).toBe(false);
    expect(bearerCronValide(req(`Bearer ${SECRET}${"x".repeat(500)}`))).toBe(false);
    expect(bearerCronValide(req(SECRET))).toBe(false);
  });

  it("accepte le bon secret", () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(bearerCronValide(req(`Bearer ${SECRET}`))).toBe(true);
  });
});

describe("origineValide", () => {
  const post = (origin?: string, url = "https://technolot.ca/api/admin/x", extra: Record<string, string> = {}) =>
    new Request(url, { method: "POST", headers: { ...(origin ? { origin } : {}), ...extra } });

  it("méthodes sûres : toujours vrai", () => {
    expect(origineValide(new Request("https://technolot.ca/api/admin/x"))).toBe(true);
    expect(origineValide(new Request("https://technolot.ca/api/admin/x", { method: "HEAD" }))).toBe(true);
    expect(origineValide(new Request("https://technolot.ca/api/admin/x", { method: "OPTIONS" }))).toBe(true);
  });

  it("POST sans Origin → refus", () => {
    expect(origineValide(post())).toBe(false);
    expect(origineValide(post("null"))).toBe(false);
  });

  it("origine étrangère → refus, même avec X-Forwarded-Host falsifié", () => {
    expect(origineValide(post("https://evil.com"))).toBe(false);
    expect(origineValide(post("https://technolot.ca.evil.com"))).toBe(false);
    expect(origineValide(post("http://technolot.ca"))).toBe(false);
    expect(origineValide(post("https://evil.com", undefined, { "x-forwarded-host": "evil.com", host: "evil.com" }))).toBe(false);
  });

  it("site et variante www → accepté", () => {
    expect(origineValide(post("https://technolot.ca"))).toBe(true);
    expect(origineValide(post("https://www.technolot.ca"))).toBe(true);
    vi.stubEnv("SITE_URL", "https://www.technolot.ca");
    expect(origineValide(post("https://technolot.ca"))).toBe(true);
    expect(origineValide(post("https://www.technolot.ca"))).toBe(true);
  });

  it("localhost seulement en développement, sur le port servi", () => {
    vi.stubEnv("SITE_URL", "");
    const url = "http://localhost:3000/api/admin/x";
    expect(origineValide(post("http://localhost:3000", url))).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(origineValide(post("http://localhost:3000", url))).toBe(true);
    expect(origineValide(post("http://127.0.0.1:3000", url))).toBe(true);
    expect(origineValide(post("http://localhost:4000", url))).toBe(false);
  });

  it("Vercel : URL du déploiement et de la branche", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_URL", "techno-lot-abc123.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "techno-lot-git-dev.vercel.app");
    expect(origineValide(post("https://techno-lot-abc123.vercel.app"))).toBe(true);
    expect(origineValide(post("https://techno-lot-git-dev.vercel.app"))).toBe(true);
    expect(origineValide(post("https://autre.vercel.app"))).toBe(false);
  });
});

describe("âge de la session (reconnexion chaque jour)", () => {
  it("lit la dernière authentification primaire dans amr", () => {
    const t = maintenant();
    expect(derniereAuthentification([{ method: "password", timestamp: t - 100 }])).toBe(t - 100);
    // Le TOTP récent ne prolonge pas une connexion de plus de 24 h.
    expect(
      derniereAuthentification([
        { method: "password", timestamp: t - 90_000 },
        { method: "totp", timestamp: t - 10 },
      ]),
    ).toBe(t - 90_000);
  });

  it("repli sur last_sign_in_at, sinon inconnue", () => {
    const iso = new Date(Date.now() - 3_600_000).toISOString();
    expect(derniereAuthentification(undefined, iso)).toBe(Math.floor(Date.parse(iso) / 1000));
    expect(derniereAuthentification(["password"], null)).toBeNull();
  });

  it("expirée au-delà de 24 h ou si inconnue", () => {
    const t = maintenant();
    expect(sessionExpiree(t - 23 * 3600, t)).toBe(false);
    expect(sessionExpiree(t - 24 * 3600 - 1, t)).toBe(true);
    expect(sessionExpiree(null, t)).toBe(true);
  });
});

describe("verifierAdmin", () => {
  it("401 sans session", async () => {
    const v = await verifierAdmin();
    expect(v).toMatchObject({ ok: false, status: 401, motif: "non_connecte" });
  });

  it("403 si le courriel n'est pas dans ADMIN_EMAILS", async () => {
    supa.user = { id: ADMIN.id, email: "pirate@exemple.com" };
    expect(await verifierAdmin()).toMatchObject({ ok: false, status: 403, motif: "courriel_non_autorise" });
  });

  it("403 si est_admin n'est pas exactement true ou échoue", async () => {
    supa.user = ADMIN;
    supa.claims = { sub: ADMIN.id, amr: [{ method: "password", timestamp: maintenant() - 60 }] };
    supa.estAdmin = { data: false, error: null };
    expect(await verifierAdmin()).toMatchObject({ ok: false, status: 403, motif: "role_refuse" });
    supa.estAdmin = { data: "true", error: null };
    expect(await verifierAdmin()).toMatchObject({ ok: false, status: 403, motif: "role_refuse" });
    supa.estAdmin = { data: null, error: { code: "42501" } };
    expect(await verifierAdmin()).toMatchObject({ ok: false, status: 403, motif: "role_refuse" });
  });

  it("401 session_expiree après 24 h", async () => {
    supa.user = ADMIN;
    supa.claims = { sub: ADMIN.id, amr: [{ method: "otp", timestamp: maintenant() - 25 * 3600 }] };
    expect(await verifierAdmin()).toMatchObject({ ok: false, status: 401, motif: "session_expiree" });
  });

  it("admin connecté depuis moins de 24 h → contexte", async () => {
    supa.user = ADMIN;
    supa.claims = { sub: ADMIN.id, amr: [{ method: "password", timestamp: maintenant() - 3600 }] };
    const v = await verifierAdmin();
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.ctx.user.id).toBe(ADMIN.id);
      expect(v.ctx.requestId).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it("revendications illisibles → repli sur last_sign_in_at", async () => {
    supa.user = { ...ADMIN, last_sign_in_at: new Date(Date.now() - 60_000).toISOString() };
    supa.claims = null;
    expect((await verifierAdmin()).ok).toBe(true);
    supa.user = { ...ADMIN, last_sign_in_at: new Date(Date.now() - 30 * 3_600_000).toISOString() };
    expect(await verifierAdmin()).toMatchObject({ ok: false, motif: "session_expiree" });
  });
});

describe("exigerAdminRoute", () => {
  it("POST d'une origine étrangère → 403 no-store avec X-Request-Id, sans toucher la session", async () => {
    supa.user = ADMIN;
    const r = await exigerAdminRoute(
      new Request("https://technolot.ca/api/admin/x", { method: "POST", headers: { origin: "https://evil.com" } }),
    );
    expect(estRefus(r)).toBe(true);
    if (estRefus(r)) {
      expect(r.status).toBe(403);
      expect(r.headers.get("cache-control")).toBe("no-store");
      expect(r.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
      expect(await r.json()).toEqual({ error: "Origine refusée." });
    }
  });

  it("POST sans SITE_URL en production → 503", async () => {
    vi.stubEnv("SITE_URL", "");
    const r = await exigerAdminRoute(
      new Request("https://technolot.ca/api/admin/x", { method: "POST", headers: { origin: "https://technolot.ca" } }),
    );
    expect(estRefus(r) && r.status).toBe(503);
  });

  it("GET sans session → 401 ; admin → contexte", async () => {
    const refus = await exigerAdminRoute(new Request("https://technolot.ca/api/admin/x"));
    expect(estRefus(refus) && refus.status).toBe(401);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"evenement":"admin.refus"'));

    supa.user = ADMIN;
    supa.claims = { sub: ADMIN.id, amr: [{ method: "password", timestamp: maintenant() - 60 }] };
    const ok = await exigerAdminRoute(
      new Request("https://technolot.ca/api/admin/x", { method: "POST", headers: { origin: "https://www.technolot.ca" } }),
    );
    expect(estRefus(ok)).toBe(false);
  });
});

describe("exigerAdminPage", () => {
  async function cibleRedirection(chemin?: string): Promise<string> {
    try {
      await exigerAdminPage(chemin);
    } catch (e) {
      const digest = String((e as { digest?: string }).digest ?? "");
      return digest.split(";")[2] ?? digest;
    }
    return "AUCUNE";
  }

  it("401 → connexion avec next filtré", async () => {
    expect(await cibleRedirection("/admin/crm?x=1")).toBe("/admin/login?next=%2Fadmin%2Fcrm%3Fx%3D1");
    expect(await cibleRedirection("//evil.com")).toBe("/admin/login?next=%2Fadmin");
  });

  it("session expirée → error=session_expiree", async () => {
    supa.user = ADMIN;
    supa.claims = { sub: ADMIN.id, amr: [{ method: "password", timestamp: maintenant() - 26 * 3600 }] };
    expect(await cibleRedirection("/admin/lots")).toBe("/admin/login?error=session_expiree&next=%2Fadmin%2Flots");
  });

  it("403 → connexion avec message d'erreur", async () => {
    supa.user = { id: ADMIN.id, email: "pirate@exemple.com" };
    expect(await cibleRedirection("/admin")).toMatch(/^\/admin\/login\?error=Ce%20courriel/);
  });
});
