import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { appelleGarde, fichiersAVerifier, verifierFichier } from "../../scripts/verif-garde-admin.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("scripts/verif-garde-admin.mjs (refus par défaut)", () => {
  it("le dépôt passe : chaque page, route et action admin appelle la garde", () => {
    const sortie = execFileSync(process.execPath, [join(RACINE, "scripts", "verif-garde-admin.mjs")], {
      cwd: RACINE,
      encoding: "utf8",
    });
    expect(sortie).toMatch(/tous gardés/);
  });

  it("couvre les pages, le layout, les routes admin et les fichiers « use server »", () => {
    const cibles: string[] = fichiersAVerifier();
    expect(cibles).toContain("app/admin/(dashboard)/layout.tsx");
    expect(cibles).toContain("app/admin/(dashboard)/lots/page.tsx");
    expect(cibles).toContain("app/api/admin/notifications/route.ts");
    expect(cibles).toContain("app/admin/(dashboard)/calculatrice/api/send/route.ts");
    expect(cibles).toContain("app/api/cron/sync/route.ts");
    expect(cibles).toContain("lib/crm/actions.ts");
    expect(cibles).toContain("app/admin/(dashboard)/compte/actions.ts");
    expect(cibles.filter((f) => f.endsWith("/page.tsx")).length).toBeGreaterThanOrEqual(21);
  });

  it("échoue sur une page sans garde, ou dont la garde n'est qu'importée ou commentée", () => {
    expect(verifierFichier("app/admin/(dashboard)/x/page.tsx", "export default async function P() { return null; }")).not.toEqual([]);
    expect(
      verifierFichier(
        "app/admin/(dashboard)/x/page.tsx",
        'import { exigerAdminPage } from "@/lib/securite/garde";\n// await exigerAdminPage("/admin");\nexport default function P() {}',
      ),
    ).not.toEqual([]);
    expect(
      verifierFichier("app/admin/(dashboard)/x/page.tsx", 'export default async function P() { await exigerAdminPage("/admin"); }'),
    ).toEqual([]);
  });

  it("échoue sur une route dont UNE méthode n'est pas gardée", () => {
    const source = `
      export const runtime = "nodejs";
      export async function GET(request: Request) { const g = await exigerAdminRoute(request); return g; }
      export async function DELETE(request: Request) { return new Response("supprimé"); }
    `;
    expect(verifierFichier("app/api/admin/x/route.ts", source)).toEqual(["DELETE sans garde"]);
  });

  it("échoue sur une action serveur sans adminPourAction()", () => {
    const source = `"use server";
      export async function ok() { const ctx = await adminPourAction(); return ctx; }
      export async function oubli(id: string) { return supprimer(id); }
    `;
    expect(verifierFichier("lib/x/actions.ts", source)).toEqual(["action oubli sans adminPourAction()"]);
  });

  it("appelleGarde exige un appel, pas un nom", () => {
    expect(appelleGarde("import { bearerCronValide } from 'x';")).toBe(false);
    expect(appelleGarde("if (!bearerCronValide(request)) return refus;")).toBe(true);
  });
});
