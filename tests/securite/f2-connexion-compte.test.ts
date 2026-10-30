import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Garde, en-têtes et Supabase simulés (aucun appel réseau).
const a = vi.hoisted(() => ({
  ctx: null as null | Record<string, unknown>,
  updateUser: vi.fn(),
  signOut: vi.fn(),
  verifSignIn: vi.fn(),
  verifSignOut: vi.fn(),
  rpc: vi.fn(),
  attente: 0,
}));

vi.mock("@/lib/securite/garde", () => ({ adminPourAction: async () => a.ctx }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": "203.0.113.5" }) }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: a.rpc,
    auth: { signInWithPassword: a.verifSignIn, signOut: a.verifSignOut },
  }),
}));

import { changerMotDePasse } from "@/lib/admin/mot-de-passe-actions";
import { MESSAGE_ERREUR_INCONNUE, messageErreurConnexion } from "@/lib/admin/messages-connexion";
import { cheminInterne } from "@/lib/securite/chemin-interne";

const ADMIN = { id: "11111111-2222-4333-8444-555555555555", email: "info@technolot.ca" };

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", "secret-de-test-vitest-0123456789-abcdefghij");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("ADMIN_EMAILS", ADMIN.email);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  a.attente = 0;
  for (const f of [a.updateUser, a.signOut, a.verifSignIn, a.verifSignOut, a.rpc]) f.mockReset();
  a.rpc.mockImplementation(async (nom: string) =>
    nom === "limite_debit" ? { data: a.attente, error: null } : { data: { total_5min: 1, meme_ip_5min: 1 }, error: null },
  );
  a.updateUser.mockResolvedValue({ data: {}, error: null });
  a.signOut.mockResolvedValue({ error: null });
  a.verifSignIn.mockResolvedValue({ data: { user: ADMIN }, error: null });
  a.verifSignOut.mockResolvedValue({ error: null });
  a.ctx = {
    supabase: { auth: { updateUser: a.updateUser, signOut: a.signOut } },
    user: ADMIN,
    requestId: "req-test",
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// La page (TSX, jsx « preserve ») n'est pas chargeable par vitest : elle se
// limite à `cheminInterne(searchParams.next)` et `messageErreurConnexion(searchParams.error)`,
// testés ici ; le rendu réel est vérifié sur `next start` (lien neutralisé dans le HTML).
describe("page de connexion", () => {
  it("next=javascript:alert(1) et redirections externes → /admin", () => {
    for (const next of ["javascript:alert(1)", "https://evil.com", "//evil.com", "/\t/evil.com", ["/admin/x", "//e"]]) {
      expect(cheminInterne(next)).toBe("/admin");
    }
    expect(cheminInterne("/admin/crm")).toBe("/admin/crm");
  });

  it("codes d'erreur connus → message fixe ; texte arbitraire jamais affiché", () => {
    expect(messageErreurConnexion("session_expiree")).toBe("Ta session a expiré : reconnecte-toi (une fois par jour).");
    expect(messageErreurConnexion("trop_de_tentatives")).toMatch(/Trop de tentatives/);
    expect(messageErreurConnexion("identifiants")).toBe("Identifiants invalides.");
    expect(messageErreurConnexion("Ce courriel n'est pas autorisé à accéder au tableau de bord.")).toBe(
      "Ce courriel n'est pas autorisé à accéder au tableau de bord.",
    );
    expect(messageErreurConnexion("Compte bloqué : appelez le 1-900-555-0000")).toBe(MESSAGE_ERREUR_INCONNUE);
    expect(messageErreurConnexion("__proto__")).toBe(MESSAGE_ERREUR_INCONNUE);
    expect(messageErreurConnexion(["session_expiree"])).toBeUndefined();
    expect(messageErreurConnexion(undefined)).toBeUndefined();
  });
});

describe("changement de mot de passe (action serveur)", () => {
  const changer = (nouveau: string, actuel = "ancien-mot-de-passe") => changerMotDePasse({ actuel, nouveau });

  it("refuse sans session admin", async () => {
    a.ctx = null;
    expect(await changer("un-tres-bon-mot-de-passe")).toEqual({ ok: false, error: "Accès refusé." });
  });

  it("trop court (11) ou trop long (73 caractères, ou > 72 octets) → refus, rien changé", async () => {
    expect(await changer("x".repeat(11))).toMatchObject({ ok: false, error: expect.stringMatching(/au moins 12/) });
    expect(await changer("x".repeat(73))).toMatchObject({ ok: false, error: expect.stringMatching(/au plus 72/) });
    expect(await changer("é".repeat(40))).toMatchObject({ ok: false, error: expect.stringMatching(/au plus 72/) });
    expect(a.updateUser).not.toHaveBeenCalled();
  });

  it("12 et 72 caractères, tout caractère permis → acceptés", async () => {
    expect(await changer("aaaaaaaaaaaa")).toEqual({ ok: true });
    expect(await changer("☃ x".padEnd(70, "z"))).toEqual({ ok: true });
  });

  it("mot de passe actuel faux → refus, aucune mise à jour", async () => {
    a.verifSignIn.mockResolvedValue({ data: { user: null }, error: { status: 400, code: "invalid_credentials" } });
    expect(await changer("un-tres-bon-mot-de-passe")).toEqual({ ok: false, error: "Mot de passe actuel incorrect." });
    expect(a.updateUser).not.toHaveBeenCalled();
  });

  it("succès : vérification sans session persistée, mise à jour, autres sessions fermées", async () => {
    expect(await changer("un-tres-bon-mot-de-passe")).toEqual({ ok: true });
    expect(a.verifSignIn).toHaveBeenCalledWith({ email: ADMIN.email, password: "ancien-mot-de-passe" });
    expect(a.verifSignOut).toHaveBeenCalledWith({ scope: "local" });
    expect(a.updateUser).toHaveBeenCalledWith({ password: "un-tres-bon-mot-de-passe" });
    expect(a.signOut).toHaveBeenCalledWith({ scope: "others" });
  });

  it("5 essais / 15 min → refus « Trop d'essais »", async () => {
    a.attente = 600;
    expect(await changer("un-tres-bon-mot-de-passe")).toMatchObject({ ok: false, error: expect.stringMatching(/Trop d'essais/) });
    expect(a.verifSignIn).not.toHaveBeenCalled();
  });

  it("erreur Supabase à la mise à jour → message FR sans texte Supabase", async () => {
    a.updateUser.mockResolvedValue({ data: {}, error: { code: "unexpected_failure", message: "db down secret" } });
    const r = await changer("un-tres-bon-mot-de-passe");
    expect(r).toEqual({ ok: false, error: "Impossible d'enregistrer le mot de passe pour l'instant." });
  });
});
