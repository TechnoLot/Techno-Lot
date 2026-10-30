import { afterEach, describe, expect, it, vi } from "vitest";
import { configurationSecuriteIncomplete, VARIABLES_SECURITE_ADMIN } from "@/lib/securite/env";

/**
 * M2 (revue check 26) : bandeau de l'admin quand SITE_URL ou
 * SECURITE_RPC_SECRET manque ou est invalide. La fonction ne renvoie que des
 * NOMS, jamais une valeur.
 */

const SECRET_OK = "s".repeat(32);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configurationSecuriteIncomplete", () => {
  it("ne surveille que SITE_URL et SECURITE_RPC_SECRET", () => {
    expect([...VARIABLES_SECURITE_ADMIN]).toEqual(["SITE_URL", "SECURITE_RPC_SECRET"]);
  });

  it("liste vide quand tout est configuré", () => {
    vi.stubEnv("SITE_URL", "https://www.technolot.ca");
    vi.stubEnv("SECURITE_RPC_SECRET", SECRET_OK);
    expect(configurationSecuriteIncomplete()).toEqual([]);
  });

  it("accepte http (développement)", () => {
    vi.stubEnv("SITE_URL", "http://localhost:3000");
    vi.stubEnv("SECURITE_RPC_SECRET", SECRET_OK);
    expect(configurationSecuriteIncomplete()).toEqual([]);
  });

  it("signale les deux noms quand rien n'est défini", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("SECURITE_RPC_SECRET", "");
    expect(configurationSecuriteIncomplete()).toEqual(["SITE_URL", "SECURITE_RPC_SECRET"]);
  });

  it("signale une valeur faite d'espaces", () => {
    vi.stubEnv("SITE_URL", "   ");
    vi.stubEnv("SECURITE_RPC_SECRET", SECRET_OK);
    expect(configurationSecuriteIncomplete()).toEqual(["SITE_URL"]);
  });

  it.each(["technolot.ca", "pas une url", "ftp://technolot.ca", "javascript:alert(1)"])(
    "SITE_URL invalide (%s) → signalée",
    (valeur) => {
      vi.stubEnv("SITE_URL", valeur);
      vi.stubEnv("SECURITE_RPC_SECRET", SECRET_OK);
      expect(configurationSecuriteIncomplete()).toEqual(["SITE_URL"]);
    },
  );

  it("SECURITE_RPC_SECRET de moins de 32 caractères → signalé", () => {
    vi.stubEnv("SITE_URL", "https://www.technolot.ca");
    vi.stubEnv("SECURITE_RPC_SECRET", "s".repeat(31));
    expect(configurationSecuriteIncomplete()).toEqual(["SECURITE_RPC_SECRET"]);
  });

  it("ne renvoie jamais une valeur", () => {
    const secretCourt = "valeur-secrete-courte";
    vi.stubEnv("SITE_URL", "pas-une-url-secrete");
    vi.stubEnv("SECURITE_RPC_SECRET", secretCourt);
    const sortie = JSON.stringify(configurationSecuriteIncomplete());
    expect(sortie).not.toContain(secretCourt);
    expect(sortie).not.toContain("pas-une-url-secrete");
  });
});
