import { createVerify, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurAffichable } from "@/lib/admin/erreur-affichable";
import { jetonCompteService, lireCompteService, oublierJetons } from "@/lib/google/compte-service";

/*
 * Compte de service Google (lib/google/compte-service.ts) : lecture de la clé,
 * jeton signé (JWT RS256) et réutilisation du jeton tant qu'il est valide.
 * Clé RSA de test générée ici ; aucun appel réseau (fetch simulé).
 */

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const SA = { type: "service_account", client_email: "robot@projet.iam.gserviceaccount.com", private_key: privateKey };
const PORTEE = "https://www.googleapis.com/auth/calendar.events";

const decoder = (partie: string) => JSON.parse(Buffer.from(partie, "base64url").toString("utf8"));

let fetchSimule: ReturnType<typeof vi.fn>;

function repondre(statut: number, corps: unknown) {
  fetchSimule.mockResolvedValueOnce(new Response(JSON.stringify(corps), { status: statut }));
}

beforeEach(() => {
  oublierJetons();
  fetchSimule = vi.fn();
  vi.stubGlobal("fetch", fetchSimule);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("lireCompteService", () => {
  it("JSON brut ou encodé en base64", () => {
    const brut = JSON.stringify(SA);
    expect(lireCompteService(brut)?.client_email).toBe(SA.client_email);
    expect(lireCompteService(Buffer.from(brut).toString("base64"))?.client_email).toBe(SA.client_email);
    expect(lireCompteService(`  ${brut}\n`)?.private_key).toBe(privateKey);
  });

  it("absente, vide ou incomplète → null", () => {
    expect(lireCompteService(undefined)).toBeNull();
    expect(lireCompteService("   ")).toBeNull();
    expect(lireCompteService("pas du json")).toBeNull();
    expect(lireCompteService(JSON.stringify({ client_email: "x@y" }))).toBeNull();
  });
});

describe("jetonCompteService", () => {
  it("JWT RS256 signé avec la clé, échangé contre un jeton d'accès", async () => {
    repondre(200, { access_token: "jeton-1", expires_in: 3599 });
    await expect(jetonCompteService(SA, PORTEE, "VAR")).resolves.toBe("jeton-1");

    expect(fetchSimule).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSimule.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const corps = new URLSearchParams(String(init.body));
    expect(corps.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");

    const [entete, charge, signature] = (corps.get("assertion") ?? "").split(".");
    expect(decoder(entete)).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = decoder(charge);
    expect(claims).toMatchObject({ iss: SA.client_email, scope: PORTEE, aud: "https://oauth2.googleapis.com/token" });
    expect(claims.exp - claims.iat).toBe(3600);
    const valide = createVerify("RSA-SHA256").update(`${entete}.${charge}`).verify(publicKey, signature, "base64url");
    expect(valide).toBe(true);
  });

  it("réutilise le jeton jusqu'à une minute de son expiration, par portée", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-02T15:00:00Z"));
    repondre(200, { access_token: "jeton-1", expires_in: 120 });
    repondre(200, { access_token: "autre-portee", expires_in: 3599 });
    repondre(200, { access_token: "jeton-2", expires_in: 3599 });

    await expect(jetonCompteService(SA, PORTEE, "VAR")).resolves.toBe("jeton-1");
    vi.setSystemTime(new Date("2026-11-02T15:00:59Z"));
    await expect(jetonCompteService(SA, PORTEE, "VAR")).resolves.toBe("jeton-1");
    await expect(jetonCompteService(SA, "https://www.googleapis.com/auth/adwords", "VAR")).resolves.toBe("autre-portee");
    vi.setSystemTime(new Date("2026-11-02T15:01:01Z"));
    await expect(jetonCompteService(SA, PORTEE, "VAR")).resolves.toBe("jeton-2");
    expect(fetchSimule).toHaveBeenCalledTimes(3);
  });

  it("oublierJetons force une nouvelle demande", async () => {
    repondre(200, { access_token: "jeton-1", expires_in: 3599 });
    repondre(200, { access_token: "jeton-2", expires_in: 3599 });
    await jetonCompteService(SA, PORTEE, "VAR");
    oublierJetons();
    await expect(jetonCompteService(SA, PORTEE, "VAR")).resolves.toBe("jeton-2");
  });

  it("refus de Google : messages français, détail brut gardé pour le journal", async () => {
    repondre(400, { error: "invalid_grant", error_description: "Invalid JWT Signature." });
    await expect(jetonCompteService(SA, PORTEE, "VAR")).rejects.toThrow(/invalid_grant/);

    repondre(403, { error: "unauthorized_client", error_description: "brut" });
    const err = await jetonCompteService(SA, PORTEE, "VAR").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ErreurAffichable);
    expect((err as ErreurAffichable).message).toBe("Authentification Google refusée (403).");
    expect((err as ErreurAffichable).detail).toEqual({ error: "unauthorized_client", error_description: "brut" });
  });

  it("clé privée illisible ou réseau coupé", async () => {
    await expect(jetonCompteService({ ...SA, private_key: "pas une clé" }, PORTEE, "MA_VARIABLE")).rejects.toThrow(
      "Clé privée du compte de service Google illisible (MA_VARIABLE).",
    );
    expect(fetchSimule).not.toHaveBeenCalled();

    fetchSimule.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(jetonCompteService(SA, PORTEE, "VAR")).rejects.toThrow("Impossible de joindre Google OAuth (erreur réseau).");
  });
});
