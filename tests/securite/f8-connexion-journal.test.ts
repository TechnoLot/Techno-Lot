import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Check 27 — 05 (mots de passe), 08 (journal) et 17 (liens de connexion).
 *
 *  05 : le mot de passe n'apparaît jamais dans une réponse ni dans le journal
 *       (sortie standard ET ligne envoyée à la base). Le hachage lui-même est
 *       celui de Supabase Auth (bcrypt), vérifié par le test SQL f8-droits.sql.
 *  08 : un échec de connexion produit UNE ligne `auth.echec` (IP, chemin,
 *       motif) sans secret.
 *  17 : liens magiques usés, expirés ou remplacés → refus avec un code fixe ;
 *       la demande de lien répond pareil quelle que soit l'adresse fournie
 *       (l'adresse est fixée par le serveur).
 */

const SECRET = "secret-de-test-vitest-0123456789-abcdefghij";
const MOT_DE_PASSE = "Mot-De-Passe-Tres-Secret-42!";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Simule = ReturnType<typeof vi.fn<(...a: any[]) => Promise<any>>>;

const s = vi.hoisted(() => ({
  rpc: [] as { nom: string; args: Record<string, unknown> }[],
  signInWithPassword: null as unknown as Simule,
  signInWithOtp: null as unknown as Simule,
  verifyOtp: null as unknown as Simule,
  exchange: null as unknown as Simule,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: async (nom: string, args: Record<string, unknown>) => {
      s.rpc.push({ nom, args });
      if (nom === "limite_debit") return { data: 0, error: null };
      return { data: { total_5min: 1, meme_ip_5min: 1 }, error: null };
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: (...a: unknown[]) => s.signInWithPassword(...a),
      signInWithOtp: (...a: unknown[]) => s.signInWithOtp(...a),
      verifyOtp: (...a: unknown[]) => s.verifyOtp(...a),
      exchangeCodeForSession: (...a: unknown[]) => s.exchange(...a),
    },
  }),
}));

import { POST as motDePasse } from "@/app/admin/auth/password/route";
import { POST as demandeLien } from "@/app/admin/auth/request/route";
import { GET as callback } from "@/app/admin/auth/callback/route";
import { requeteTexte } from "./f2-outils";

const SITE = "https://www.technolot.ca";
let sortie: string[] = [];

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("ADMIN_USERNAMES", "info:info@technolot.ca");
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("VERCEL", "");
  sortie = [];
  vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void sortie.push(a.map(String).join(" ")));
  vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => void sortie.push(a.map(String).join(" ")));
  vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void sortie.push(a.map(String).join(" ")));
  s.rpc = [];
  s.signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: null },
    error: { status: 400, code: "invalid_credentials", message: `Invalid login for ${MOT_DE_PASSE}` },
  });
  s.signInWithOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
  s.verifyOtp = vi.fn();
  s.exchange = vi.fn();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const attendre = () => new Promise((r) => setTimeout(r, 0));

function lignesJournal(): Record<string, unknown>[] {
  return sortie
    .map((l) => {
      try {
        return JSON.parse(l) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((x): x is Record<string, unknown> => !!x && typeof x.evenement === "string");
}

describe("08 et 05 — échec de connexion journalisé, sans secret", () => {
  it("mauvais mot de passe : une ligne auth.echec (IP, chemin, motif), mot de passe absent partout", async () => {
    const corps = JSON.stringify({ username: "info", password: MOT_DE_PASSE });
    const r = await motDePasse(
      requeteTexte(`${SITE}/admin/auth/password?jeton=ABC`, corps, "application/json", {
        "x-forwarded-for": "198.51.100.23",
        authorization: `Bearer ${"z".repeat(40)}`,
      }),
    );
    await attendre();
    expect(r.status).toBe(401);
    const texte = await r.text();
    expect(texte).toBe(JSON.stringify({ error: "Identifiants invalides." }));

    const echecs = lignesJournal().filter((l) => l.evenement === "auth.echec");
    expect(echecs).toHaveLength(1);
    expect(echecs[0]).toMatchObject({ resultat: "echec", ip: "198.51.100.23", chemin: "/admin/auth/password", statut: 401 });
    expect(JSON.stringify(echecs[0].details)).toContain("identifiants");

    // Ni sur la sortie standard, ni dans l'appel à la base, ni dans la réponse :
    // mot de passe, Bearer, chaîne de requête.
    const ligneBase = s.rpc.filter((c) => c.nom === "journal_securite_ajouter");
    expect(ligneBase.length).toBeGreaterThanOrEqual(1);
    for (const fuite of [MOT_DE_PASSE, "z".repeat(40), "jeton=ABC"]) {
      expect(sortie.join("\n")).not.toContain(fuite);
      expect(JSON.stringify(ligneBase)).not.toContain(fuite);
      expect(texte).not.toContain(fuite);
    }
    // Le secret serveur ne part que dans p_secret, jamais dans le contenu journalisé.
    for (const c of ligneBase) {
      const { p_secret, ...contenu } = c.args;
      expect(p_secret).toBe(SECRET);
      expect(JSON.stringify(contenu)).not.toContain(SECRET);
    }
    expect(sortie.join("\n")).not.toContain(SECRET);
  });

  it("compte inconnu : même réponse, ligne auth.echec, nom saisi jamais journalisé avec le mot de passe", async () => {
    const corps = JSON.stringify({ username: "pirate", password: MOT_DE_PASSE });
    const r = await motDePasse(requeteTexte(`${SITE}/admin/auth/password`, corps, "application/json"));
    await attendre();
    expect(r.status).toBe(401);
    expect(await r.text()).toBe(JSON.stringify({ error: "Identifiants invalides." }));
    expect(s.signInWithPassword).not.toHaveBeenCalled();
    expect(lignesJournal().filter((l) => l.evenement === "auth.echec")).toHaveLength(1);
    expect(sortie.join("\n")).not.toContain(MOT_DE_PASSE);
  });

  it("connexion réussie : la réponse ne contient ni mot de passe ni jeton de session", async () => {
    s.signInWithPassword.mockResolvedValue({
      data: { user: { id: "u-1" }, session: { access_token: "eyJ.jeton.acces", refresh_token: "rafraichir-123" } },
      error: null,
    });
    const corps = JSON.stringify({ username: "info", password: MOT_DE_PASSE });
    const r = await motDePasse(requeteTexte(`${SITE}/admin/auth/password`, corps, "application/json"));
    await attendre();
    const texte = await r.text();
    expect(r.status).toBe(200);
    for (const fuite of [MOT_DE_PASSE, "eyJ.jeton.acces", "rafraichir-123"]) {
      expect(texte).not.toContain(fuite);
      expect(sortie.join("\n")).not.toContain(fuite);
    }
    expect(lignesJournal().some((l) => l.evenement === "auth.connexion")).toBe(true);
  });
});

describe("17 — liens de connexion", () => {
  it("demande de lien : réponse identique quelle que soit l'adresse fournie ; le lien part toujours à l'admin", async () => {
    const reponses: string[] = [];
    for (const email of ["info@technolot.ca", "pirate@exemple.com", "inexistant@technolot.ca", ""]) {
      const r = await demandeLien(
        requeteTexte(`${SITE}/admin/auth/request`, new URLSearchParams({ email }).toString(), "application/x-www-form-urlencoded"),
      );
      reponses.push(`${r.status} ${await r.text()}`);
    }
    expect(new Set(reponses).size).toBe(1);
    expect(reponses[0]).toMatch(/^200 /);
    for (const [arg] of s.signInWithOtp.mock.calls) {
      expect(arg.email).toBe("info@technolot.ca");
      expect(arg.options.shouldCreateUser).toBe(false);
    }
  });

  const cas: [string, string, { code: string; message: string }, string][] = [
    ["lien déjà utilisé", "token_hash=usage&type=magiclink", { code: "otp_expired", message: "DETAIL_SUPABASE_1" }, "lien_expire"],
    ["lien expiré", "token_hash=vieux&type=magiclink", { code: "otp_expired", message: "DETAIL_SUPABASE_2" }, "lien_expire"],
    ["lien remplacé par un plus récent", "token_hash=ancien&type=email", { code: "otp_expired", message: "DETAIL_SUPABASE_3" }, "lien_expire"],
    ["jeton forgé", "token_hash=forge&type=magiclink", { code: "bad_jwt", message: "DETAIL_SUPABASE_4" }, "lien_invalide"],
    ["code PKCE usé", "code=deja-echange", { code: "flow_state_expired", message: "DETAIL_SUPABASE_5" }, "lien_expire"],
    ["code PKCE inconnu", "code=inconnu", { code: "bad_code_verifier", message: "DETAIL_SUPABASE_6" }, "lien_invalide"],
  ];
  for (const [nom, requete, erreur, attendu] of cas) {
    it(`${nom} → /admin/login?error=${attendu}, aucune session, aucun texte de Supabase`, async () => {
      s.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: erreur });
      s.exchange.mockResolvedValue({ data: { user: null, session: null }, error: erreur });
      const r = await callback(new Request(`${SITE}/admin/auth/callback?${requete}&next=/admin`));
      const loc = new URL(r.headers.get("location")!);
      expect(loc.origin + loc.pathname).toBe(`${SITE}/admin/login`);
      expect(loc.searchParams.get("error")).toBe(attendu);
      expect(loc.toString()).not.toContain(erreur.message);
      expect(loc.toString()).not.toContain(erreur.code);
      expect(r.headers.get("set-cookie") ?? "").not.toMatch(/sb-.*auth-token=[^;]+/);
    });
  }

  it("type d'OTP hors de la liste fermée → refusé sans appeler Supabase", async () => {
    for (const type of ["admin", "sms", "phone_change", "MAGICLINK", "magiclink%00"]) {
      s.verifyOtp.mockClear();
      const r = await callback(new Request(`${SITE}/admin/auth/callback?token_hash=x&type=${type}`));
      expect(new URL(r.headers.get("location")!).searchParams.get("error")).toBe("lien_invalide");
      expect(s.verifyOtp).not.toHaveBeenCalled();
    }
  });
});
