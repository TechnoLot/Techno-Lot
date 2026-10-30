import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Appels réseau simulés : RPC Supabase et Resend.
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  envoyer: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: m.rpc }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: m.envoyer };
  },
}));

import {
  alertesFranchies,
  construireLigne,
  journaliser,
  MASQUE,
  rediger,
} from "@/lib/securite/journal";
import { limiter, limiterSelon, reponse429, TABLE_LIMITES } from "@/lib/securite/limite";

const SECRET_TEST = "secret-de-test-vitest-0123456789-abcdefghij";

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", SECRET_TEST);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("RESEND_API_KEY", "cle-resend-de-test");
  vi.stubEnv("FROM_EMAIL", "alertes@exemple.ca");
  vi.stubEnv("CONTACT_EMAIL", "info@exemple.ca");
  vi.stubEnv("VERCEL", "");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  m.rpc.mockReset();
  m.envoyer.mockReset();
  m.envoyer.mockResolvedValue({ data: { id: "x" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("rédaction du journal", () => {
  it("masque les clés sensibles, à toute profondeur", () => {
    const r = rediger({
      password: "hunter2",
      motDePasse: "x",
      Authorization: "Bearer abc",
      cookie: "sb=1",
      apiKey: "k",
      cle: "valeur",
      refresh_token: "r",
      code: "123456",
      errcode: "23503",
      client: "ok",
      imbrique: { token: "t", visible: 1, plus: { secret: "s" } },
    });
    for (const cle of ["password", "motDePasse", "Authorization", "cookie", "apiKey", "cle", "refresh_token", "code"]) {
      expect(r[cle]).toBe(MASQUE);
    }
    expect(r.errcode).toBe("23503");
    expect(r.client).toBe("ok");
    expect(String(r.imbrique)).not.toContain('"t"');
    expect(String(r.imbrique)).not.toContain('"s"');
    expect(String(r.imbrique)).toContain('"visible":1');
  });

  it("masque une valeur qui ressemble à un jeton, même sous une clé anodine", () => {
    const r = rediger({
      note: "Bearer abc.def",
      autre: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2lnbmF0dXJl",
    });
    expect(r.note).toBe(MASQUE);
    expect(r.autre).toBe(MASQUE);
  });

  it("retire les sauts de ligne et coupe à 300 caractères", () => {
    const r = rediger({ msg: "ligne1\nFAUX 200 OK\r\n\tfin", long: "x".repeat(1000), sep: "a b" });
    expect(r.msg).toBe("ligne1 FAUX 200 OK fin");
    expect(String(r.long)).toHaveLength(300);
    expect(r.sep).toBe("a b");
  });

  it("ligne : chemin sans chaîne de requête, IP fiable, user agent tronqué", () => {
    const req = new Request("https://technolot.ca/admin/auth/callback?code=SECRET&next=/admin", {
      headers: { "x-forwarded-for": "6.6.6.6, 192.0.2.8", "user-agent": "U".repeat(500) + "\tX" },
    });
    const l = construireLigne("auth.echec", { resultat: "echec", request: req, userId: "pas-un-uuid", statut: 401 });
    expect(l.chemin).toBe("/admin/auth/callback");
    expect(JSON.stringify(l)).not.toContain("SECRET");
    expect(l.ip).toBe("192.0.2.8");
    expect(l.ua).toHaveLength(200);
    expect(l.user_id).toBeNull();
    expect(l.methode).toBe("GET");
    expect(l.ts).toMatch(/Z$/);
  });
});

describe("journaliser", () => {
  it("écrit une ligne JSON sur la sortie standard et l'insère par la fonction SQL", async () => {
    m.rpc.mockResolvedValue({ data: { meme_ip_5min: 1, total_5min: 1 }, error: null });
    await journaliser("admin.action", {
      resultat: "ok",
      userId: "11111111-2222-4333-8444-555555555555",
      details: { action: "lot.supprime", password: "x" },
    });
    expect(console.log).toHaveBeenCalledTimes(1);
    const sortie = String(vi.mocked(console.log).mock.calls[0][0]);
    expect(sortie.split("\n")).toHaveLength(1);
    expect(JSON.parse(sortie)).toMatchObject({ evenement: "admin.action", resultat: "ok" });
    expect(sortie).not.toContain('"x"');
    expect(m.rpc).toHaveBeenCalledWith(
      "journal_securite_ajouter",
      expect.objectContaining({ p_secret: SECRET_TEST, p_evenement: "admin.action", p_resultat: "ok" }),
    );
    expect(m.envoyer).not.toHaveBeenCalled();
  });

  it("ne lève jamais d'erreur, même si l'appel échoue", async () => {
    m.rpc.mockRejectedValue(new Error("réseau"));
    await expect(journaliser("erreur.5xx", { resultat: "echec" })).resolves.toBeUndefined();
    m.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(journaliser("erreur.5xx", { resultat: "echec" })).resolves.toBeUndefined();
  });

  it("sans secret : sortie standard seulement", async () => {
    vi.stubEnv("SECURITE_RPC_SECRET", "trop-court");
    await journaliser("auth.echec", { resultat: "echec" });
    expect(m.rpc).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("seuil franchi (égalité exacte) → un courriel d'alerte, sans secret", async () => {
    m.rpc.mockImplementation(async (nom: string) =>
      nom === "journal_securite_ajouter"
        ? { data: { meme_ip_5min: 10, total_5min: 12 }, error: null }
        : { data: 0, error: null },
    );
    await journaliser("auth.echec", {
      resultat: "echec",
      request: new Request("https://technolot.ca/admin/auth/password", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.9" },
      }),
    });
    expect(m.rpc).toHaveBeenCalledWith("limite_debit", expect.objectContaining({ p_fenetre_s: 3600, p_max: 1 }));
    expect(m.envoyer).toHaveBeenCalledTimes(1);
    const courriel = m.envoyer.mock.calls[0][0];
    expect(courriel.to).toEqual(["info@exemple.ca"]);
    expect(courriel.text).toContain("203.0.113.9");
    expect(courriel.text).toContain("securite/SECURITY_RUNBOOK.md");
    expect(JSON.stringify(courriel)).not.toContain(SECRET_TEST);
  });

  it("au-delà du seuil, ou déjà alerté dans l'heure → aucun courriel", async () => {
    m.rpc.mockImplementation(async (nom: string) =>
      nom === "journal_securite_ajouter"
        ? { data: { meme_ip_5min: 11, total_5min: 11 }, error: null }
        : { data: 0, error: null },
    );
    await journaliser("auth.echec", { resultat: "echec" });
    expect(m.envoyer).not.toHaveBeenCalled();

    m.rpc.mockImplementation(async (nom: string) =>
      nom === "journal_securite_ajouter"
        ? { data: { meme_ip_5min: 1, total_5min: 5 }, error: null }
        : { data: 1800, error: null }, // limite d'alerte atteinte
    );
    await journaliser("cron.refus", { resultat: "refus" });
    expect(m.envoyer).not.toHaveBeenCalled();
  });

  it("alertesFranchies : seuils de la décision", () => {
    expect(alertesFranchies("auth.echec", { meme_ip_5min: 3, total_5min: 20 }).map((r) => r.type)).toEqual([
      "auth_echec_total",
    ]);
    expect(alertesFranchies("limite.depassee", { meme_ip_5min: 1, total_5min: 30 })).toHaveLength(1);
    expect(alertesFranchies("cron.refus", { meme_ip_5min: 1, total_5min: 5 })).toHaveLength(1);
    expect(alertesFranchies("erreur.5xx", { meme_ip_5min: 1, total_5min: 10 })).toHaveLength(1);
    expect(alertesFranchies("webhook.signature_invalide", { meme_ip_5min: 1, total_5min: 3 })).toHaveLength(1);
    expect(alertesFranchies("admin.refus", { meme_ip_5min: 10, total_5min: 20 })).toHaveLength(0);
    expect(alertesFranchies("auth.echec", null)).toHaveLength(0);
  });
});

describe("limiter", () => {
  it("permis (0), puis refus avec attente", async () => {
    m.rpc.mockResolvedValueOnce({ data: 0, error: null });
    expect(await limiter("soumission:ip:10min", "192.0.2.1", 600, 3)).toEqual({ permis: true, attente: 0 });
    m.rpc.mockResolvedValueOnce({ data: 42, error: null });
    expect(await limiter("soumission:ip:10min", "192.0.2.1", 600, 3)).toEqual({ permis: false, attente: 42 });
  });

  it("envoie un HMAC de route:clé, jamais l'IP en clair", async () => {
    m.rpc.mockResolvedValue({ data: 0, error: null });
    await limiter("auth-mdp:ip:min", "203.0.113.9", 60, 5);
    const params = m.rpc.mock.calls[0][1];
    const attendu = createHmac("sha256", SECRET_TEST).update("auth-mdp:ip:min:203.0.113.9").digest("hex");
    expect(params.p_cle).toBe(attendu);
    expect(params.p_cle).not.toContain("203.0.113.9");
    expect(params).toMatchObject({ p_secret: SECRET_TEST, p_fenetre_s: 60, p_max: 5 });
  });

  it("choix ouvert : secret absent ou erreur → permis + journal limite.erreur", async () => {
    m.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    expect(await limiter("x", "y", 60, 1)).toEqual({ permis: true, attente: 0 });
    m.rpc.mockRejectedValueOnce(new Error("réseau"));
    expect(await limiter("x", "y", 60, 1)).toEqual({ permis: true, attente: 0 });
    vi.stubEnv("SECURITE_RPC_SECRET", "");
    m.rpc.mockClear();
    expect(await limiter("x", "y", 60, 1)).toEqual({ permis: true, attente: 0 });
    expect(m.rpc).not.toHaveBeenCalledWith("limite_debit", expect.anything());
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"evenement":"limite.erreur"'));
  });

  it("limiterSelon journalise limite.depassee au refus", async () => {
    m.rpc.mockImplementation(async (nom: string) =>
      nom === "limite_debit" ? { data: 30, error: null } : { data: { meme_ip_5min: 1, total_5min: 1 }, error: null },
    );
    const v = await limiterSelon(TABLE_LIMITES.motDePasseIpMinute, "192.0.2.1");
    expect(v.permis).toBe(false);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"evenement":"limite.depassee"'));
  });

  it("reponse429 : statut, Retry-After et no-store", async () => {
    const r = reponse429(42.2, "Trop d'envois.");
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("43");
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({ error: "Trop d'envois." });
    expect(reponse429(0, "x").headers.get("retry-after")).toBe("1");
  });

  it("TABLE_LIMITES reprend le tableau approuvé (T5)", () => {
    expect(TABLE_LIMITES.soumissionIp10min).toMatchObject({ fenetreSecondes: 600, max: 3 });
    expect(TABLE_LIMITES.soumissionIpJour).toMatchObject({ fenetreSecondes: 86_400, max: 10 });
    expect(TABLE_LIMITES.soumissionGlobaleJour).toMatchObject({ fenetreSecondes: 86_400, max: 50 });
    expect(TABLE_LIMITES.suiviIpMinute).toMatchObject({ fenetreSecondes: 60, max: 120 });
    expect(TABLE_LIMITES.motDePasseIpMinute).toMatchObject({ fenetreSecondes: 60, max: 5 });
    expect(TABLE_LIMITES.motDePasseIpHeure).toMatchObject({ fenetreSecondes: 3_600, max: 20 });
    expect(TABLE_LIMITES.motDePasseCompte15min).toMatchObject({ fenetreSecondes: 900, max: 10 });
    expect(TABLE_LIMITES.lienMagiqueIpHeure).toMatchObject({ fenetreSecondes: 3_600, max: 3 });
    expect(TABLE_LIMITES.lienMagiqueGlobalHeure).toMatchObject({ fenetreSecondes: 3_600, max: 5 });
    expect(TABLE_LIMITES.callbackIp10min).toMatchObject({ fenetreSecondes: 600, max: 20 });
    expect(TABLE_LIMITES.ebaySuppressionIpMinute).toMatchObject({ fenetreSecondes: 60, max: 30 });
    const routes = Object.values(TABLE_LIMITES).map((r) => r.route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
