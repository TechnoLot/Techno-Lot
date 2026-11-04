import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Déconnexion après 1 h sans activité : route du signal, déconnexion
 * `?raison=inactivite`, message de la page de connexion, migration et montage
 * de la garde. Aucun appel réseau : Supabase est simulé.
 */

const SITE = "https://www.technolot.ca";
const ADMIN = { id: "11111111-2222-4333-8444-555555555555", email: "info@technolot.ca" };
const SESSION = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const s = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  estAdmin: true as unknown,
  claims: {} as Record<string, unknown>,
  getClaims: null as null | (() => Promise<unknown>),
  signOut: vi.fn(),
  rpc: vi.fn(),
  journal: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: s.user }, error: null }),
      getClaims: async () => (s.getClaims ? s.getClaims() : { data: { claims: s.claims }, error: null }),
      signOut: s.signOut,
    },
    rpc: async (nom: string) =>
      nom === "est_admin" ? { data: s.estAdmin, error: null } : { data: null, error: null },
  }),
}));

// Client à secret (lib/securite/rpc.ts).
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc: s.rpc }) }));

vi.mock("@/lib/securite/journal", async (original) => ({
  ...(await original<typeof import("@/lib/securite/journal")>()),
  journaliser: s.journal,
}));

import * as activite from "@/app/api/admin/activite/route";
import * as deconnexion from "@/app/admin/auth/signout/route";
import { messageErreurConnexion } from "@/lib/admin/messages-connexion";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const claimsValides = () => ({
  sub: ADMIN.id,
  aal: "aal2",
  amr: [{ method: "password", timestamp: Math.floor(Date.now() / 1000) - 60 }],
  session_id: SESSION,
});

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", "secret-de-test-vitest-0123456789-abcdefghij");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("ADMIN_EMAILS", ADMIN.email);
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("VERCEL", "");
  s.user = ADMIN;
  s.estAdmin = true;
  s.claims = claimsValides();
  s.getClaims = null;
  s.signOut.mockReset().mockResolvedValue({ error: null });
  s.rpc.mockReset().mockResolvedValue({ data: null, error: null });
  s.journal.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const signal = (entetes: Record<string, string> = { origin: SITE }, corps?: string) =>
  activite.POST(new Request(`${SITE}/api/admin/activite`, { method: "POST", headers: entetes, body: corps }));

describe("POST /api/admin/activite", () => {
  it("note la session du jeton vérifié : 204 sans cache", async () => {
    const r = await signal();
    expect(r.status).toBe(204);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.text()).toBe("");
    expect(s.rpc).toHaveBeenCalledTimes(1);
    expect(s.rpc).toHaveBeenCalledWith("session_activite_noter", {
      p_secret: process.env.SECURITE_RPC_SECRET,
      p_session: SESSION,
    });
  });

  it("un identifiant envoyé par le client est ignoré", async () => {
    const r = await signal({ origin: SITE }, JSON.stringify({ session_id: "99999999-8888-4777-8666-555555555555" }));
    expect(r.status).toBe(204);
    expect(s.rpc.mock.calls[0][1]).toMatchObject({ p_session: SESSION });
  });

  it("POST seulement", () => {
    expect((activite as Record<string, unknown>).GET).toBeUndefined();
    expect(activite.runtime).toBe("nodejs");
  });

  it("sans session → 401, non-admin → 403, autre origine → 403 : rien n'est noté", async () => {
    s.user = null;
    expect((await signal()).status).toBe(401);
    s.user = ADMIN;
    s.estAdmin = false;
    expect((await signal()).status).toBe(403);
    s.estAdmin = true;
    expect((await signal({ origin: "https://evil.example" })).status).toBe(403);
    expect((await signal({})).status).toBe(403);
    expect(s.rpc).not.toHaveBeenCalled();
  });

  it("revendications d'un autre compte ou session_id illisible → 400 sans écriture", async () => {
    for (const session_id of [undefined, "", "pas-un-uuid", 12, `${SESSION}'; drop table x; --`]) {
      s.claims = { ...claimsValides(), session_id };
      expect((await signal()).status).toBe(400);
    }
    expect(s.rpc).not.toHaveBeenCalled();
  });

  it("configuration absente → 503, sans fuite", async () => {
    vi.stubEnv("SECURITE_RPC_SECRET", "");
    const r = await signal();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "Service temporairement indisponible.", ref: expect.any(String) });
    expect(s.rpc).not.toHaveBeenCalled();
  });

  it("échec de la base : réponse générique, jamais le texte de Supabase", async () => {
    s.rpc.mockResolvedValue({ data: null, error: { message: "relation securite.activite_sessions manquante" } });
    const r = await signal();
    expect(r.status).toBe(500);
    expect(await r.text()).not.toContain("securite");

    s.rpc.mockRejectedValue(new Error("connexion securite perdue"));
    const r2 = await signal();
    expect(r2.status).toBe(500);
    expect(await r2.text()).not.toContain("securite");
  });
});

const sortie = (suite = "", entetes: Record<string, string> = { origin: SITE }) =>
  deconnexion.POST(new Request(`${SITE}/admin/auth/signout${suite}`, { method: "POST", headers: entetes }));

describe("POST /admin/auth/signout", () => {
  it("raison=inactivite : cette session seulement, retour avec le message", async () => {
    const r = await sortie("?raison=inactivite");
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe(`${SITE}/admin/login?error=inactivite`);
    expect(s.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(s.journal.mock.calls[0][1]).toMatchObject({
      resultat: "ok",
      userId: ADMIN.id,
      details: { motif: "inactivite" },
    });
  });

  it("session déjà fermée par la tâche du serveur : la redirection se fait quand même", async () => {
    s.user = null;
    const r = await sortie("?raison=inactivite");
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe(`${SITE}/admin/login?error=inactivite`);
  });

  it("le code d'erreur reste au journal avec le motif", async () => {
    s.signOut.mockResolvedValue({ error: { code: "x_1" } });
    await sortie("?raison=inactivite");
    expect(s.journal.mock.calls[0][1]).toMatchObject({
      resultat: "echec",
      details: { errcode: "x_1", motif: "inactivite" },
    });
  });

  it("sans ce paramètre (ou avec une autre valeur) : déconnexion globale inchangée", async () => {
    for (const suite of ["", "?raison=autre"]) {
      s.signOut.mockClear();
      s.journal.mockClear();
      const r = await sortie(suite);
      expect(r.status).toBe(303);
      expect(r.headers.get("location")).toBe(`${SITE}/admin/login`);
      expect(s.signOut).toHaveBeenCalledWith({ scope: "global" });
      expect(s.journal.mock.calls[0][1].details).toBeUndefined();
    }
  });

  it("une autre origine ne peut pas déconnecter, même avec la raison", async () => {
    const r = await sortie("?raison=inactivite", { origin: "https://evil.example" });
    expect(r.status).toBe(403);
    expect(s.signOut).not.toHaveBeenCalled();
  });
});

describe("message de la page de connexion", () => {
  it("?error=inactivite", () => {
    expect(messageErreurConnexion("inactivite")).toBe("Déconnecté après 1 h sans activité. Reconnecte-toi.");
  });
});

describe("branchement", () => {
  it("la garde est montée dans la coque de l'admin", () => {
    const coque = readFileSync(join(RACINE, "components", "admin", "AdminShell.tsx"), "utf8");
    expect(coque).toContain("<GardeInactivite />");
    const garde = readFileSync(join(RACINE, "components", "admin", "GardeInactivite.tsx"), "utf8");
    expect(garde).toContain('import "@/assets/outils/garde-activite.js"');
  });

  it("migration : table fermée, fonction à secret, tâche remplacée et ancienne règle en repli", () => {
    const sql = readFileSync(
      join(RACINE, "supabase", "migrations", "20261104120000_sessions_activite_reelle.sql"),
      "utf8",
    ).replace(/^--.*$/gm, "");
    expect(sql).toMatch(/alter table securite\.activite_sessions enable row level security/);
    expect(sql).toMatch(/revoke all on table securite\.activite_sessions from public, anon, authenticated/);
    expect(sql).toMatch(/revoke all on function public\.session_activite_noter\(text, uuid\) from public/);
    expect(sql).toMatch(/revoke all on function securite\.fermer_sessions_inactives\(\) from public, anon, authenticated/);
    expect(sql).toMatch(/securite\.secret_valide\(p_secret\)[\s\S]*errcode = '42501'[\s\S]*errcode = '22023'/);
    expect(sql).toMatch(/s\.refreshed_at, s\.updated_at at time zone 'UTC', s\.created_at at time zone 'UTC'/);
    expect(sql).toMatch(/interval '65 minutes'/);
    expect(sql).toMatch(/'securite-sessions-inactives',\s*'\*\/5 \* \* \* \*',\s*'select securite\.fermer_sessions_inactives\(\)'/);
  });
});
