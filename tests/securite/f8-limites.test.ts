import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Check 27 — 12 (limites de débit) : « la N+1e requête reçoit 429 ».
 *
 * La fonction SQL `limite_debit` est SIMULÉE en mémoire avec la même règle que
 * la migration 20261030020000_securite_rpc.sql (fenêtre fixe par clé ; refus
 * quand le compte dépasse p_max ; attente = fin de la fenêtre, au moins 1 s ;
 * 42501 sans le bon secret). Les vraies routes sont appelées N+1 fois.
 * Le même comportement est prouvé en base par le test SQL à blanc
 * (securite/tests/f8-limite-debit.sql).
 */

const SECRET = "secret-de-test-vitest-0123456789-abcdefghij";

const s = vi.hoisted(() => ({
  compteurs: new Map<string, { debut: number; compte: number }>(),
  appels: [] as string[],
  maintenant: () => Date.now(),
}));

/** Même logique que public.limite_debit (SQL). */
function limiteDebit(args: { p_secret: string; p_cle: string; p_fenetre_s: number; p_max: number }) {
  if (args.p_secret !== SECRET) return { data: null, error: { code: "42501", message: "accès refusé" } };
  const t = s.maintenant();
  const fen = args.p_fenetre_s * 1000;
  const c = s.compteurs.get(args.p_cle);
  const v = !c || c.debut + fen <= t ? { debut: t, compte: 1 } : { debut: c.debut, compte: c.compte + 1 };
  s.compteurs.set(args.p_cle, v);
  if (v.compte > args.p_max) return { data: Math.max(1, Math.ceil((v.debut + fen - t) / 1000)), error: null };
  return { data: 0, error: null };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: async (nom: string, args: Record<string, unknown>) => {
      s.appels.push(nom);
      if (nom === "limite_debit") return limiteDebit(args as never);
      if (nom === "journal_securite_ajouter") return { data: { total_5min: 1, meme_ip_5min: 1 }, error: null };
      return { data: null, error: null };
    },
  }),
}));

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  exchange: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: auth.signInWithPassword,
      signInWithOtp: auth.signInWithOtp,
      verifyOtp: auth.verifyOtp,
      exchangeCodeForSession: auth.exchange,
    },
  }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async () => {
        s.appels.push("resend");
        return { data: { id: "x" }, error: null };
      },
    };
  },
}));

import { POST as motDePasse } from "@/app/admin/auth/password/route";
import { POST as demandeLien } from "@/app/admin/auth/request/route";
import { GET as callback } from "@/app/admin/auth/callback/route";
import { POST as soumission } from "@/app/api/soumission/route";
import { POST as suivi } from "@/app/api/track/route";
import { GET as ebayGet } from "@/app/api/ebay/account-deletion/route";
import { limiter, TABLE_LIMITES } from "@/lib/securite/limite";
import { requeteMultipart, requeteTexte } from "./f2-outils";

const SITE = "https://www.technolot.ca";

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle-publique-de-test");
  vi.stubEnv("ADMIN_EMAILS", "info@technolot.ca");
  vi.stubEnv("ADMIN_USERNAMES", "info:info@technolot.ca");
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("RESEND_API_KEY", "cle-resend-de-test");
  vi.stubEnv("FROM_EMAIL", "soumission@exemple.ca");
  vi.stubEnv("CONTACT_EMAIL", "info@exemple.ca");
  vi.stubEnv("EBAY_VERIFICATION_TOKEN", "jeton-de-verification-ebay-de-test-0123456789");
  vi.stubEnv("EBAY_DELETION_ENDPOINT", `${SITE}/api/ebay/account-deletion`);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  s.compteurs.clear();
  s.appels = [];
  s.maintenant = () => Date.now();
  auth.signInWithPassword.mockReset().mockResolvedValue({
    data: { user: null },
    error: { status: 400, code: "invalid_credentials", message: "Invalid login credentials" },
  });
  auth.signInWithOtp.mockReset().mockResolvedValue({ data: {}, error: null });
  auth.verifyOtp.mockReset().mockResolvedValue({ data: { user: null }, error: { code: "otp_expired" } });
  auth.exchange.mockReset().mockResolvedValue({ data: { user: null }, error: { code: "bad_code" } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const ip = (n: number) => ({ "x-forwarded-for": `203.0.113.${n}` });

describe("limiter (simulation fidèle de limite_debit)", () => {
  it("N permis, N+1 refusé avec une attente ; nouvelle fenêtre → permis", async () => {
    let t = 1_000_000;
    s.maintenant = () => t;
    for (let i = 1; i <= 3; i++) expect((await limiter("essai", "k", 60, 3)).permis).toBe(true);
    const refus = await limiter("essai", "k", 60, 3);
    expect(refus).toEqual({ permis: false, attente: 60 });
    t += 61_000;
    expect((await limiter("essai", "k", 60, 3)).permis).toBe(true);
  });

  it("mauvais secret côté base (42501) → choix ouvert documenté (permis), jamais d'exception", async () => {
    vi.stubEnv("SECURITE_RPC_SECRET", "x".repeat(40));
    for (let i = 0; i < 10; i++) expect((await limiter("essai", "k", 60, 1)).permis).toBe(true);
  });
});

describe("12 — la N+1e requête reçoit 429 sur chaque route limitée", () => {
  it("connexion par mot de passe : 6e essai d'une même IP → 429 + Retry-After, Supabase non appelé", { timeout: 30_000 }, async () => {
    const corps = JSON.stringify({ username: "info", password: "mauvais-mot-de-passe" });
    for (let i = 1; i <= 5; i++) {
      const r = await motDePasse(requeteTexte(`${SITE}/admin/auth/password`, corps, "application/json", ip(1)));
      expect(r.status, `essai ${i}`).toBe(401);
    }
    auth.signInWithPassword.mockClear();
    const r = await motDePasse(requeteTexte(`${SITE}/admin/auth/password`, corps, "application/json", ip(1)));
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("connexion : 11e essai sur le MÊME compte depuis des IP différentes → 429 (limite par compte)", { timeout: 30_000 }, async () => {
    const corps = JSON.stringify({ username: "info", password: "mauvais-mot-de-passe" });
    for (let i = 1; i <= 10; i++) {
      const r = await motDePasse(requeteTexte(`${SITE}/admin/auth/password`, corps, "application/json", ip(10 + i)));
      expect(r.status, `essai ${i}`).toBe(401);
    }
    auth.signInWithPassword.mockClear();
    const r = await motDePasse(requeteTexte(`${SITE}/admin/auth/password`, corps, "application/json", ip(99)));
    expect(r.status).toBe(429);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("lien magique : 4e demande d'une même IP → 429 ; 6e au total (IP variées) → 429", async () => {
    const req = (n: number) =>
      requeteTexte(`${SITE}/admin/auth/request`, "next=%2Fadmin", "application/x-www-form-urlencoded", ip(n));
    for (let i = 1; i <= 3; i++) expect((await demandeLien(req(1))).status).toBe(200);
    expect((await demandeLien(req(1))).status).toBe(429);
    expect(auth.signInWithOtp).toHaveBeenCalledTimes(3);

    s.compteurs.clear();
    auth.signInWithOtp.mockClear();
    for (let i = 1; i <= 5; i++) expect((await demandeLien(req(20 + i))).status).toBe(200);
    const r = await demandeLien(req(40));
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBeTruthy();
    expect(auth.signInWithOtp).toHaveBeenCalledTimes(5);
  });

  it("callback du lien : 21e appel d'une même IP → trop_de_tentatives, Supabase non appelé", async () => {
    const req = () => new Request(`${SITE}/admin/auth/callback?token_hash=faux&type=magiclink`, { headers: ip(2) });
    for (let i = 1; i <= 20; i++) {
      const r = await callback(req());
      expect(new URL(r.headers.get("location")!).searchParams.get("error")).not.toBe("trop_de_tentatives");
    }
    auth.verifyOtp.mockClear();
    const r = await callback(req());
    expect(new URL(r.headers.get("location")!).searchParams.get("error")).toBe("trop_de_tentatives");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("formulaire : par IP, même un envoi invalide compte (4e → 429) ; plafond global = 100 compté seulement sur les vraies soumissions", { timeout: 30_000 }, async () => {
    const vide = async (n: number) => requeteMultipart(`${SITE}/api/soumission`, new FormData(), ip(n));
    const valide = async (n: number) => {
      const fd = new FormData();
      fd.set("nom", "Marie Tremblay");
      fd.set("courriel", "marie@exemple.ca");
      fd.set("telephone", "514 555-1234");
      return requeteMultipart(`${SITE}/api/soumission`, fd, ip(n));
    };

    // Par IP : la limite agit tôt (avant le schéma), donc même un envoi invalide compte.
    for (let i = 1; i <= 3; i++) expect((await soumission(await vide(3))).status).toBe(400);
    const parIp = await soumission(await vide(3));
    expect(parIp.status).toBe(429);
    expect(parIp.headers.get("retry-after")).toBeTruthy();

    // Des envois INVALIDES depuis plein d'IP n'entament PAS le budget global…
    s.compteurs.clear();
    for (let i = 1; i <= 60; i++) {
      const r = await soumission(await vide(40 + i));
      expect(r.status, `invalide ${i}`).toBe(400);
    }

    // … donc 100 vraies soumissions passent, et seule la 101e est bloquée par le plafond.
    for (let i = 1; i <= 100; i++) {
      const r = await soumission(await valide(100 + i));
      expect(r.status, `valide ${i}`).toBe(200);
    }
    s.appels = [];
    const centUne = await soumission(await valide(201));
    expect(centUne.status).toBe(429);
    // La soumission bloquée par le plafond n'écrit rien et n'envoie aucun courriel.
    expect(s.appels).not.toContain("soumission_enregistrer");
    expect(s.appels).not.toContain("resend");
  });

  it("suivi des pubs : 121e événement d'une même IP → 204 silencieux, rien d'enregistré", async () => {
    const corps = JSON.stringify({
      session: { id: "0b9d6f7e-1c2d-4e5f-8a9b-0c1d2e3f4a5b", platform: "google", landing_path: "/", device: "desktop", locale: "fr" },
      event: { type: "page_view", path: "/" },
    });
    for (let i = 1; i <= 120; i++) await suivi(requeteTexte(`${SITE}/api/track`, corps, "application/json", ip(4)));
    const avant = s.appels.filter((a) => a === "suivi_pub_enregistrer").length;
    expect(avant).toBe(120);
    const r = await suivi(requeteTexte(`${SITE}/api/track`, corps, "application/json", ip(4)));
    expect(r.status).toBe(204);
    expect(s.appels.filter((a) => a === "suivi_pub_enregistrer").length).toBe(120);
  });

  it("avis eBay : 31e appel d'une même IP → 429", async () => {
    const req = () => new Request(`${SITE}/api/ebay/account-deletion?challenge_code=abcdefgh1234`, { headers: ip(5) });
    for (let i = 1; i <= 30; i++) expect((await ebayGet(req())).status).toBe(200);
    const r = await ebayGet(req());
    expect(r.status).toBe(429);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("chaque règle du tableau est bornée (fenêtre ≤ 24 h, max ≥ 1) : aucune limite infinie", () => {
    for (const [nom, r] of Object.entries(TABLE_LIMITES)) {
      expect(r.fenetreSecondes, nom).toBeGreaterThanOrEqual(1);
      expect(r.fenetreSecondes, nom).toBeLessThanOrEqual(86_400);
      expect(r.max, nom).toBeGreaterThanOrEqual(1);
      expect(r.max, nom).toBeLessThanOrEqual(120);
    }
  });
});
