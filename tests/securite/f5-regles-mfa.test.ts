import { describe, expect, it } from "vitest";
import {
  cheminApresMfa,
  codeTotpValide,
  CODE_TOTP,
  doitPasserParMfa,
  estPageMfa,
  facteursTotp,
  MOTIF_CODE_TOTP,
  niveauAal,
  urlMfa,
} from "@/lib/securite/mfa";
import { estRouteAdminPublique } from "@/lib/securite/regles-middleware";
import { fichiersAVerifier, verifierFichier } from "../../scripts/verif-garde-admin.mjs";

/* Double authentification (F5) : règles pures partagées par le middleware,
 * la garde, les routes de /admin/auth/mfa et le formulaire. */

describe("code TOTP", () => {
  it("exactement 6 chiffres", () => {
    expect(codeTotpValide("123456")).toBe(true);
    expect(codeTotpValide("000000")).toBe(true);
    for (const mauvais of ["12345", "1234567", "12345a", " 123456", "123 456", "１２３４５６", "", "123456\n"]) {
      expect(codeTotpValide(mauvais)).toBe(false);
    }
    expect(codeTotpValide(123456)).toBe(false);
    expect(codeTotpValide(null)).toBe(false);
  });

  it("le motif du champ (pattern) est la même règle", () => {
    // Le navigateur applique `pattern` comme ^(?:motif)$.
    const navigateur = new RegExp(`^(?:${MOTIF_CODE_TOTP})$`);
    expect(navigateur.test("123456")).toBe(true);
    expect(navigateur.test("12345a")).toBe(false);
    expect(CODE_TOTP.source).toBe(`^${MOTIF_CODE_TOTP}$`);
  });
});

describe("niveau aal du jeton", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  it("lu seulement dans les revendications du même utilisateur", () => {
    expect(niveauAal({ sub: id, aal: "aal2" }, id)).toBe("aal2");
    expect(niveauAal({ sub: id, aal: "aal1" }, id)).toBe("aal1");
    expect(niveauAal({ sub: "autre", aal: "aal2" }, id)).toBeNull();
    expect(niveauAal({ sub: id }, id)).toBeNull();
    expect(niveauAal({ sub: id, aal: 2 }, id)).toBeNull();
    expect(niveauAal(null, id)).toBeNull();
    expect(niveauAal("aal2", id)).toBeNull();
  });

  it("aal1 ou inconnu → passer par le code ; aal2 → accès ; jamais sur la page MFA elle-même", () => {
    expect(doitPasserParMfa("/admin", "aal1")).toBe(true);
    expect(doitPasserParMfa("/admin/crm", null)).toBe(true);
    expect(doitPasserParMfa("/admin/crm", "aal2")).toBe(false);
    expect(doitPasserParMfa("/admin/auth/mfa", "aal1")).toBe(false);
    expect(doitPasserParMfa("/admin/auth/mfa/", null)).toBe(false);
  });
});

describe("chemins", () => {
  it("la PAGE /admin/auth/mfa exige une session ; ses routes POST et la connexion restent publiques", () => {
    expect(estPageMfa("/admin/auth/mfa")).toBe(true);
    expect(estPageMfa("/admin/auth/mfa/verification")).toBe(false);
    expect(estRouteAdminPublique("/admin/auth/mfa")).toBe(false);
    expect(estRouteAdminPublique("/admin/auth/mfa/")).toBe(false);
    expect(estRouteAdminPublique("/admin/auth/mfa/verification")).toBe(true);
    expect(estRouteAdminPublique("/admin/auth/mfa/activation")).toBe(true);
    expect(estRouteAdminPublique("/admin/auth/callback")).toBe(true);
    expect(estRouteAdminPublique("/admin/login")).toBe(true);
  });

  it("`next` interne conservé, requête comprise", () => {
    expect(urlMfa("/admin/crm?filtre=a")).toBe("/admin/auth/mfa?next=%2Fadmin%2Fcrm%3Ffiltre%3Da");
    expect(cheminApresMfa("/admin/lots/abc?x=1#y")).toBe("/admin/lots/abc?x=1#y");
    expect(urlMfa()).toBe("/admin/auth/mfa?next=%2Fadmin");
  });

  it("`next` externe, de connexion ou de MFA → /admin (pas de redirection ouverte ni de boucle)", () => {
    for (const mauvais of [
      "//evil.example",
      "/\\evil.example",
      "https://evil.example",
      "javascript:alert(1)",
      "/blog",
      "/admin/login",
      "/admin/login?next=/admin",
      "/admin/auth/mfa",
      "/admin/auth/mfa?next=%2Fadmin",
      "/admin/auth/callback?code=x",
      "/admin/auth",
      "/admin/x/../auth/mfa",
    ]) {
      expect(cheminApresMfa(mauvais)).toBe("/admin");
      expect(urlMfa(mauvais)).toBe("/admin/auth/mfa?next=%2Fadmin");
    }
    expect(cheminApresMfa("/admin/authentique")).toBe("/admin/authentique");
  });
});

describe("script de garde (refus par défaut)", () => {
  const route = 'export async function POST(r) { const g = await exigerSessionMfaRoute(r); }';
  const action = '"use server";\nexport async function x() { await exigerSessionMfaRoute(); }';

  it("la garde de session MFA compte sous app/admin/auth/mfa/ seulement", () => {
    expect(verifierFichier("app/admin/auth/mfa/verification/route.ts", route)).toEqual([]);
    expect(verifierFichier("app/admin/auth/mfa/page.tsx", "await exigerSessionMfaPage(next);")).toEqual([]);
    // Ailleurs, elle ne remplace pas la garde admin (aal2 + est_admin).
    expect(verifierFichier("app/api/admin/x/route.ts", route)).toEqual(["POST sans garde"]);
    expect(verifierFichier("app/admin/(dashboard)/x/page.tsx", "await exigerSessionMfaPage();")).toEqual([
      "aucun appel à la garde",
    ]);
    expect(verifierFichier("lib/admin/x.ts", action)).toEqual(["action x sans adminPourAction()"]);
  });

  it("les fichiers de /admin/auth/mfa sont bien vérifiés", () => {
    const cibles = fichiersAVerifier();
    expect(cibles).toContain("app/admin/auth/mfa/page.tsx");
    expect(cibles).toContain("app/admin/auth/mfa/activation/route.ts");
    expect(cibles).toContain("app/admin/auth/mfa/verification/route.ts");
  });
});

describe("facteurs TOTP", () => {
  it("sépare vérifiés et non vérifiés, ignore les autres types", () => {
    const f = (id: string, factor_type: string, status: string) => ({
      id,
      factor_type,
      status,
      created_at: "2026-10-30T12:00:00Z",
    });
    const { verifies, nonVerifies } = facteursTotp([
      f("a", "totp", "verified"),
      f("b", "totp", "unverified"),
      f("c", "phone", "verified"),
      f("d", "webauthn", "unverified"),
    ]);
    expect(verifies.map((x) => x.id)).toEqual(["a"]);
    expect(nonVerifies.map((x) => x.id)).toEqual(["b"]);
    expect(facteursTotp(undefined)).toEqual({ verifies: [], nonVerifies: [] });
    expect(facteursTotp(null)).toEqual({ verifies: [], nonVerifies: [] });
  });
});
