import { afterEach, describe, expect, it, vi } from "vitest";
import { ipClient, normaliserIp } from "@/lib/securite/ip";

function requete(entetes: Record<string, string>): Request {
  return new Request("https://www.technolot.ca/api/test", { headers: entetes });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ipClient — Vercel", () => {
  it("prend x-real-ip, pas x-forwarded-for", () => {
    vi.stubEnv("VERCEL", "1");
    expect(ipClient(requete({ "x-real-ip": "203.0.113.5", "x-forwarded-for": "6.6.6.6" }))).toBe("203.0.113.5");
  });

  it("repli sur x-vercel-forwarded-for (client d'origine en tête)", () => {
    vi.stubEnv("VERCEL", "1");
    expect(ipClient(requete({ "x-vercel-forwarded-for": "198.51.100.4, 10.0.0.1" }))).toBe("198.51.100.4");
  });

  it("inconnue sans en-tête Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(ipClient(requete({ "x-forwarded-for": "6.6.6.6" }))).toBe("inconnue");
  });
});

describe("ipClient — Hostinger (LiteSpeed)", () => {
  it("prend la DERNIÈRE entrée de x-forwarded-for", () => {
    vi.stubEnv("VERCEL", "");
    expect(ipClient(requete({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("ignore les entrées falsifiées en tête", () => {
    vi.stubEnv("VERCEL", "");
    const r = requete({ "x-forwarded-for": "1.1.1.1, 8.8.8.8, 192.0.2.44" });
    expect(ipClient(r)).toBe("192.0.2.44");
  });

  it("une seule entrée", () => {
    vi.stubEnv("VERCEL", "");
    expect(ipClient(requete({ "x-forwarded-for": "192.0.2.10" }))).toBe("192.0.2.10");
  });

  it("vide ou absent → x-real-ip, sinon inconnue", () => {
    vi.stubEnv("VERCEL", "");
    expect(ipClient(requete({ "x-forwarded-for": " , ", "x-real-ip": "192.0.2.11" }))).toBe("192.0.2.11");
    expect(ipClient(requete({}))).toBe("inconnue");
    expect(ipClient(requete({ "x-forwarded-for": "" }))).toBe("inconnue");
  });

  it("format invalide → inconnue", () => {
    vi.stubEnv("VERCEL", "");
    expect(ipClient(requete({ "x-forwarded-for": "1.1.1.1, pas-une-ip" }))).toBe("inconnue");
    expect(ipClient(requete({ "x-forwarded-for": "999.1.1.1" }))).toBe("inconnue");
    expect(ipClient(requete({ "x-forwarded-for": "<script>" }))).toBe("inconnue");
  });

  it("accepte IPv6 (normalisée) et un objet Headers", () => {
    vi.stubEnv("VERCEL", "");
    expect(ipClient(new Headers({ "x-forwarded-for": "10.0.0.1, 2001:DB8::1" }))).toBe("2001:db8::1");
    expect(ipClient(new Headers({ "x-real-ip": "[::1]" }))).toBe("::1");
  });
});

describe("normaliserIp", () => {
  it.each([
    ["192.0.2.1", "192.0.2.1"],
    ["::ffff:192.0.2.1", "::ffff:c000:201"],
    ["2001:db8:0:0:0:0:0:1", "2001:db8::1"],
  ])("%s → %s", (entree, attendu) => {
    expect(normaliserIp(entree)).toBe(attendu);
  });

  it.each(["", "1.2.3", "1.2.3.4.5", "01.2.3.4x", "fe80::1%eth0", "2001:db8::g", "a".repeat(50)])(
    "refuse %j",
    (entree) => {
      expect(normaliserIp(entree)).toBeNull();
    },
  );
});
