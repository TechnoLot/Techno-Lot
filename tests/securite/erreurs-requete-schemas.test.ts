import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reponseErreur } from "@/lib/securite/erreurs";
import { lireJson, verifierTaille } from "@/lib/securite/requete";
import { courriel, dateIso, montant, telephone, texte, urlHttps, uuid } from "@/lib/securite/schemas";
import { exigerConfig, verifierEnvironnement } from "@/lib/securite/env";

beforeEach(() => {
  vi.stubEnv("SECURITE_RPC_SECRET", ""); // aucun appel réseau : sortie standard seulement
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("reponseErreur", () => {
  it("message public + ref, jamais le message interne", async () => {
    const err = new Error('relation "public.soumissions" does not exist\n    at /var/app/route.js:12');
    const r = reponseErreur(500, "Erreur interne. Réessayez plus tard.", {
      request: new Request("https://technolot.ca/api/x", { method: "POST" }),
      err,
    });
    expect(r.status).toBe(500);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const corps = await r.json();
    expect(corps.error).toBe("Erreur interne. Réessayez plus tard.");
    expect(corps.ref).toBe(r.headers.get("x-request-id"));
    expect(JSON.stringify(corps)).not.toMatch(/soumissions|route\.js|relation/);
    // Le détail va au journal (rédigé, sur une ligne).
    const ligne = String(vi.mocked(console.log).mock.calls[0][0]);
    expect(JSON.parse(ligne)).toMatchObject({ evenement: "erreur.5xx", statut: 500, request_id: corps.ref });
    expect(ligne).not.toContain("\\n");
  });

  it("4xx : erreur.4xx sur la sortie standard, ref fournie conservée", async () => {
    const r = reponseErreur(400, "Requête invalide.", { requestId: "ref-123" });
    expect(await r.json()).toEqual({ error: "Requête invalide.", ref: "ref-123" });
    expect(String(vi.mocked(console.log).mock.calls[0][0])).toContain('"evenement":"erreur.4xx"');
  });
});

describe("lireJson / verifierTaille", () => {
  const req = (corps: string, entetes: Record<string, string>) =>
    new Request("https://technolot.ca/api/x", { method: "POST", body: corps, headers: entetes });

  it("415 si le type n'est pas application/json", async () => {
    const r = await lireJson(req("{}", { "content-type": "text/plain", "content-length": "2" }), 100);
    expect(!r.ok && r.reponse.status).toBe(415);
  });

  it("411 sans Content-Length", async () => {
    const r = await lireJson(req("{}", { "content-type": "application/json" }), 100);
    expect(!r.ok && r.reponse.status).toBe(411);
  });

  it("413 si la longueur annoncée dépasse le maximum", async () => {
    const r = await lireJson(req("{}", { "content-type": "application/json", "content-length": "5000" }), 100);
    expect(!r.ok && r.reponse.status).toBe(413);
  });

  it("413 si le corps réel dépasse le maximum malgré une longueur annoncée faible", async () => {
    const gros = JSON.stringify({ x: "a".repeat(500) });
    const r = await lireJson(req(gros, { "content-type": "application/json", "content-length": "10" }), 100);
    expect(!r.ok && r.reponse.status).toBe(413);
  });

  it("400 si le JSON est invalide ; données sinon", async () => {
    const mauvais = await lireJson(req("{pas du json", { "content-type": "application/json", "content-length": "12" }), 100);
    expect(!mauvais.ok && mauvais.reponse.status).toBe(400);
    const bon = await lireJson<{ a: number }>(
      req('{"a":1}', { "content-type": "application/json; charset=utf-8", "content-length": "7" }),
      100,
    );
    expect(bon).toEqual({ ok: true, donnees: { a: 1 } });
  });

  it("verifierTaille : 411, 413, ok", () => {
    const sans = verifierTaille(new Request("https://technolot.ca/api/x", { method: "POST" }), 100);
    expect(!sans.ok && sans.reponse.status).toBe(411);
    const trop = verifierTaille(req("x", { "content-length": "101" }), 100);
    expect(!trop.ok && trop.reponse.status).toBe(413);
    expect(verifierTaille(req("x", { "content-length": "100" }), 100)).toEqual({ ok: true });
  });
});

describe("schémas", () => {
  it("urlHttps refuse les schémas dangereux", () => {
    for (const v of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,<b>x</b>", "mailto:a@b.ca", "//evil.com", "ftp://x.ca", "vbscript:x"]) {
      expect(urlHttps.safeParse(v).success).toBe(false);
    }
  });

  it("urlHttps ajoute https:// et accepte http(s)", () => {
    expect(urlHttps.parse("linkedin.com/in/jean")).toBe("https://linkedin.com/in/jean");
    expect(urlHttps.parse("http://exemple.ca")).toBe("http://exemple.ca/");
    expect(urlHttps.parse("  https://www.exemple.ca:8443/a?b=1  ")).toBe("https://www.exemple.ca:8443/a?b=1");
    expect(urlHttps.safeParse("https://" + "a".repeat(300) + ".ca").success).toBe(false);
  });

  it("montant : borné, fini, arrondi à 2 décimales", () => {
    expect(montant.safeParse(-1).success).toBe(false);
    expect(montant.safeParse(1e9).success).toBe(false);
    expect(montant.safeParse(Number.NaN).success).toBe(false);
    expect(montant.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    expect(montant.safeParse("12").success).toBe(false);
    expect(montant.parse(3.14159)).toBe(3.14);
    expect(montant.parse(0)).toBe(0);
    expect(montant.parse(10_000_000)).toBe(10_000_000);
  });

  it("courriel, téléphone, texte, uuid, date", () => {
    expect(courriel.parse("  Info@TechnoLot.CA ")).toBe("info@technolot.ca");
    expect(courriel.safeParse("pas-un-courriel").success).toBe(false);
    expect(courriel.safeParse(`${"a".repeat(250)}@x.ca`).success).toBe(false);
    expect(telephone.safeParse("1".repeat(41)).success).toBe(false);
    expect(telephone.parse(" 514-944-3939 ")).toBe("514-944-3939");
    expect(texte(1, 5).safeParse("   ").success).toBe(false);
    expect(texte(1, 5).parse(" abc ")).toBe("abc");
    expect(texte(1, 5).safeParse("abcdef").success).toBe(false);
    expect(uuid.parse("11111111-2222-4333-8444-55555555555A")).toBe("11111111-2222-4333-8444-55555555555a");
    expect(uuid.safeParse("1; drop table lots").success).toBe(false);
    expect(dateIso.safeParse("2026-10-30").success).toBe(true);
    expect(dateIso.safeParse("2026-02-30").success).toBe(false);
    expect(dateIso.safeParse("30/10/2026").success).toBe(false);
  });
});

describe("environnement", () => {
  it("production : erreur claire (noms seulement) si une variable indispensable manque", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "valeur-publique-de-test");
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(() => verifierEnvironnement()).toThrow(/ADMIN_EMAILS/);
    try {
      verifierEnvironnement();
    } catch (e) {
      expect(String(e)).not.toContain("valeur-publique-de-test");
    }
  });

  it("variables de fonction : avertissement (sans valeur) puis 503 propre", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "court-mais-present");
    const bilan = verifierEnvironnement();
    expect(bilan.fonctionManquantes).toContain("CRON_SECRET");
    expect(bilan.fonctionManquantes).toContain("SECURITE_RPC_SECRET");
    const avertissements = vi.mocked(console.warn).mock.calls.map((c) => String(c[0])).join("\n");
    expect(avertissements).toContain("CRON_SECRET");
    expect(avertissements).not.toContain("court-mais-present");

    const r = exigerConfig(["CRON_SECRET"]);
    expect(r?.status).toBe(503);
    const corps = await r!.json();
    expect(corps.error).toBe("Service temporairement indisponible.");
    expect(JSON.stringify(corps)).not.toContain("CRON_SECRET");
    vi.stubEnv("CRON_SECRET", "c".repeat(32));
    expect(exigerConfig(["CRON_SECRET"])).toBeNull();
  });
});
