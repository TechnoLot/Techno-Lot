import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Routes de la double authentification (F5) : POST /admin/auth/mfa/activation
 * et /admin/auth/mfa/verification, avec la vraie garde (lib/securite/garde.ts)
 * et un client Supabase simulé qui consigne chaque appel. La limite de débit
 * est simulée pour vérifier qu'elle est appelée (compte ET IP) avant Supabase.
 */

type Facteur = { id: string; factor_type: string; status: string; created_at: string };

const etat = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; factors?: Facteur[] },
  aal: "aal1" as string | undefined,
  appels: [] as string[],
  clients: 0,
  verifier: { error: null } as { error: null | { code?: string; status?: number } },
  enroll: null as null | { data: unknown; error: null | { code?: string; status?: number } },
  limites: [] as { route: string; cle: string }[],
  refuserLimite: null as null | string,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    etat.clients += 1;
    return {
      auth: {
        getUser: async () => {
          etat.appels.push("getUser");
          return { data: { user: etat.user }, error: null };
        },
        getClaims: async () =>
          etat.user
            ? {
                data: {
                  claims: {
                    sub: etat.user.id,
                    aal: etat.aal,
                    amr: [{ method: "password", timestamp: Math.floor(Date.now() / 1000) - 60 }],
                  },
                },
                error: null,
              }
            : { data: null, error: { message: "x" } },
        mfa: {
          unenroll: async ({ factorId }: { factorId: string }) => {
            etat.appels.push(`unenroll:${factorId}`);
            return { data: { id: factorId }, error: null };
          },
          enroll: async (p: { factorType: string; friendlyName: string }) => {
            etat.appels.push(`enroll:${p.factorType}`);
            return (
              etat.enroll ?? {
                data: {
                  id: "f-nouveau",
                  type: "totp",
                  friendly_name: p.friendlyName,
                  totp: { qr_code: "data:image/svg+xml;utf-8,<svg/>", secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://x" },
                },
                error: null,
              }
            );
          },
          challengeAndVerify: async ({ factorId }: { factorId: string; code: string }) => {
            etat.appels.push(`verify:${factorId}`);
            return { data: etat.verifier.error ? null : { access_token: "x" }, error: etat.verifier.error };
          },
        },
      },
      rpc: async (nom: string) => {
        etat.appels.push(`rpc:${nom}`);
        return { data: true, error: null };
      },
    };
  },
}));

vi.mock("@/lib/securite/limite", async (original) => {
  const vrai = await original<typeof import("@/lib/securite/limite")>();
  return {
    ...vrai,
    limiterSelon: async (regle: { route: string }, cle: string) => {
      etat.limites.push({ route: regle.route, cle });
      etat.appels.push(`limite:${regle.route}`);
      return etat.refuserLimite === regle.route ? { permis: false, attente: 240 } : { permis: true, attente: 0 };
    },
  };
});

import { POST as activer } from "@/app/admin/auth/mfa/activation/route";
import { POST as verifier } from "@/app/admin/auth/mfa/verification/route";

const SITE = "https://technolot.ca";
const ADMIN_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const FACTEUR_VERIFIE = "11111111-2222-4333-8444-555555555555";
const FACTEUR_EN_ATTENTE = "22222222-3333-4444-8555-666666666666";
const facteur = (id: string, status: string): Facteur => ({
  id,
  factor_type: "totp",
  status,
  created_at: "2026-10-30T12:00:00Z",
});

function post(chemin: string, corps?: unknown, entetes: Record<string, string> = {}) {
  const texte = corps === undefined ? undefined : typeof corps === "string" ? corps : JSON.stringify(corps);
  return new Request(`${SITE}${chemin}`, {
    method: "POST",
    headers: {
      origin: SITE,
      "x-real-ip": "203.0.113.7",
      ...(texte !== undefined
        ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(texte)) }
        : {}),
      ...entetes,
    },
    body: texte,
  });
}

const lignesJournal = () =>
  (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("SECURITE_RPC_SECRET", "");
  etat.user = null;
  etat.aal = "aal1";
  etat.appels = [];
  etat.clients = 0;
  etat.verifier = { error: null };
  etat.enroll = null;
  etat.limites = [];
  etat.refuserLimite = null;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /admin/auth/mfa/verification", () => {
  it("code non numérique, de mauvaise longueur ou champ inconnu → 400 AVANT tout appel à Supabase", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_VERIFIE, "verified")] };
    for (const corps of [
      { code: "12345a" },
      { code: "12345" },
      { code: "1234567" },
      { code: " 123456" },
      { code: 123456 },
      { code: "123456", role: "admin" },
      { code: "123456", factorId: "pas-un-uuid" },
      {},
      [],
    ]) {
      const r = await verifier(post("/admin/auth/mfa/verification", corps));
      expect(r.status).toBe(400);
      expect(await r.json()).toEqual({ error: "Entre le code à 6 chiffres de ton application d'authentification." });
    }
    expect(etat.clients).toBe(0);
    expect(etat.appels).toEqual([]);
  });

  it("pas du JSON → 415, rien d'appelé", async () => {
    const r = await verifier(
      post("/admin/auth/mfa/verification", undefined, { "content-type": "text/plain", "content-length": "6" }),
    );
    expect(r.status).toBe(415);
    expect(etat.clients).toBe(0);
  });

  it("sans session → 401 ; origine étrangère → 403 ; ni limite ni vérification", async () => {
    const sans = await verifier(post("/admin/auth/mfa/verification", { code: "123456" }));
    expect(sans.status).toBe(401);
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_VERIFIE, "verified")] };
    const evil = await verifier(post("/admin/auth/mfa/verification", { code: "123456" }, { origin: "https://evil.example" }));
    expect(evil.status).toBe(403);
    expect(etat.limites).toEqual([]);
    expect(etat.appels.some((a) => a.startsWith("verify:"))).toBe(false);
  });

  it("courriel hors ADMIN_EMAILS → 403", async () => {
    etat.user = { id: ADMIN_ID, email: "pirate@exemple.com", factors: [facteur(FACTEUR_VERIFIE, "verified")] };
    expect((await verifier(post("/admin/auth/mfa/verification", { code: "123456" }))).status).toBe(403);
    expect(etat.limites).toEqual([]);
  });

  it("session aal1 + bon code → limite (compte ET IP) puis vérification → 200, journal auth.connexion aal2", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_VERIFIE, "verified")] };
    const r = await verifier(post("/admin/auth/mfa/verification", { code: "123456" }));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({ ok: true });
    expect(etat.limites).toEqual([
      { route: "auth-mfa:compte:5min", cle: ADMIN_ID },
      { route: "auth-mfa:ip:5min", cle: "203.0.113.7" },
    ]);
    // La limite passe AVANT la vérification ; jamais est_admin (aal1).
    expect(etat.appels.filter((a) => !a.startsWith("getUser"))).toEqual([
      "limite:auth-mfa:compte:5min",
      "limite:auth-mfa:ip:5min",
      `verify:${FACTEUR_VERIFIE}`,
    ]);
    const journal = lignesJournal();
    expect(journal.some((l) => l.includes('"evenement":"auth.connexion"') && l.includes('"niveau":"aal2"'))).toBe(true);
    expect(journal.some((l) => l.includes("123456"))).toBe(false);
  });

  it("limite dépassée (compte ou IP) → 429 + Retry-After, aucune vérification", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_VERIFIE, "verified")] };
    for (const route of ["auth-mfa:compte:5min", "auth-mfa:ip:5min"]) {
      etat.appels = [];
      etat.refuserLimite = route;
      const r = await verifier(post("/admin/auth/mfa/verification", { code: "123456" }));
      expect(r.status).toBe(429);
      expect(r.headers.get("retry-after")).toBe("240");
      expect(await r.json()).toEqual({ error: "Trop de codes erronés. Réessaie dans quelques minutes." });
      expect(etat.appels.some((a) => a.startsWith("verify:"))).toBe(false);
    }
  });

  it("code faux → 401 + journal auth.mfa_echec (sans le code)", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_VERIFIE, "verified")] };
    etat.verifier = { error: { code: "mfa_verification_failed", status: 422 } };
    const r = await verifier(post("/admin/auth/mfa/verification", { code: "654321" }));
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "Code invalide. Vérifie l'heure de ton téléphone et réessaie." });
    const journal = lignesJournal();
    expect(journal.some((l) => l.includes('"evenement":"auth.mfa_echec"'))).toBe(true);
    expect(journal.some((l) => l.includes("654321"))).toBe(false);
  });

  it("TOTP désactivé dans Supabase → 503 avec le réglage à faire", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_VERIFIE, "verified")] };
    etat.verifier = { error: { code: "mfa_totp_verify_not_enabled", status: 422 } };
    const r = await verifier(post("/admin/auth/mfa/verification", { code: "123456" }));
    expect(r.status).toBe(503);
    expect((await r.json()).error).toMatch(/Authentication → Multi-Factor/);
  });

  it("activation : facteur en attente + bon code → 200, journal auth.mfa_active", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_EN_ATTENTE, "unverified")] };
    const r = await verifier(post("/admin/auth/mfa/verification", { code: "123456", factorId: FACTEUR_EN_ATTENTE }));
    expect(r.status).toBe(200);
    expect(etat.appels).toContain(`verify:${FACTEUR_EN_ATTENTE}`);
    expect(lignesJournal().some((l) => l.includes('"evenement":"auth.mfa_active"'))).toBe(true);
  });

  it("activation refusée si un facteur vérifié existe déjà ou si le facteur n'est pas au compte → 409", async () => {
    etat.user = {
      id: ADMIN_ID,
      email: "info@technolot.ca",
      factors: [facteur(FACTEUR_VERIFIE, "verified"), facteur(FACTEUR_EN_ATTENTE, "unverified")],
    };
    expect(
      (await verifier(post("/admin/auth/mfa/verification", { code: "123456", factorId: FACTEUR_EN_ATTENTE }))).status,
    ).toBe(409);
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [] };
    expect(
      (await verifier(post("/admin/auth/mfa/verification", { code: "123456", factorId: FACTEUR_EN_ATTENTE }))).status,
    ).toBe(409);
    expect(etat.appels.some((a) => a.startsWith("verify:"))).toBe(false);
  });

  it("connexion sans facteur vérifié → 409, aucune vérification", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_EN_ATTENTE, "unverified")] };
    expect((await verifier(post("/admin/auth/mfa/verification", { code: "123456" }))).status).toBe(409);
    expect(etat.appels.some((a) => a.startsWith("verify:"))).toBe(false);
  });
});

describe("POST /admin/auth/mfa/activation", () => {
  it("désinscrit d'abord le facteur non vérifié, puis inscrit et renvoie QR + clé (no-store)", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_EN_ATTENTE, "unverified")] };
    const r = await activer(post("/admin/auth/mfa/activation"));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({
      factorId: "f-nouveau",
      qr: "data:image/svg+xml;utf-8,<svg/>",
      secret: "JBSWY3DPEHPK3PXP",
    });
    expect(etat.appels.filter((a) => a !== "getUser")).toEqual([`unenroll:${FACTEUR_EN_ATTENTE}`, "enroll:totp"]);
  });

  it("facteur vérifié existant → 409, aucune inscription (une session aal1 n'ajoute pas d'appareil)", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [facteur(FACTEUR_VERIFIE, "verified")] };
    const r = await activer(post("/admin/auth/mfa/activation"));
    expect(r.status).toBe(409);
    expect(etat.appels.filter((a) => a !== "getUser")).toEqual([]);
  });

  it("TOTP désactivé dans Supabase → 503 avec un message clair", async () => {
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [] };
    etat.enroll = { data: null, error: { code: "mfa_totp_enroll_not_enabled", status: 422 } };
    const r = await activer(post("/admin/auth/mfa/activation"));
    expect(r.status).toBe(503);
    expect((await r.json()).error).toMatch(/désactivée dans Supabase/);
  });

  it("sans session → 401 ; origine étrangère → 403 ; rien d'inscrit", async () => {
    expect((await activer(post("/admin/auth/mfa/activation"))).status).toBe(401);
    etat.user = { id: ADMIN_ID, email: "info@technolot.ca", factors: [] };
    expect((await activer(post("/admin/auth/mfa/activation", undefined, { origin: "https://evil.example" }))).status).toBe(
      403,
    );
    expect(etat.appels.some((a) => a.startsWith("enroll"))).toBe(false);
  });
});
