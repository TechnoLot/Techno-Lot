import { describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { modifyRouteRegex } from "next/dist/lib/redirect-status";
import nextConfig from "../../next.config.mjs";

/**
 * En-têtes de sécurité déclarés dans next.config.mjs (check 14) : lus dans la
 * configuration, et appliqués à un chemin avec le même moteur de
 * correspondance que Next (buildCustomRoute de
 * next/dist/server/lib/router-utils/filesystem.js : path-to-regexp strict +
 * modifyRouteRegex, qui accepte la barre oblique finale).
 */

type Regle = { source: string; headers: { key: string; value: string }[] };

async function regles(): Promise<Regle[]> {
  const headers = (nextConfig as { headers?: () => Promise<Regle[]> }).headers;
  if (!headers) throw new Error("headers() absent de next.config.mjs");
  return headers();
}

/** En-têtes appliqués à un chemin (la dernière règle gagne, comme dans Next). */
async function entetesPour(chemin: string): Promise<Record<string, string>> {
  const resultat: Record<string, string> = {};
  for (const r of await regles()) {
    const correspond = getPathMatch(r.source, {
      strict: true,
      removeUnnamedParams: true,
      regexModifier: (regex: string) => modifyRouteRegex(regex),
    });
    if (correspond(chemin) === false) continue;
    for (const h of r.headers) resultat[h.key.toLowerCase()] = h.value;
  }
  return resultat;
}

describe("next.config.mjs — en-têtes de sécurité", () => {
  it("garde les réglages existants (poweredByHeader, images, experimental)", () => {
    const c = nextConfig as Record<string, unknown> & {
      experimental: { staleTimes: unknown; optimizePackageImports: unknown };
      images: { formats: unknown; minimumCacheTTL: unknown };
    };
    expect(c.poweredByHeader).toBe(false);
    expect(c.experimental.staleTimes).toEqual({ dynamic: 30 });
    expect(c.experimental.optimizePackageImports).toEqual(["lucide-react", "framer-motion"]);
    expect(c.images.formats).toEqual(["image/avif", "image/webp"]);
    expect(c.images.minimumCacheTTL).toBe(60 * 60 * 24 * 30);
  });

  for (const chemin of ["/", "/en", "/blog", "/admin/login", "/api/soumission", "/_next/static/chunks/a.js"]) {
    it(`en-têtes communs sur ${chemin}`, async () => {
      const e = await entetesPour(chemin);
      expect(e["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
      expect(e["strict-transport-security"]).not.toMatch(/preload/);
      expect(e["x-content-type-options"]).toBe("nosniff");
      expect(e["x-frame-options"]).toBe("SAMEORIGIN");
      expect(e["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(e["cross-origin-opener-policy"]).toBe("same-origin");
      expect(e["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    });
  }

  it("CSP publique en Report-Only sur le site public, jamais sur /admin", async () => {
    for (const chemin of ["/", "/en", "/blog", "/blog/un-article", "/en/blog", "/soumission", "/administration-x"]) {
      const e = await entetesPour(chemin);
      expect(e["content-security-policy-report-only"], chemin).toBeTruthy();
      expect(e["content-security-policy"], chemin).toBeUndefined();
    }
    for (const chemin of ["/admin", "/admin/login", "/admin/soumissions", "/admin/calculatrice/embed"]) {
      const e = await entetesPour(chemin);
      expect(e["content-security-policy-report-only"], chemin).toBeUndefined();
      expect(e["content-security-policy"], chemin).toBeUndefined();
    }
  });

  it("CSP publique : directives attendues, repli Soro et pixels autorisés", async () => {
    const csp = (await entetesPour("/blog"))["content-security-policy-report-only"];
    const directives = Object.fromEntries(
      csp.split(";").map((d) => {
        const [nom, ...valeurs] = d.trim().split(/\s+/);
        return [nom, valeurs];
      }),
    );
    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(directives["base-uri"]).toEqual(["'self'"]);
    expect(directives["form-action"]).toEqual(["'self'"]);
    expect(directives["frame-ancestors"]).toEqual(["'self'"]);
    expect(directives["upgrade-insecure-requests"]).toEqual([]);
    expect(directives["script-src"]).toEqual(expect.arrayContaining(["'self'", "https://app.trysoro.com", "https://connect.facebook.net", "https://www.googletagmanager.com"]));
    expect(directives["script-src"]).not.toContain("'unsafe-eval'");
    expect(directives["connect-src"]).toEqual(expect.arrayContaining(["'self'", "https://app.trysoro.com", "https://www.facebook.com"]));
    expect(directives["img-src"]).toEqual(expect.arrayContaining(["'self'", "data:", "https:"]));
  });

  it("Cache-Control: no-store sur les API privées", async () => {
    for (const chemin of [
      "/api/admin/notifications",
      "/api/admin/soumissions/abc/courriel/pieces/1",
      "/admin/calculatrice/api/saved",
      "/admin/calculatrice/api/saved/123",
      "/api/cron/sync",
    ]) {
      expect((await entetesPour(chemin))["cache-control"], chemin).toBe("no-store");
    }
    for (const chemin of ["/", "/api/soumission", "/admin/soumissions"]) {
      expect((await entetesPour(chemin))["cache-control"], chemin).toBeUndefined();
    }
  });

  it("cache d'un an conservé pour les photos et le logo", async () => {
    expect((await entetesPour("/photos/a.webp"))["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect((await entetesPour("/logo.png"))["cache-control"]).toBe("public, max-age=31536000, immutable");
  });
});
