import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Supabase simulé : client de session (témoins) et client sans session (RPC + vérification).
const s = vi.hoisted(() => ({
  attente: 0,
  exchange: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithOtp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: s.exchange,
      verifyOtp: s.verifyOtp,
      signInWithOtp: s.signInWithOtp,
      signInWithPassword: s.signInWithPassword,
      signOut: s.signOut,
      getUser: s.getUser,
    },
  }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: s.rpc }),
}));

import * as callback from "@/app/admin/auth/callback/route";
import * as demande from "@/app/admin/auth/request/route";
import * as motDePasse from "@/app/admin/auth/password/route";
import * as deconnexion from "@/app/admin/auth/signout/route";
import { cheminInterne } from "@/lib/securite/chemin-interne";
import { getRequestOrigin, origineConfiguree } from "@/lib/admin/origin";
import { CHARGES_DECODEES, CHARGES_REDIRECTION, requeteTexte } from "./f2-outils";

const SITE = "https://www.technolot.ca";
const ADMIN = { id: "11111111-2222-4333-8444-555555555555", email: "info@technolot.ca" };

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", "secret-de-test-vitest-0123456789-abcdefghij");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("ADMIN_EMAILS", ADMIN.email);
  vi.stubEnv("ADMIN_USERNAMES", "info:info@technolot.ca");
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("VERCEL", "");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  s.attente = 0;
  for (const f of [s.exchange, s.verifyOtp, s.signInWithOtp, s.signInWithPassword, s.signOut, s.getUser, s.rpc]) {
    f.mockReset();
  }
  s.rpc.mockImplementation(async (nom: string) =>
    nom === "limite_debit"
      ? { data: s.attente, error: null }
      : { data: { total_5min: 1, meme_ip_5min: 1 }, error: null },
  );
  s.exchange.mockResolvedValue({ data: { user: ADMIN }, error: null });
  s.verifyOtp.mockResolvedValue({ data: { user: ADMIN }, error: null });
  s.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  s.signInWithPassword.mockResolvedValue({ data: { user: ADMIN }, error: null });
  s.signOut.mockResolvedValue({ error: null });
  s.getUser.mockResolvedValue({ data: { user: ADMIN }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const location = (r: Response) => new URL(r.headers.get("location") ?? "", "https://base.invalid");

describe("charges de redirection du test T5 contre les vrais appelants", () => {
  it("cheminInterne (page de connexion, LoginForm) : aucune ne sort de /admin", () => {
    for (const c of CHARGES_REDIRECTION) {
      const recu = new URL(`${SITE}/admin/login?next=${c}`).searchParams.get("next");
      const n = cheminInterne(recu);
      expect(n === "/admin" || n.startsWith("/admin/")).toBe(true);
      expect(new URL(n, SITE).origin).toBe(SITE);
    }
    expect(cheminInterne("javascript:alert(1)")).toBe("/admin");
  });

  it("callback : 0 redirection hors site, même avec X-Forwarded-Host empoisonné", async () => {
    for (const c of CHARGES_REDIRECTION) {
      const r = await callback.GET(
        new Request(`${SITE}/admin/auth/callback?code=abc&next=${c}`, {
          headers: { "x-forwarded-host": "evil.com", host: "evil.com" },
        }),
      );
      const loc = location(r);
      expect(loc.origin).toBe(SITE);
      expect(loc.pathname.startsWith("/admin")).toBe(true);
    }
  });

  it("callback : un chemin /admin légitime est conservé", async () => {
    const r = await callback.GET(new Request(`${SITE}/admin/auth/callback?code=abc&next=/admin/crm?x=1`));
    expect(r.headers.get("location")).toBe(`${SITE}/admin/crm?x=1`);
  });

  it("request : champ next piégé → lien bâti sur SITE_URL, next = /admin, aucun compte créé", async () => {
    for (const c of [...CHARGES_DECODEES, "https://evil.com"]) {
      s.signInWithOtp.mockClear();
      const r = await demande.POST(
        requeteTexte(`${SITE}/admin/auth/request`, new URLSearchParams({ next: c }).toString(),
          "application/x-www-form-urlencoded", { "x-forwarded-host": "evil.com" }),
      );
      expect(r.status).toBe(200);
      const options = s.signInWithOtp.mock.calls[0][0].options;
      expect(options.emailRedirectTo).toBe(`${SITE}/admin/auth/callback?next=%2Fadmin`);
      expect(options.shouldCreateUser).toBe(false);
    }
  });

  it("password (formulaire natif) : next piégé → 303 vers /admin du site", async () => {
    for (const c of [...CHARGES_DECODEES, "javascript:alert(1)", "https://evil.com"]) {
      const r = await motDePasse.POST(
        requeteTexte(`${SITE}/admin/auth/password`,
          new URLSearchParams({ username: "info", password: "bon-mot-de-passe", next: c }).toString(),
          "application/x-www-form-urlencoded", { "x-forwarded-host": "evil.com" }),
      );
      expect(r.status).toBe(303);
      expect(r.headers.get("location")).toBe(`${SITE}/admin`);
    }
  });

  it("origine des liens : jamais l'en-tête Host en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = new Request("http://localhost:3000/x", { headers: { host: "evil.com", "x-forwarded-host": "evil.com" } });
    expect(origineConfiguree(req)).toBe(SITE);
    expect(getRequestOrigin(req)).toBe(SITE);
    vi.stubEnv("SITE_URL", "");
    expect(origineConfiguree(req)).toBe("https://www.technolot.ca");
    vi.stubEnv("NODE_ENV", "development");
    expect(origineConfiguree(req)).toBe("http://localhost:3000");
    expect(origineConfiguree(new Request("https://evil.com/x"))).toBe("https://www.technolot.ca");
  });
});

describe("callback : codes d'erreur seulement", () => {
  it("erreur Supabase dans l'URL → ?error=lien_expire, jamais le texte reçu", async () => {
    const r = await callback.GET(
      new Request(`${SITE}/admin/auth/callback?error=access_denied&error_code=otp_expired&error_description=Appelez+le+1-900`),
    );
    expect(location(r).searchParams.get("error")).toBe("lien_expire");
    expect(r.headers.get("location")).not.toMatch(/1-900|Appelez/);
  });

  it("échange refusé → lien_invalide (sans message Supabase)", async () => {
    s.exchange.mockResolvedValue({ data: { user: null }, error: { code: "bad_code_verifier", message: "secret detail" } });
    const r = await callback.GET(new Request(`${SITE}/admin/auth/callback?code=abc`));
    expect(location(r).searchParams.get("error")).toBe("lien_invalide");
    expect(r.headers.get("location")).not.toMatch(/secret/);
  });

  it("type d'OTP hors liste → lien_invalide, Supabase non appelé", async () => {
    const r = await callback.GET(new Request(`${SITE}/admin/auth/callback?token_hash=abc&type=admin`));
    expect(location(r).searchParams.get("error")).toBe("lien_invalide");
    expect(s.verifyOtp).not.toHaveBeenCalled();
  });

  it("limite 20 / 10 min par IP → ?error=trop_de_tentatives", async () => {
    s.attente = 300;
    const r = await callback.GET(new Request(`${SITE}/admin/auth/callback?code=abc`));
    expect(location(r).searchParams.get("error")).toBe("trop_de_tentatives");
    expect(s.exchange).not.toHaveBeenCalled();
  });
});

describe("password : messages génériques, limites, formes", () => {
  const json = (corps: unknown) =>
    requeteTexte(`${SITE}/admin/auth/password`, JSON.stringify(corps), "application/json");

  it("JSON : succès → 200", async () => {
    const r = await motDePasse.POST(json({ username: "info", password: "bon-mot-de-passe" }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true });
  });

  it("compte inconnu et mauvais mot de passe → même 401 « Identifiants invalides. », ≥ 600 ms", async () => {
    const debut = Date.now();
    const inconnu = await motDePasse.POST(json({ username: "personne", password: "x" }));
    expect(Date.now() - debut).toBeGreaterThanOrEqual(590);
    s.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { status: 400, code: "invalid_credentials", message: "Invalid login credentials" },
    });
    const mauvais = await motDePasse.POST(json({ username: "info", password: "mauvais" }));
    expect(inconnu.status).toBe(401);
    expect(mauvais.status).toBe(401);
    expect(await inconnu.json()).toEqual(await mauvais.json());
    expect(s.signInWithPassword).toHaveBeenCalledTimes(1); // le compte inconnu n'atteint pas Supabase
  });

  it("erreur Supabase inattendue → même message, aucun détail", async () => {
    s.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { status: 500, code: "unexpected_failure", message: "database xyz down" },
    });
    const r = await motDePasse.POST(json({ username: "info", password: "x" }));
    expect(await r.json()).toEqual({ error: "Identifiants invalides." });
  });

  it("formulaire natif : échec → 303 /admin/login?error=identifiants", async () => {
    s.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { status: 400, code: "invalid_credentials" } });
    const r = await motDePasse.POST(
      requeteTexte(`${SITE}/admin/auth/password`, "username=info&password=mauvais&next=%2Fadmin%2Fcrm",
        "application/x-www-form-urlencoded"),
    );
    expect(r.status).toBe(303);
    const loc = location(r);
    expect(loc.origin).toBe(SITE);
    expect(loc.pathname).toBe("/admin/login");
    expect(loc.searchParams.get("error")).toBe("identifiants");
    expect(loc.searchParams.get("next")).toBe("/admin/crm");
    expect(r.headers.get("location")).not.toMatch(/mauvais/);
  });

  it("limite atteinte → 429 + Retry-After (JSON) ou 303 trop_de_tentatives (formulaire)", async () => {
    s.attente = 45;
    const r = await motDePasse.POST(json({ username: "info", password: "x" }));
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("45");
    const f = await motDePasse.POST(
      requeteTexte(`${SITE}/admin/auth/password`, "username=info&password=x", "application/x-www-form-urlencoded"),
    );
    expect(f.status).toBe(303);
    expect(location(f).searchParams.get("error")).toBe("trop_de_tentatives");
    expect(s.signInWithPassword).not.toHaveBeenCalled();
  });

  it("429 de Supabase → 429 + Retry-After", async () => {
    s.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { status: 429, code: "over_request_rate_limit" } });
    const r = await motDePasse.POST(json({ username: "info", password: "x" }));
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBeTruthy();
  });

  it("type de contenu inconnu → 415 ; corps trop gros → 413", async () => {
    expect((await motDePasse.POST(requeteTexte(`${SITE}/admin/auth/password`, "x", "text/plain"))).status).toBe(415);
    const gros = await motDePasse.POST(json({ username: "info", password: "x".repeat(5000) }));
    expect(gros.status).toBe(413);
  });
});

describe("request : erreurs sans détail Supabase", () => {
  const appel = () =>
    demande.POST(requeteTexte(`${SITE}/admin/auth/request`, "next=%2Fadmin", "application/x-www-form-urlencoded"));

  it("erreur Supabase → 502 générique", async () => {
    s.signInWithOtp.mockResolvedValue({ error: { status: 500, code: "unexpected", message: "SMTP password wrong" } });
    const r = await appel();
    expect(r.status).toBe(502);
    expect(JSON.stringify(await r.json())).not.toMatch(/SMTP|unexpected|Supabase/);
  });

  it("limite 3 / h par IP → 429 + Retry-After, aucun courriel demandé", async () => {
    s.attente = 1800;
    const r = await appel();
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("1800");
    expect(s.signInWithOtp).not.toHaveBeenCalled();
  });
});

describe("signout", () => {
  it("POST seulement : aucun gestionnaire GET (→ 405 par Next)", () => {
    expect((deconnexion as Record<string, unknown>).GET).toBeUndefined();
  });

  it("Origin absente ou étrangère → 403, session intacte", async () => {
    const essais: Record<string, string>[] = [{}, { origin: "https://evil.example" }];
    for (const entetes of essais) {
      const r = await deconnexion.POST(new Request(`${SITE}/admin/auth/signout`, { method: "POST", headers: entetes }));
      expect(r.status).toBe(403);
    }
    expect(s.signOut).not.toHaveBeenCalled();
  });

  it("Origin du site → déconnexion globale + 303 vers /admin/login", async () => {
    const r = await deconnexion.POST(
      new Request(`${SITE}/admin/auth/signout`, { method: "POST", headers: { origin: SITE } }),
    );
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe(`${SITE}/admin/login`);
    expect(s.signOut).toHaveBeenCalledWith({ scope: "global" });
  });
});
