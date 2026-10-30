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
import {
  declencheAction,
  etapeSuivante,
  PHRASE_CONFIRMATION,
  type EtapeChangerAppareil,
  type EvenementChangerAppareil,
} from "@/lib/admin/changer-appareil";

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

// --- Confirmation en deux temps (logique du bouton « Changer d'appareil ») ----------
// Le composant TSX n'est pas chargeable par vitest (environnement node, jsx
// « preserve », aucune bibliothèque de rendu) : sa logique vit dans
// lib/admin/changer-appareil.ts et c'est elle qui est testée ici.

describe("Changer d'appareil : confirmation en deux temps", () => {
  /** Rejoue une suite de clics et compte les appels à l'action serveur. */
  function rejouer(evenements: EvenementChangerAppareil[]) {
    let etape: EtapeChangerAppareil = "repos";
    let appels = 0;
    for (const e of evenements) {
      if (declencheAction(etape, e)) appels += 1;
      etape = etapeSuivante(etape, e);
    }
    return { etape, appels };
  }

  it("premier clic : confirmation affichée, rien retiré", () => {
    expect(rejouer(["demander"])).toEqual({ etape: "confirmation", appels: 0 });
    expect(PHRASE_CONFIRMATION).toBe("Ton application actuelle ne donnera plus de code valide. Continuer ?");
  });

  it("Annuler : retour à l'état initial, rien retiré", () => {
    expect(rejouer(["demander", "annuler"])).toEqual({ etape: "repos", appels: 0 });
  });

  it("Oui, changer d'appareil : une seule action, même sur double clic", () => {
    expect(rejouer(["demander", "confirmer"])).toEqual({ etape: "envoi", appels: 1 });
    expect(rejouer(["demander", "confirmer", "confirmer", "annuler"])).toEqual({ etape: "envoi", appels: 1 });
  });

  it("confirmer sans demander d'abord : aucun effet", () => {
    expect(rejouer(["confirmer"])).toEqual({ etape: "repos", appels: 0 });
  });

  it("échec : erreur affichée, il faut redemander puis reconfirmer", () => {
    expect(rejouer(["demander", "confirmer", "echec"])).toEqual({ etape: "erreur", appels: 1 });
    expect(rejouer(["demander", "confirmer", "echec", "confirmer"])).toEqual({ etape: "erreur", appels: 1 });
    expect(rejouer(["demander", "confirmer", "echec", "demander", "confirmer"])).toEqual({ etape: "envoi", appels: 2 });
  });
});
