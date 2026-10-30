import { afterEach, describe, expect, it, vi } from "vitest";
import { origineConfiguree } from "@/lib/admin/origin";

/**
 * Origine des liens d'authentification en production : jamais un hôte choisi
 * par le client, mais le retour se fait sur la même forme (avec ou sans
 * « www ») que la demande, sinon le témoin PKCE ne serait pas relu.
 */
function requete(url: string, entetes: Record<string, string> = {}): Request {
  return new Request(url, { headers: entetes });
}

describe("origineConfiguree en production", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("garde l'hôte sans www quand la demande arrive sans www", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "https://www.technolot.ca");
    expect(origineConfiguree(requete("https://technolot.ca/admin/auth/request"))).toBe(
      "https://technolot.ca",
    );
  });

  it("garde l'hôte www quand la demande arrive avec www", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "https://technolot.ca");
    expect(
      origineConfiguree(
        requete("http://127.0.0.1:3000/admin/auth/request", { host: "www.technolot.ca" }),
      ),
    ).toBe("https://www.technolot.ca");
  });

  it("ignore un hôte inventé dans Host ou X-Forwarded-Host", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "https://www.technolot.ca");
    const r = requete("http://127.0.0.1:3000/admin/auth/request", {
      host: "evil.example",
      "x-forwarded-host": "technolot.ca.evil.example",
    });
    expect(origineConfiguree(r)).toBe("https://www.technolot.ca");
  });

  it("refuse les variantes proches du domaine", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "https://technolot.ca");
    for (const hote of ["eviltechnolot.ca", "technolot.ca.evil.example", "www.www.technolot.ca", "technolot.ca:8443"]) {
      expect(origineConfiguree(requete("http://127.0.0.1:3000/x", { host: hote }))).toBe(
        "https://technolot.ca",
      );
    }
  });

  it("revient à l'URL canonique sans requête", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "https://technolot.ca");
    expect(origineConfiguree()).toBe("https://technolot.ca");
  });
});
