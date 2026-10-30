import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Check 27 — 01 (auth) et 09 (admin) : « essaie de casser » EXHAUSTIF.
 *
 * Contrairement aux listes écrites à la main des tests F3, ce fichier lit le
 * disque : toute route ou action serveur ajoutée plus tard est essayée
 * automatiquement, et une route publique qui n'est pas dans la liste blanche
 * fait échouer le test (refus par défaut).
 *
 *  - chaque méthode de chaque route admin / cron : sans session → 401, session
 *    d'un non-admin → 403 (cron : 401), sans AUCUN appel à la base, à Resend,
 *    à Anthropic ni au client service_role ;
 *  - chaque action serveur (« use server ») : sans session → refus, sans effet.
 */

const etat = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  appels: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: etat.user }, error: null }),
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
      signInWithPassword: async () => {
        etat.appels.push("auth:password");
        return { data: {}, error: null };
      },
      updateUser: async () => {
        etat.appels.push("auth:update");
        return { data: {}, error: null };
      },
      mfa: {
        unenroll: async () => {
          etat.appels.push("auth:unenroll");
          return { data: {}, error: null };
        },
      },
    },
    // est_admin répond toujours faux : un non-admin ne passe jamais.
    rpc: async (nom: string) => {
      etat.appels.push(`rpc:${nom}`);
      return nom === "est_admin" ? { data: false, error: null } : { data: null, error: null };
    },
    from: (table: string) => {
      etat.appels.push(`from:${table}`);
      throw new Error("base appelée");
    },
  }),
}));

// Client sans session (fonctions à secret, vérification du mot de passe) : le
// construire n'a aucun effet ; chaque appel réel est consigné.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: async (nom: string) => {
      etat.appels.push(`hors_session:rpc:${nom}`);
      return { data: null, error: null };
    },
    from: (table: string) => {
      etat.appels.push(`hors_session:from:${table}`);
      throw new Error("base appelée");
    },
    auth: {
      signInWithPassword: async () => {
        etat.appels.push("hors_session:auth:password");
        return { data: {}, error: null };
      },
      signOut: async () => ({ error: null }),
    },
  }),
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

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": "203.0.113.5" }),
  cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => undefined }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
  revalidateTag: () => undefined,
  unstable_noStore: () => undefined,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const RACINE = join(__dirname, "..", "..");
const SITE = "https://technolot.ca";
const UUID = "11111111-2222-4333-8444-555555555555";
const INTRUS = { id: "99999999-8888-4777-8666-555555555555", email: "intrus@example.com" };
const METHODES = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"] as const;

function fichiers(dossier: string, nom: (f: string) => boolean): string[] {
  const abs = join(RACINE, dossier);
  const sortie: string[] = [];
  const parcourir = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (nom(e)) sortie.push(relative(RACINE, p).split(sep).join("/"));
    }
  };
  parcourir(abs);
  return sortie.sort();
}

/** Toutes les routes de l'application (route.ts). */
const TOUTES_LES_ROUTES = fichiers("app", (f) => f === "route.ts");

/** Routes qui DOIVENT exiger l'admin (garde) ou le Bearer des tâches planifiées. */
const ROUTES_PROTEGEES = TOUTES_LES_ROUTES.filter(
  (f) => f.startsWith("app/api/admin/") || f.startsWith("app/admin/(dashboard)/") || f.startsWith("app/api/cron/"),
);

/** Routes à Bearer seulement : une session admin n'y suffit pas. */
const ROUTES_CRON = new Set(["app/api/admin/auto-relances/route.ts", "app/api/cron/sync/route.ts"]);

/**
 * Liste blanche des routes publiques, chacune avec la raison et le test qui
 * la protège. Toute nouvelle route hors de cette liste et hors des dossiers
 * protégés fait échouer « aucune route publique imprévue ».
 */
const ROUTES_PUBLIQUES: Record<string, string> = {
  "app/api/soumission/route.ts": "formulaire public (f2-soumission, f8-limites)",
  "app/api/track/route.ts": "suivi des pubs (f2-suivi-ebay, f8-limites)",
  "app/api/ebay/account-deletion/route.ts": "avis eBay, accusé sans effet (f2-suivi-ebay)",
  "app/(fr)/blog/ancien-lien/route.ts": "redirection relative (f2-suivi-ebay)",
  "app/(en)/en/blog/ancien-lien/route.ts": "redirection relative (f2-suivi-ebay)",
  "app/admin/auth/callback/route.ts": "lien magique (f2-auth)",
  "app/admin/auth/request/route.ts": "envoi du lien magique à l'adresse fixe (f2-auth)",
  "app/admin/auth/password/route.ts": "connexion (f2-auth, f8-limites)",
  "app/admin/auth/signout/route.ts": "déconnexion, Origin exigée (f2-auth)",
  "app/admin/auth/mfa/activation/route.ts": "garde de session MFA (f5-routes-mfa)",
  "app/admin/auth/mfa/verification/route.ts": "garde de session MFA (f5-routes-mfa)",
};

function modulePour(fichier: string): string {
  return "@/" + fichier.replace(/\.ts$/, "");
}

/** Chemin d'URL et paramètres dynamiques d'un fichier de route. */
function cheminEtProps(fichier: string): { chemin: string; props: unknown } {
  const segments = fichier
    .replace(/^app\//, "")
    .replace(/\/route\.ts$/, "")
    .split("/")
    .filter((s) => !/^\(.*\)$/.test(s));
  const params: Record<string, string> = {};
  const chemin =
    "/" +
    segments
      .map((s) => {
        const m = /^\[(.+)\]$/.exec(s);
        if (!m) return s;
        const v = m[1] === "id" ? UUID : "p1";
        params[m[1]] = v;
        return v;
      })
      .join("/");
  return { chemin, props: { params: Promise.resolve(params) } };
}

function requete(methode: string, chemin: string): Request {
  const h: Record<string, string> = {};
  let body: string | undefined;
  if (methode !== "GET" && methode !== "HEAD") {
    h.origin = SITE; // origine du site : seule la garde de session peut refuser
    h["content-type"] = "application/json";
    body = "{}";
    h["content-length"] = String(body.length);
  }
  return new Request(`${SITE}${chemin}`, { method: methode, headers: h, body });
}

type Handler = (r: Request, p?: unknown) => Promise<Response>;

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("SECURITE_RPC_SECRET", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("CRON_SECRET", "c".repeat(40));
  vi.stubEnv("RESEND_API_KEY", "re_test_cle_factice");
  vi.stubEnv("ANTHROPIC_API_KEY", "cle-factice");
  etat.user = null;
  etat.appels = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("inventaire des routes (refus par défaut)", () => {
  it("le disque contient bien les routes admin et cron attendues", () => {
    expect(ROUTES_PROTEGEES.length).toBeGreaterThanOrEqual(15);
    expect(ROUTES_PROTEGEES).toContain("app/api/admin/notifications/route.ts");
    expect(ROUTES_PROTEGEES).toContain("app/api/cron/sync/route.ts");
  });

  it("aucune route publique imprévue : chaque route est protégée ou dans la liste blanche", () => {
    const imprevues = TOUTES_LES_ROUTES.filter((f) => !ROUTES_PROTEGEES.includes(f) && !(f in ROUTES_PUBLIQUES));
    expect(imprevues).toEqual([]);
    // La liste blanche ne garde pas de route disparue.
    for (const f of Object.keys(ROUTES_PUBLIQUES)) expect(TOUTES_LES_ROUTES).toContain(f);
  });
});

describe("01/09 — chaque méthode de chaque route admin refuse sans effet", () => {
  for (const fichier of ROUTES_PROTEGEES) {
    const { chemin, props } = cheminEtProps(fichier);
    const cron = ROUTES_CRON.has(fichier);

    it(`${chemin} : sans session → 401 ; non-admin → ${cron ? 401 : 403} ; aucun effet`, async () => {
      const mod = (await import(modulePour(fichier))) as Record<string, unknown>;
      const methodes = METHODES.filter((m) => typeof mod[m] === "function");
      expect(methodes.length, `${fichier} exporte au moins une méthode`).toBeGreaterThan(0);

      for (const m of methodes) {
        const handler = mod[m] as Handler;

        etat.user = null;
        etat.appels = [];
        const anonyme = await handler(requete(m, chemin), props);
        expect(anonyme.status, `${m} ${chemin} sans session`).toBe(401);
        expect(etat.appels, `${m} ${chemin} sans session : aucun appel`).toEqual([]);
        const texte = await anonyme.text();
        expect(texte).not.toMatch(/at \w+ \(|node_modules|[A-Z]:\\|\/home\//);

        etat.user = INTRUS;
        etat.appels = [];
        const intrus = await handler(requete(m, chemin), props);
        expect(intrus.status, `${m} ${chemin} non-admin`).toBe(cron ? 401 : 403);
        expect(etat.appels, `${m} ${chemin} non-admin : aucun appel`).toEqual([]);
      }
    });
  }
});

/** Fichiers d'actions serveur (directive « use server » en tête). */
const FICHIERS_ACTIONS = [...fichiers("app", (f) => /\.tsx?$/.test(f)), ...fichiers("lib", (f) => /\.tsx?$/.test(f))].filter(
  (f) => /^\s*["']use server["']/.test(readFileSync(join(RACINE, f), "utf8")),
);

function estSucces(v: unknown): boolean {
  if (v === null || v === undefined || v === false) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return (v as Record<string, unknown>).ok === true;
  return true;
}

describe("01/09 — chaque action serveur refuse sans session, sans effet", () => {
  it("inventaire : au moins 6 fichiers d'actions", () => {
    expect(FICHIERS_ACTIONS.length).toBeGreaterThanOrEqual(6);
  });

  for (const fichier of FICHIERS_ACTIONS) {
    it(`${fichier} : chaque action exportée refuse`, async () => {
      const mod = (await import(modulePour(fichier))) as Record<string, unknown>;
      const actions = Object.entries(mod).filter(([, v]) => typeof v === "function");
      expect(actions.length).toBeGreaterThan(0);

      for (const [nom, fn] of actions) {
        for (const user of [null, INTRUS]) {
          etat.user = user;
          etat.appels = [];
          let resultat: unknown;
          try {
            // Arguments plausibles : la garde passe AVANT toute lecture des arguments.
            resultat = await (fn as (...a: unknown[]) => Promise<unknown>)(
              UUID,
              { id: UUID, actuel: "x", nouveau: "y".repeat(20), name: "x" },
              UUID,
            );
          } catch (e) {
            resultat = { lance: String(e) };
          }
          expect(estSucces(resultat), `${fichier} ${nom} (${user ? "non-admin" : "anonyme"})`).toBe(false);
          // Seule la garde peut parler à Supabase (est_admin pour le non-admin).
          const effets = etat.appels.filter((a) => a !== "rpc:est_admin");
          expect(effets, `${fichier} ${nom} : aucun effet`).toEqual([]);
        }
      }
    });
  }
});
