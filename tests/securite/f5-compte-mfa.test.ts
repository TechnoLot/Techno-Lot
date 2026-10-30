import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* Mon compte → « Changer d'appareil » (F5) : session aal2 exigée (adminPourAction),
 * désinscription du facteur actuel puis rafraîchissement de la session. */

const a = vi.hoisted(() => ({
  ctx: null as null | Record<string, unknown>,
  appels: [] as string[],
}));

vi.mock("@/lib/securite/garde", () => ({ adminPourAction: async () => a.ctx }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": "203.0.113.5" }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

import { changerAppareilMfa } from "@/app/admin/(dashboard)/compte/actions";

function contexte(factors: { id: string; factor_type: string; status: string }[]) {
  return {
    requestId: "r-1",
    user: { id: "u-1", email: "info@technolot.ca", factors },
    supabase: {
      auth: {
        mfa: {
          unenroll: async ({ factorId }: { factorId: string }) => {
            a.appels.push(`unenroll:${factorId}`);
            return { data: { id: factorId }, error: null };
          },
        },
        refreshSession: async () => {
          a.appels.push("refresh");
          return { data: {}, error: null };
        },
      },
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubEnv("SECURITE_RPC_SECRET", "");
  a.ctx = null;
  a.appels = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("changerAppareilMfa", () => {
  it("sans session aal2 (garde refusée) → refus, rien désinscrit", async () => {
    const r = await changerAppareilMfa();
    expect(r.ok).toBe(false);
    expect(a.appels).toEqual([]);
  });

  it("aal2 → désinscrit chaque facteur TOTP puis rafraîchit la session", async () => {
    a.ctx = contexte([
      { id: "t1", factor_type: "totp", status: "verified" },
      { id: "p1", factor_type: "phone", status: "verified" },
    ]);
    expect(await changerAppareilMfa()).toEqual({ ok: true });
    expect(a.appels).toEqual(["unenroll:t1", "refresh"]);
  });
});
