import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Routes admin (F3) : la garde commune (lib/securite/garde.ts, vraie) refuse
 * AVANT tout accès à la base, à un service tiers ou au corps de la requête.
 * Le client Supabase de session est simulé : chaque `from()` / `rpc()` est
 * consigné ; le client `service_role`, Resend et Anthropic aussi.
 */

const etat = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; last_sign_in_at?: string },
  estAdmin: { data: false as unknown, error: null as unknown },
  appels: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: etat.user }, error: null }),
      // Session connectée : jeton vérifié récent, double authentification faite (aal2, F5).
      getClaims: async () =>
        etat.user
          ? {
              data: {
                claims: {
                  sub: etat.user.id,
                  aal: "aal2",
                  amr: [{ method: "password", timestamp: Math.floor(Date.now() / 1000) - 60 }],
                },
              },
              error: null,
            }
          : { data: null, error: { message: "x" } },
      signOut: async () => ({ error: null }),
    },
    rpc: async (nom: string) => {
      etat.appels.push(`rpc:${nom}`);
      return nom === "est_admin" ? etat.estAdmin : { data: null, error: null };
    },
    from: (table: string) => {
      etat.appels.push(`from:${table}`);
      throw new Error("base appelée");
    },
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => {
    etat.appels.push("service_role");
    throw new Error("client service appelé");
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async () => {
        etat.appels.push("resend");
        return { data: null, error: null };
      },
    };
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: async () => etat.appels.push("anthropic") };
    beta = { messages: { create: async () => etat.appels.push("anthropic") } };
  },
}));

const SITE = "https://technolot.ca";
const UUID = "11111111-2222-4333-8444-555555555555";
const ADMIN = { id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", email: "info@technolot.ca" };
const INTRUS = { id: "99999999-8888-4777-8666-555555555555", email: "intrus@example.com" };

type Handler = (request: Request, props?: unknown) => Promise<Response>;
type Cas = { module: string; methode: string; chemin: string; props?: unknown; corps?: string };

const props = (p: Record<string, string>) => ({ params: Promise.resolve(p) });

/** Chaque route handler admin de app/api/admin et de app/admin/(dashboard). */
const CAS: Cas[] = [
  { module: "@/app/api/admin/ads-sync/route", methode: "GET", chemin: "/api/admin/ads-sync" },
  { module: "@/app/api/admin/ads-sync/route", methode: "POST", chemin: "/api/admin/ads-sync", corps: "{}" },
  { module: "@/app/api/admin/diagnostic-ip/route", methode: "GET", chemin: "/api/admin/diagnostic-ip" },
  { module: "@/app/api/admin/ebay-import/route", methode: "POST", chemin: "/api/admin/ebay-import", corps: '{"text":"x"}' },
  { module: "@/app/api/admin/ebay-sync/route", methode: "GET", chemin: "/api/admin/ebay-sync" },
  { module: "@/app/api/admin/ebay-sync/route", methode: "POST", chemin: "/api/admin/ebay-sync", corps: "{}" },
  { module: "@/app/api/admin/notifications/route", methode: "GET", chemin: "/api/admin/notifications" },
  { module: "@/app/api/admin/notifications/route", methode: "POST", chemin: "/api/admin/notifications", corps: '{"action":"vu"}' },
  { module: "@/app/api/admin/parse-email/route", methode: "POST", chemin: "/api/admin/parse-email", corps: '{"email":"x"}' },
  {
    module: "@/app/api/admin/soumissions/[id]/courriel/route",
    methode: "GET",
    chemin: `/api/admin/soumissions/${UUID}/courriel`,
    props: props({ id: UUID }),
  },
  {
    module: "@/app/api/admin/soumissions/[id]/courriel/hostinger/route",
    methode: "GET",
    chemin: `/api/admin/soumissions/${UUID}/courriel/hostinger`,
    props: props({ id: UUID }),
  },
  {
    module: "@/app/api/admin/soumissions/[id]/courriel/pieces/[pieceId]/route",
    methode: "GET",
    chemin: `/api/admin/soumissions/${UUID}/courriel/pieces/p1`,
    props: props({ id: UUID, pieceId: "p1" }),
  },
  { module: "@/app/admin/(dashboard)/calculatrice/api/saved/route", methode: "GET", chemin: "/admin/calculatrice/api/saved" },
  {
    module: "@/app/admin/(dashboard)/calculatrice/api/saved/route",
    methode: "POST",
    chemin: "/admin/calculatrice/api/saved",
    corps: '{"name":"x","data":{"items":[]}}',
  },
  {
    module: "@/app/admin/(dashboard)/calculatrice/api/saved/[id]/route",
    methode: "GET",
    chemin: `/admin/calculatrice/api/saved/${UUID}`,
    props: props({ id: UUID }),
  },
  {
    module: "@/app/admin/(dashboard)/calculatrice/api/saved/[id]/route",
    methode: "DELETE",
    chemin: `/admin/calculatrice/api/saved/${UUID}`,
    props: props({ id: UUID }),
  },
  {
    module: "@/app/admin/(dashboard)/calculatrice/api/send/route",
    methode: "POST",
    chemin: "/admin/calculatrice/api/send",
    corps: '{"to":"a@b.ca","message":"x"}',
  },
  { module: "@/app/admin/(dashboard)/calculatrice/embed/route", methode: "GET", chemin: "/admin/calculatrice/embed" },
  { module: "@/app/admin/(dashboard)/ebay/embed/route", methode: "GET", chemin: "/admin/ebay/embed" },
];

/** Routes à Bearer seulement (tâches planifiées). */
const CAS_CRON: Cas[] = [
  { module: "@/app/api/admin/auto-relances/route", methode: "POST", chemin: "/api/admin/auto-relances", corps: "{}" },
  { module: "@/app/api/cron/sync/route", methode: "POST", chemin: "/api/cron/sync", corps: "{}" },
];

function requete(c: Cas, origine: string | null = SITE, entetes: Record<string, string> = {}): Request {
  const h: Record<string, string> = { ...entetes };
  if (c.methode !== "GET" && c.methode !== "HEAD") {
    if (origine) h.origin = origine;
    if (c.corps !== undefined) {
      h["content-type"] = "application/json";
      h["content-length"] = String(Buffer.byteLength(c.corps));
    }
  }
  return new Request(`${SITE}${c.chemin}`, {
    method: c.methode,
    headers: h,
    body: c.corps !== undefined && c.methode !== "GET" ? c.corps : undefined,
  });
}

async function appeler(c: Cas, req: Request): Promise<Response> {
  const mod = (await import(c.module)) as unknown as Record<string, Handler>;
  const handler = mod[c.methode];
  expect(handler, `${c.module} exporte ${c.methode}`).toBeTypeOf("function");
  return handler(req, c.props);
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("SECURITE_RPC_SECRET", ""); // journal : sortie standard seulement
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("CRON_SECRET", "c".repeat(40));
  etat.user = null;
  etat.estAdmin = { data: false, error: null };
  etat.appels = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("routes admin : refus par la garde avant tout effet", () => {
  for (const c of CAS) {
    const nom = `${c.methode} ${c.chemin}`;

    it(`${nom} : sans session → 401, sans appel à la base`, async () => {
      const r = await appeler(c, requete(c));
      expect(r.status).toBe(401);
      expect(r.headers.get("cache-control")).toBe("no-store");
      expect(etat.appels).toEqual([]);
    });

    it(`${nom} : session non admin (courriel) → 403, sans appel à la base`, async () => {
      etat.user = INTRUS;
      const r = await appeler(c, requete(c));
      expect(r.status).toBe(403);
      expect(etat.appels).toEqual([]);
    });

    it(`${nom} : courriel listé mais rôle refusé par est_admin() → 403, aucune table lue`, async () => {
      etat.user = ADMIN;
      etat.estAdmin = { data: false, error: null };
      const r = await appeler(c, requete(c));
      expect(r.status).toBe(403);
      expect(etat.appels).toEqual(["rpc:est_admin"]);
    });

    if (c.methode !== "GET") {
      it(`${nom} : autre origine (CSRF) → 403 avant même la session`, async () => {
        etat.user = ADMIN;
        etat.estAdmin = { data: true, error: null };
        const r = await appeler(c, requete(c, "https://evil.example"));
        expect(r.status).toBe(403);
        expect(await r.json()).toEqual({ error: "Origine refusée." });
        expect(etat.appels).toEqual([]);
      });

      it(`${nom} : sans en-tête Origin → 403`, async () => {
        etat.user = ADMIN;
        const r = await appeler(c, requete(c, null));
        expect(r.status).toBe(403);
        expect(etat.appels).toEqual([]);
      });
    }
  }
});

describe("tâches planifiées : Bearer seulement", () => {
  for (const c of CAS_CRON) {
    const nom = `${c.methode} ${c.chemin}`;

    it(`${nom} : sans Bearer → 401, sans appel`, async () => {
      const r = await appeler(c, requete(c));
      expect(r.status).toBe(401);
      expect(etat.appels).toEqual([]);
    });

    it(`${nom} : Bearer faux → 401 ; une session admin ne suffit pas`, async () => {
      etat.user = ADMIN;
      etat.estAdmin = { data: true, error: null };
      const r = await appeler(c, requete(c, SITE, { authorization: `Bearer ${"x".repeat(40)}` }));
      expect(r.status).toBe(401);
      expect(etat.appels).toEqual([]);
    });

    it(`${nom} : aucun GET exporté (un GET ne doit rien modifier)`, async () => {
      const mod = (await import(c.module)) as Record<string, unknown>;
      expect(mod.GET).toBeUndefined();
    });
  }

  it("ads-sync et ebay-sync : Bearer faux sans session → 401 (cron.refus), sans appel", async () => {
    for (const c of CAS.filter((x) => x.methode === "POST" && /(ads|ebay)-sync/.test(x.chemin))) {
      etat.appels = [];
      const r = await appeler(c, requete(c, SITE, { authorization: `Bearer ${"x".repeat(40)}` }));
      expect(r.status).toBe(401);
      expect(etat.appels).toEqual([]);
    }
  });
});

describe("routes JSON : type de contenu exigé (CSRF « text/plain »)", () => {
  it("POST notifications en text/plain d'un admin → 415, aucune écriture", async () => {
    etat.user = ADMIN;
    etat.estAdmin = { data: true, error: null };
    // Jeton simulé : connexion récente, niveau aal2.
    etat.user = { ...ADMIN, last_sign_in_at: new Date().toISOString() };
    const corps = '{"action":"vu"}';
    const req = new Request(`${SITE}/api/admin/notifications`, {
      method: "POST",
      headers: { origin: SITE, "content-type": "text/plain", "content-length": String(corps.length) },
      body: corps,
    });
    const mod = (await import("@/app/api/admin/notifications/route")) as unknown as Record<string, Handler>;
    const r = await mod.POST(req);
    expect(r.status).toBe(415);
    expect(etat.appels).toEqual(["rpc:est_admin"]);
  });

  it("POST send (devis) avec un champ en trop → 400, aucun envoi", async () => {
    etat.user = { ...ADMIN, last_sign_in_at: new Date().toISOString() };
    etat.estAdmin = { data: true, error: null };
    const corps = JSON.stringify({ to: "client@exemple.ca", message: "Bonjour", role: "admin" });
    const req = new Request(`${SITE}/admin/calculatrice/api/send`, {
      method: "POST",
      headers: { origin: SITE, "content-type": "application/json", "content-length": String(Buffer.byteLength(corps)) },
      body: corps,
    });
    const mod = (await import("@/app/admin/(dashboard)/calculatrice/api/send/route")) as unknown as Record<string, Handler>;
    const r = await mod.POST(req);
    expect(r.status).toBe(400);
    expect(etat.appels).toEqual(["rpc:est_admin"]);
  });

  it("GET saved/[id] avec un identifiant invalide → 404 sans requête", async () => {
    etat.user = { ...ADMIN, last_sign_in_at: new Date().toISOString() };
    etat.estAdmin = { data: true, error: null };
    const mod = (await import("@/app/admin/(dashboard)/calculatrice/api/saved/[id]/route")) as unknown as Record<string, Handler>;
    const r = await mod.GET(new Request(`${SITE}/admin/calculatrice/api/saved/x`), props({ id: "1 or 1=1" }));
    expect(r.status).toBe(404);
    expect(etat.appels).toEqual(["rpc:est_admin"]);
  });
});
