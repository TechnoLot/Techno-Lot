import { describe, expect, it } from "vitest";
import { cheminInterne } from "@/lib/securite/chemin-interne";

const BS = "\\";
const SITE = "https://www.technolot.ca";

// Charges de redirection ouverte (audit T5 + test-redirections.mjs), sous leur
// forme brute ET telle que searchParams.get("next") les décode.
const CHARGES_BRUTES = [
  "//evil.com",
  `/${BS}evil.com`,
  "/%2F%2Fevil.com",
  "/%5Cevil.com",
  "%2F%2Fevil.com",
  "/%09/evil.com",
  "/\t/evil.com",
  "/%0A/evil.com",
  "/\n/evil.com",
  "/%0D/evil.com",
  "/\r/evil.com",
  "/%09%5Cevil.com",
  "/%252F%252Fevil.com",
  "https://evil.com",
  "javascript:alert(1)",
  "JaVaScRiPt:alert(document.cookie)",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "/blog",
  "/",
  "/administrateur",
  "/admin@evil.com",
  "/admin/../blog",
  "/admin/%2e%2e/blog",
  "/admin/../../evil.com",
  `/admin${BS}..${BS}evil.com`,
  "/admin\u0000",
  " /admin",
  "admin/crm",
  "",
];

describe("cheminInterne", () => {
  it.each(CHARGES_BRUTES)("refuse %j (forme brute)", (charge) => {
    expect(cheminInterne(charge)).toBe("/admin");
  });

  it.each(CHARGES_BRUTES.filter(Boolean))("refuse %j décodé par searchParams", (charge) => {
    const decode = new URL(`${SITE}/admin/login?next=${charge}`).searchParams.get("next");
    expect(cheminInterne(decode)).toBe("/admin");
  });

  it("ne sort jamais du site, quelle que soit la charge", () => {
    for (const c of CHARGES_BRUTES) {
      expect(new URL(cheminInterne(c), SITE).origin).toBe(SITE);
      const decode = new URL(`${SITE}/admin/login?next=${c}`).searchParams.get("next");
      expect(new URL(cheminInterne(decode), SITE).origin).toBe(SITE);
    }
  });

  it.each([
    ["/admin", "/admin"],
    ["/admin/crm?x=1", "/admin/crm?x=1"],
    ["/admin/lots/123#a", "/admin/lots/123#a"],
    ["/admin?onglet=1", "/admin?onglet=1"],
    ["/admin/crm/./clients", "/admin/crm/clients"],
  ])("accepte %j → %j", (entree, attendu) => {
    expect(cheminInterne(entree)).toBe(attendu);
  });

  it("utilise le défaut fourni et refuse les non-chaînes", () => {
    expect(cheminInterne(null)).toBe("/admin");
    expect(cheminInterne(undefined, "/admin/crm")).toBe("/admin/crm");
    expect(cheminInterne(42)).toBe("/admin");
    expect(cheminInterne(["/admin/crm"])).toBe("/admin");
    expect(cheminInterne("/admin/" + "a".repeat(3000))).toBe("/admin");
  });
});
