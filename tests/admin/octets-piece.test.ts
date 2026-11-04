import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurHostinger, octetsPiece, piecesDuCourriel, preparerEnvoyeur } from "@/lib/hostinger/mail";

/*
 * Pièces jointes lues par la lecture automatique : fetch simulé (aucun réseau,
 * aucune vraie clé). La taille annoncée par la boîte ne fait pas foi.
 */

const MO = 1024 * 1024;

type Reponses = { attachments: unknown[]; corps?: BodyInit | null };

function simuler({ attachments, corps = null }: Reponses) {
  const appels: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    appels.push(url);
    if (url.includes("/attachments/")) return new Response(corps);
    return Response.json({ data: { uid: 7, attachments } });
  });
  return appels;
}

function flux(morceaux: Uint8Array[], lorsAnnule?: () => void): ReadableStream<Uint8Array> {
  return new ReadableStream({
    pull(c) {
      const m = morceaux.shift();
      if (m) c.enqueue(m);
      else c.close();
    },
    cancel: lorsAnnule,
  });
}

const PIECE = { id: "p1", filename: "lot.pdf", contentType: "application/pdf", sizeBytes: 3 };

beforeEach(() => {
  vi.stubEnv("HOSTINGER_MAIL_API_TOKEN", "cle-de-test");
  vi.stubEnv("HOSTINGER_MAIL_MAILBOX_ID", "boite-fictive");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Rend chaque statut de `statuts` à son tour, puis une réponse normale. */
function simulerPannes(statuts: number[]) {
  const appels: { url: string; methode: string }[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    appels.push({ url, methode: init?.method ?? "GET" });
    const statut = statuts.shift();
    if (statut) return new Response("", { status: statut });
    return Response.json({ data: { uid: 7, attachments: [PIECE] } });
  });
  return appels;
}

/** Laisse passer les pauses entre les essais, sans attendre pour de vrai. */
async function sansPauses<T>(travail: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(10_000);
  return travail;
}

describe("pannes passagères de la boîte", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("réessaie une lecture après un 503, sans que l'appelant le voie", async () => {
    const appels = simulerPannes([503, 503]);
    const lues = await sansPauses(piecesDuCourriel("INBOX", 7));
    expect(lues).toHaveLength(1);
    expect(appels).toHaveLength(3);
  });

  it("abandonne après 4 essais et garde le statut de la panne", async () => {
    const appels = simulerPannes([503, 503, 503, 503, 503]);
    const travail = piecesDuCourriel("INBOX", 7).catch((e) => e);
    const erreur = await sansPauses(travail);
    expect(erreur).toBeInstanceOf(ErreurHostinger);
    expect(erreur.status).toBe(503);
    expect(appels).toHaveLength(4);
  });

  it.each([429, 404, 401])("ne réessaie pas un %i", async (statut) => {
    const appels = simulerPannes([statut]);
    const erreur = await piecesDuCourriel("INBOX", 7).catch((e) => e);
    expect(erreur.status).toBe(statut);
    expect(appels).toHaveLength(1);
  });

  it("ne réessaie JAMAIS un envoi : un doublon partirait", async () => {
    const appels = simulerPannes([503, 503]);
    const envoyer = await preparerEnvoyeur();
    const erreur = await envoyer({ to: ["a@exemple.example"], subject: "s", html: "h", text: "t" }).catch((e) => e);
    expect(erreur.status).toBe(503);
    expect(appels.filter((a) => a.url.endsWith("/send"))).toHaveLength(1);
  });
});

describe("piecesDuCourriel", () => {
  it("rend les pièces visibles du message", async () => {
    simuler({ attachments: [PIECE, { id: "p2", inline: true, contentType: "image/png" }] });
    expect(await piecesDuCourriel("INBOX", 7)).toEqual([{ id: "p1", nom: "lot.pdf", type: "application/pdf", taille: 3 }]);
  });
});

describe("octetsPiece", () => {
  it("rassemble les morceaux du flux", async () => {
    simuler({ attachments: [PIECE], corps: flux([Uint8Array.of(1, 2), Uint8Array.of(3)]) });
    expect(await octetsPiece("INBOX", 7, "p1", MO)).toEqual(Uint8Array.of(1, 2, 3));
  });

  it("une pièce qui n'appartient pas au message : null, sans rien télécharger", async () => {
    const appels = simuler({ attachments: [PIECE] });
    expect(await octetsPiece("INBOX", 7, "autre", MO)).toBeNull();
    expect(appels.some((u) => u.includes("/attachments/"))).toBe(false);
  });

  it("annoncée trop lourde : null, sans rien télécharger", async () => {
    const appels = simuler({ attachments: [{ ...PIECE, sizeBytes: 2 * MO }] });
    expect(await octetsPiece("INBOX", 7, "p1", MO)).toBeNull();
    expect(appels.some((u) => u.includes("/attachments/"))).toBe(false);
  });

  it("annoncée petite mais vraiment trop lourde : coupée dès que le maximum est dépassé", async () => {
    let annule = false;
    const morceaux = Array.from({ length: 50 }, () => new Uint8Array(100));
    simuler({
      attachments: [PIECE],
      corps: flux(morceaux, () => {
        annule = true;
      }),
    });
    expect(await octetsPiece("INBOX", 7, "p1", 250)).toBeNull();
    expect(annule).toBe(true);
    expect(morceaux.length).toBeGreaterThan(40);
  });

  it("connexion coupée en plein téléchargement : ErreurHostinger", async () => {
    simuler({
      attachments: [PIECE],
      corps: new ReadableStream({
        pull() {
          throw new Error("coupure");
        },
      }),
    });
    await expect(octetsPiece("INBOX", 7, "p1", MO)).rejects.toBeInstanceOf(ErreurHostinger);
  });
});
