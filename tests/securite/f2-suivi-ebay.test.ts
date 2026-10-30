import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ rpc: vi.fn(), attente: 0, cible: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc: m.rpc }) }));
vi.mock("@/lib/posts", () => ({ legacyPostTarget: m.cible }));

import { POST as suivi } from "@/app/api/track/route";
import { GET as ebayGet, POST as ebayPost } from "@/app/api/ebay/account-deletion/route";
import { GET as ancienLienFr } from "@/app/(fr)/blog/ancien-lien/route";
import { requeteTexte } from "./f2-outils";

const SECRET = "secret-de-test-vitest-0123456789-abcdefghij";
const SESSION = {
  id: "0b9d6f7e-1c2d-4e5f-8a9b-0c1d2e3f4a5b",
  platform: "google",
  gclid: "abc",
  landing_path: "/",
  device: "desktop",
  locale: "fr",
};

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("EBAY_VERIFICATION_TOKEN", "jeton-de-verification-ebay-de-test-0123456789");
  vi.stubEnv("EBAY_DELETION_ENDPOINT", "https://www.technolot.ca/api/ebay/account-deletion");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  m.attente = 0;
  m.rpc.mockReset();
  m.rpc.mockImplementation(async (nom: string) =>
    nom === "limite_debit" ? { data: m.attente, error: null } : { data: { total_5min: 1, meme_ip_5min: 1 }, error: null },
  );
  m.cible.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const appelsSuivi = () => m.rpc.mock.calls.filter((c) => c[0] === "suivi_pub_enregistrer");
const corpsSuivi = (corps: unknown, type = "application/json") =>
  requeteTexte("https://www.technolot.ca/api/track", JSON.stringify(corps), type);

describe("/api/track", () => {
  it("événement valide → fonction à secret, 204", async () => {
    const r = await suivi(corpsSuivi({ session: SESSION, event: { type: "page_view", path: "/" } }));
    expect(r.status).toBe(204);
    const [[, args]] = appelsSuivi();
    expect(args).toMatchObject({ p_secret: SECRET, p_type: "page_view", p_path: "/" });
    expect(args.p_session).toMatchObject({ id: SESSION.id, platform: "google", gclid: "abc" });
  });

  it("développement et Preview Vercel : rien d'enregistré", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await suivi(corpsSuivi({ session: SESSION, event: { type: "page_view" } }))).status).toBe(204);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("text/plain → 415 ; corps > 4 Ko → 413", async () => {
    expect((await suivi(corpsSuivi({ session: SESSION, event: { type: "page_view" } }, "text/plain"))).status).toBe(415);
    const gros = { session: { ...SESSION, utm_source: "x".repeat(5000) }, event: { type: "page_view" } };
    expect((await suivi(corpsSuivi(gros))).status).toBe(413);
    expect(appelsSuivi()).toHaveLength(0);
  });

  it("schéma strict : type hors liste, clé inconnue, chaîne trop longue → 204 sans écriture", async () => {
    for (const corps of [
      { session: SESSION, event: { type: "admin_login" } },
      { session: { ...SESSION, role: "admin" }, event: { type: "page_view" } },
      { session: { ...SESSION, ad_id: "x".repeat(101) }, event: { type: "page_view" } },
      { session: { ...SESSION, id: "pas-un-uuid" }, event: { type: "page_view" } },
    ]) {
      expect((await suivi(corpsSuivi(corps))).status).toBe(204);
    }
    expect(appelsSuivi()).toHaveLength(0);
  });

  it("au-delà de 120 / min par IP → 204 silencieux, rien d'enregistré", async () => {
    m.attente = 30;
    expect((await suivi(corpsSuivi({ session: SESSION, event: { type: "page_view" } }))).status).toBe(204);
    expect(appelsSuivi()).toHaveLength(0);
  });
});

describe("/api/ebay/account-deletion", () => {
  it("GET : réponse calculée avec l'URL configurée, jamais l'en-tête Host", async () => {
    const r = await ebayGet(
      new Request("https://evil.example/api/ebay/account-deletion?challenge_code=a8628072-3d33-45ee-9004-bee86830a22d", {
        headers: { host: "evil.example" },
      }),
    );
    expect(r.status).toBe(200);
    const attendu = createHash("sha256")
      .update("a8628072-3d33-45ee-9004-bee86830a22d")
      .update("jeton-de-verification-ebay-de-test-0123456789")
      .update("https://www.technolot.ca/api/ebay/account-deletion")
      .digest("hex");
    expect(await r.json()).toEqual({ challengeResponse: attendu });
  });

  it("GET : challenge_code absent, trop long ou avec caractères interdits → 400", async () => {
    for (const q of ["", "?challenge_code=" + "a".repeat(300), "?challenge_code=%3Cscript%3E12345678"]) {
      expect((await ebayGet(new Request(`https://www.technolot.ca/api/ebay/account-deletion${q}`))).status).toBe(400);
    }
  });

  it("GET : 30 / min par IP → 429", async () => {
    m.attente = 20;
    const r = await ebayGet(new Request("https://www.technolot.ca/api/ebay/account-deletion?challenge_code=abcdefgh"));
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("20");
  });

  it("POST : accusé de réception ; seuls l'identifiant et le sujet sont journalisés", async () => {
    const log = vi.spyOn(console, "log");
    const corps = {
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION" },
      notification: { notificationId: "n-1", data: { username: "acheteur-secret", userId: "u-42" } },
    };
    const r = await ebayPost(
      requeteTexte("https://www.technolot.ca/api/ebay/account-deletion", JSON.stringify(corps), "application/json"),
    );
    expect(r.status).toBe(200);
    const lignes = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(lignes).toContain("n-1");
    expect(lignes).not.toContain("acheteur-secret");
  });

  it("POST : corps > 64 Ko → 413 ; JSON invalide → 400", async () => {
    const gros = JSON.stringify({ x: "a".repeat(70_000) });
    expect(
      (await ebayPost(requeteTexte("https://www.technolot.ca/api/ebay/account-deletion", gros, "application/json"))).status,
    ).toBe(413);
    expect(
      (await ebayPost(requeteTexte("https://www.technolot.ca/api/ebay/account-deletion", "{", "application/json"))).status,
    ).toBe(400);
  });
});

describe("ancien lien du blogue", () => {
  it("Location relative (jamais l'hôte de la requête) ; slug borné", async () => {
    m.cible.mockResolvedValue("/blog/mon-article");
    const { NextRequest } = await import("next/server");
    const r = await ancienLienFr(
      new NextRequest("https://evil.example/blog/ancien-lien?post=mon-article", { headers: { host: "evil.example" } }),
    );
    expect(r.status).toBe(308);
    expect(r.headers.get("location")).toBe("/blog/mon-article");
    await ancienLienFr(new NextRequest(`https://www.technolot.ca/blog/ancien-lien?post=${"a".repeat(201)}`));
    expect(m.cible).toHaveBeenLastCalledWith("fr", null);
  });
});
