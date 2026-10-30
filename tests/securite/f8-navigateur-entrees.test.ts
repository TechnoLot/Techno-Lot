import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Check 27 — essais « casse-le » qui manquaient aux tests F2-F9 :
 *  07 XSS (données structurées), 10 injection (ilike), 11/02 secrets dans le
 *  code envoyé au navigateur, 13 CORS, 15 témoins de session (vrai
 *  @supabase/ssr), 19 paiements / webhook, 20 erreurs, CI.
 */

const RACINE = join(__dirname, "..", "..");

function fichiers(dossiers: string[], filtre: (f: string) => boolean): string[] {
  const sortie: string[] = [];
  const parcourir = (d: string) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d)) {
      if (e === "node_modules" || e === ".next" || e.startsWith(".git")) continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (filtre(e)) sortie.push(relative(RACINE, p).split(sep).join("/"));
    }
  };
  for (const d of dossiers) {
    const abs = join(RACINE, d);
    if (existsSync(abs) && statSync(abs).isFile()) sortie.push(d);
    else parcourir(abs);
  }
  return sortie.sort();
}

const lire = (f: string) => readFileSync(join(RACINE, f), "utf8");
const SOURCES = fichiers(["app", "lib", "components", "middleware.ts", "next.config.mjs"], (f) => /\.(tsx?|mjs|js)$/.test(f));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("07 — XSS : données structurées (JSON-LD)", () => {
  it("un titre piégé ne peut pas fermer la balise <script>", async () => {
    const { default: JsonLd } = await import("@/components/seo/JsonLd");
    const charge = { name: '</script><script>alert(1)</script><!--', "@type": "Article" };
    const el = JsonLd({ data: charge }) as unknown as { props: { dangerouslySetInnerHTML: { __html: string } } };
    const html = el.props.dangerouslySetInnerHTML.__html;
    expect(html).not.toMatch(/</);
    expect(JSON.parse(html)).toEqual(charge); // le contenu reste exact (\u003c est du JSON valide)
  });
});

describe("10 — injection : recherche ilike", () => {
  it("%, _ et \\ deviennent du texte ; aucune virgule ni parenthèse ne sort du motif", async () => {
    const { echapperLike } = await import("@/lib/admin/destruction");
    expect(echapperLike("100%")).toBe("100\\%");
    expect(echapperLike("a_b")).toBe("a\\_b");
    expect(echapperLike("c:\\x")).toBe("c:\\\\x");
    for (const charge of ["%' OR 1=1 --", "x),name.eq.y", "*", "'; drop table lots; --", "%%%%"]) {
      const e = echapperLike(charge);
      // Plus aucun joker libre : chaque % ou _ est précédé d'un \.
      expect(e.replace(/\\[\\%_]/g, "")).not.toMatch(/[%_]/);
    }
  });

  it("aucun filtre PostgREST bâti à la main depuis une entrée (.or( / .filter( avec gabarit)", () => {
    const suspects: string[] = [];
    for (const f of SOURCES) {
      lire(f)
        .split("\n")
        .forEach((l, i) => {
          if (/\.(or|filter)\(\s*`/.test(l)) suspects.push(`${f}:${i + 1}`);
        });
    }
    expect(suspects).toEqual([]);
  });

  it("aucune requête SQL brute côté application (postgres, pg, sql``)", () => {
    const paquet = JSON.parse(lire("package.json")) as { dependencies: Record<string, string> };
    for (const p of ["pg", "postgres", "mysql2", "knex", "@neondatabase/serverless"]) expect(paquet.dependencies).not.toHaveProperty(p);
  });
});

describe("11/02 — aucun secret dans le code envoyé au navigateur", () => {
  const CLIENTS = SOURCES.filter((f) => /^\s*["']use client["']/.test(lire(f)));

  it("les fichiers « use client » ne lisent que des variables NEXT_PUBLIC_ (et NODE_ENV)", () => {
    expect(CLIENTS.length).toBeGreaterThan(10);
    const fautes: string[] = [];
    for (const f of CLIENTS) {
      for (const m of lire(f).matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        if (!m[1].startsWith("NEXT_PUBLIC_") && m[1] !== "NODE_ENV") fautes.push(`${f}: ${m[1]}`);
      }
      if (/process\.env\[/.test(lire(f))) fautes.push(`${f}: accès dynamique à process.env`);
    }
    expect(fautes).toEqual([]);
  });

  it("aucune variable secrète ne porte le préfixe NEXT_PUBLIC_", () => {
    const publiques = new Set<string>();
    for (const f of SOURCES) for (const m of lire(f).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) publiques.add(m[0]);
    for (const n of publiques) expect(n).not.toMatch(/SECRET|SERVICE_ROLE|TOKEN|PRIVATE|PASSWORD|API_KEY/);
  });

  it("aucun motif de clé dans les sources versionnées (hors images data:)", () => {
    const motifs: [string, RegExp][] = [
      ["Anthropic", /sk-ant-[A-Za-z0-9_-]{10,}/],
      ["Supabase secrète", /sb_secret_[A-Za-z0-9_-]{10,}/],
      ["JWT", /eyJhbGciOi[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
      ["clé privée", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
      ["Google", /AIza[0-9A-Za-z_-]{35}/],
      ["GitHub", /gh[pousr]_[A-Za-z0-9]{36}/],
      ["Resend", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/],
    ];
    const tous = fichiers(["app", "lib", "components", "assets", "public", "scripts", "supabase", "middleware.ts", "next.config.mjs"], (f) =>
      /\.(tsx?|mjs|js|json|html|sql|toml|sh|ps1|txt|md)$/.test(f),
    );
    const trouves: string[] = [];
    for (const f of tous) {
      lire(f)
        .split("\n")
        .forEach((l, i) => {
          if (l.includes("data:image")) return;
          for (const [nom, re] of motifs) if (re.test(l)) trouves.push(`${f}:${i + 1} (${nom})`);
        });
    }
    expect(trouves).toEqual([]);
  });
});

describe("13 — CORS : aucune origine étrangère autorisée", () => {
  it("aucun en-tête Access-Control-Allow-* posé par le code, la config ou .htaccess", () => {
    const tous = [...SOURCES, ...fichiers(["public"], (f) => f === ".htaccess")];
    const trouves = tous.filter((f) => /Access-Control-Allow/i.test(lire(f)));
    expect(trouves).toEqual([]);
  });
});

describe("15 — témoins de session (vrai @supabase/ssr)", () => {
  function jwt(payload: Record<string, unknown>): string {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.c2lnbmF0dXJl`;
  }

  async function poserSession(nodeEnv: string) {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.resetModules();
    const { OPTIONS_COOKIES } = await import("@/lib/supabase/options-cookies");
    const { createServerClient } = await import("@supabase/ssr");
    const poses: { name: string; value: string; options: Record<string, unknown> }[] = [];
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const user = { id: "u-1", aud: "authenticated", role: "authenticated", email: "info@technolot.ca" };
    const fauxFetch = async (url: RequestInfo | URL) =>
      String(url).includes("/auth/v1/user")
        ? new Response(JSON.stringify(user), { status: 200, headers: { "content-type": "application/json" } })
        : new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    const sb = createServerClient("https://exemple.supabase.co", "cle-publique-de-test", {
      cookieOptions: OPTIONS_COOKIES,
      global: { fetch: fauxFetch as typeof fetch },
      cookies: {
        getAll: () => [],
        setAll: (c) => {
          for (const x of c) poses.push(x as never);
        },
      },
    });
    const { error } = await sb.auth.setSession({
      access_token: jwt({ sub: "u-1", exp, aud: "authenticated", role: "authenticated", aal: "aal1" }),
      refresh_token: "rafraichir-test",
    });
    expect(error).toBeNull();
    await new Promise((r) => setTimeout(r, 20));
    return poses;
  }

  it("production : HttpOnly, Secure, SameSite=Lax, chemin / sur chaque témoin de session posé", async () => {
    const poses = await poserSession("production");
    const session = poses.filter((p) => /^sb-.*-auth-token/.test(p.name) && p.value);
    expect(session.length).toBeGreaterThan(0);
    for (const p of session) {
      expect(p.options.httpOnly, p.name).toBe(true);
      expect(p.options.secure, p.name).toBe(true);
      expect(String(p.options.sameSite).toLowerCase(), p.name).toBe("lax");
      expect(p.options.path, p.name).toBe("/");
    }
  });

  it("serveur et middleware utilisent les mêmes options (aucun createBrowserClient restant)", () => {
    expect(lire("lib/supabase/server.ts")).toMatch(/cookieOptions:\s*OPTIONS_COOKIES/);
    expect(lire("middleware.ts")).toMatch(/cookieOptions:\s*OPTIONS_COOKIES/);
    expect(SOURCES.filter((f) => /createBrowserClient/.test(lire(f)))).toEqual([]);
  });
});

describe("19 — paiements et webhooks", () => {
  it("aucun paiement dans l'application (aucune bibliothèque ni route de paiement)", () => {
    const paquet = JSON.parse(lire("package.json")) as { dependencies: Record<string, string> };
    for (const p of Object.keys(paquet.dependencies)) expect(p).not.toMatch(/stripe|paypal|square|braintree|lemonsqueezy|paddle/i);
    const routes = fichiers(["app"], (f) => f === "route.ts");
    expect(routes.filter((r) => /checkout|paiement|payment|stripe|webhook/i.test(r))).toEqual([]);
  });

  it("avis eBay non signé ou en double : accusé 200 sans aucune écriture", async () => {
    const appels: string[] = [];
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        rpc: async (nom: string) => {
          appels.push(nom);
          return nom === "limite_debit" ? { data: 0, error: null } : { data: { total_5min: 1, meme_ip_5min: 1 }, error: null };
        },
        from: (t: string) => {
          appels.push(`from:${t}`);
          throw new Error("base");
        },
      }),
    }));
    vi.stubEnv("SECURITE_RPC_SECRET", "secret-de-test-vitest-0123456789-abcdefghij");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
    vi.stubEnv("VERCEL", "");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.resetModules();
    const { POST } = await import("@/app/api/ebay/account-deletion/route");
    const corps = JSON.stringify({
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION" },
      notification: { notificationId: "n-1", data: { username: "acheteur", userId: "x" } },
    });
    for (let i = 0; i < 2; i++) {
      const r = await POST(
        new Request("https://www.technolot.ca/api/ebay/account-deletion", {
          method: "POST",
          body: corps,
          headers: { "content-type": "application/json", "content-length": String(corps.length) },
        }),
      );
      expect(r.status).toBe(200);
    }
    expect(appels.filter((a) => a !== "limite_debit" && a !== "journal_securite_ajouter")).toEqual([]);
    vi.doUnmock("@supabase/supabase-js");
  });
});

describe("20 — erreurs sans fuite", () => {
  it("reponseErreur : message public + ref, jamais la pile, le chemin ni la requête SQL", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { reponseErreur } = await import("@/lib/securite/erreurs");
    const err = new Error('relation "public.lots" does not exist: select * from lots where id = 1');
    err.stack = "Error: x\n    at f (C:\\Users\\Admin\\app\\route.ts:10:5)\n    at /home/node/node_modules/next/x.js:1:1";
    const r = reponseErreur(500, "Erreur interne. Réessayez plus tard.", { err });
    const texte = await r.text();
    expect(Object.keys(JSON.parse(texte)).sort()).toEqual(["error", "ref"]);
    expect(texte).not.toMatch(/select|public\.lots|node_modules|C:\\\\|\/home\/|at f/);
  });

  it("aucune réponse ne renvoie error.message, err.message ni .stack", () => {
    const fautes: string[] = [];
    for (const f of SOURCES.filter((x) => x.startsWith("app/") || x === "middleware.ts")) {
      lire(f)
        .split("\n")
        .forEach((l, i) => {
          if (/\.stack\b/.test(l) || /(json|Response)\(.*\b(error|err|e)\.message/.test(l)) fautes.push(`${f}:${i + 1}`);
        });
    }
    expect(fautes).toEqual([]);
  });
});

describe("CI — les tests de sécurité tournent à chaque envoi", () => {
  it(".github/workflows/securite.yml lance tsc, les tests, la garde et npm audit, sans secret", () => {
    const ci = lire(".github/workflows/securite.yml");
    for (const etape of [
      "npm ci",
      "npx tsc --noEmit",
      "npm test",
      "node scripts/verif-garde-admin.mjs",
      "npm audit --omit=dev --audit-level=high",
    ]) {
      expect(ci, etape).toContain(etape);
    }
    expect(ci).toMatch(/push:[\s\S]*branches:[\s\S]*dev[\s\S]*main/);
    expect(ci).toMatch(/pull_request/);
    expect(ci).toMatch(/node-version:\s*["']?24/);
    expect(ci).not.toMatch(/secrets\./);
  });
});

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
