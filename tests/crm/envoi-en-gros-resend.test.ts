import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * sendProspectBatch (lib/crm/email.ts) avec un client Resend SIMULÉ : aucune
 * requête réseau, aucune vraie clé. On vérifie les charges envoyées (un
 * destinataire par courriel, mêmes éléments que l'envoi manuel sauf la copie
 * cachée), le découpage par 100, l'arrêt sur erreur et sur quota.
 */

type Charge = Record<string, unknown> & { to: string[] };
type Reponse = { data: unknown; error: unknown } | "lancer" | null;

const etat = vi.hoisted(() => ({
  lots: [] as { charge: Charge[]; options: { idempotencyKey?: string } | undefined }[],
  unitaires: [] as Charge[],
  reponses: [] as Reponse[],
}));

vi.mock("resend", () => ({
  Resend: class {
    batch = {
      send: async (charge: Charge[], options?: { idempotencyKey?: string }) => {
        etat.lots.push({ charge, options });
        const r = etat.reponses.shift();
        if (r === "lancer") throw new Error("réseau coupé");
        if (r) return r;
        return { data: { data: charge.map((_, i) => ({ id: `id-${etat.lots.length}-${i}` })) }, error: null };
      },
    };
    emails = {
      send: async (charge: Charge) => {
        etat.unitaires.push(charge);
        return { data: { id: "unitaire" }, error: null };
      },
    };
  },
}));

import { motifErreurResend, sendProspectBatch, sendProspectEmail } from "@/lib/crm/email";

const ADMIN = "admin@technolot.ca";
const courriels = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    to: `dest${i}@exemple.ca`,
    subject: "Objet test",
    body: `Bonjour numéro ${i}, voici notre offre.`,
  }));

let journal: string[] = [];

beforeEach(() => {
  journal = [];
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    journal.push(args.map(String).join(" "));
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubEnv("RESEND_API_KEY", "re_test_factice");
  vi.stubEnv("FROM_EMAIL", "info@technolot.ca");
  vi.stubEnv("CONTACT_EMAIL", "info@technolot.ca");
  vi.stubEnv("SECURITE_RPC_SECRET", ""); // journal : sortie standard seulement
  etat.lots = [];
  etat.unitaires = [];
  etat.reponses = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("charges et découpage", () => {
  it("250 courriels → 3 requêtes de 100, 100 et 50 ; un seul destinataire par courriel, sans copie cachée", async () => {
    const bilan = await sendProspectBatch({ courriels: courriels(250), replyTo: ADMIN });
    expect(etat.lots.map((l) => l.charge.length)).toEqual([100, 100, 50]);
    expect(bilan.arret).toBeNull();
    expect(bilan.lotsEnvoyes).toBe(3);
    expect(bilan.envoyes).toHaveLength(250);
    expect(bilan.envoyes[0]).toEqual({ index: 0, to: "dest0@exemple.ca", id: "id-1-0" });
    expect(bilan.envoyes[249]).toEqual({ index: 249, to: "dest249@exemple.ca", id: "id-3-49" });

    const tous = etat.lots.flatMap((l) => l.charge);
    expect(tous.map((c) => c.to)).toEqual(courriels(250).map((c) => [c.to]));
    for (const c of tous) {
      expect(c.to).toHaveLength(1);
      // Resend compte chaque copie cachée comme un envoi : aucune dans l'envoi en gros.
      expect(c.bcc).toBeUndefined();
      expect(c.cc).toBeUndefined();
    }
  });

  it("chaque courriel : expéditeur, reply-to, signature, mention et en-tête de désabonnement", async () => {
    await sendProspectBatch({ courriels: courriels(1), replyTo: ADMIN });
    const [c] = etat.lots[0].charge;
    expect(c.from).toBe("Techno Lot <info@technolot.ca>");
    expect(c.replyTo).toEqual([ADMIN]);
    expect(c.subject).toBe("Objet test");
    expect(c.headers).toEqual({ "List-Unsubscribe": "<mailto:info@technolot.ca?subject=desabonner>" });
    expect(String(c.html)).toContain("Anthony Després");
    expect(String(c.html)).toContain("désabonner");
    expect(String(c.text)).toContain("Bonjour numéro 0, voici notre offre.");
    expect(String(c.text)).toContain("répondez « désabonner »");
    expect(c.attachments).toBeUndefined();
  });

  it("courriel du lot identique à celui de l'envoi manuel (sendProspectEmail), sans la copie cachée", async () => {
    const un = { to: "jean@exemple.ca", subject: "Bonjour Jean", body: "Bonjour Jean,\n\nVoici <notre> offre." };
    await sendProspectEmail({ ...un, replyTo: ADMIN });
    await sendProspectBatch({ courriels: [un], replyTo: ADMIN });
    const { bcc, ...unitaireSansCopie } = etat.unitaires[0];
    expect(bcc).toEqual(["info@technolot.ca"]);
    expect(etat.lots[0].charge[0]).toEqual(unitaireSansCopie);
  });

  it("envoi manuel : copie cachée par défaut, aucune avec copieCachee: false (test de l'envoi en gros)", async () => {
    const un = { to: "jean@exemple.ca", subject: "Bonjour", body: "Bonjour Jean." };
    await sendProspectEmail({ ...un, replyTo: ADMIN });
    await sendProspectEmail({ ...un, replyTo: ADMIN, copieCachee: false });
    expect(etat.unitaires[0].bcc).toEqual(["info@technolot.ca"]);
    expect(etat.unitaires[1].bcc).toBeUndefined();
    expect(etat.unitaires[1].to).toEqual(["jean@exemple.ca"]);
  });

  it("clé d'idempotence : la même pour le même lot, une autre pour un autre contenu", async () => {
    await sendProspectBatch({ courriels: courriels(3), replyTo: ADMIN });
    await sendProspectBatch({ courriels: courriels(3), replyTo: ADMIN });
    await sendProspectBatch({ courriels: courriels(4), replyTo: ADMIN });
    const [a, b, c] = etat.lots.map((l) => l.options?.idempotencyKey ?? "");
    expect(a).toMatch(/^envoi-en-gros\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{64}$/);
    expect(a.length).toBeLessThanOrEqual(256);
    expect(b).toBe(a);
    expect(c).not.toBe(a);
  });

  it("liste vide : aucun appel", async () => {
    const bilan = await sendProspectBatch({ courriels: [], replyTo: ADMIN });
    expect(etat.lots).toEqual([]);
    expect(bilan).toEqual({ envoyes: [], lotsEnvoyes: 0, arret: null });
  });
});

describe("arrêts", () => {
  it("erreur au 2e lot : arrêt, 3e lot jamais tenté, message générique avec référence", async () => {
    etat.reponses = [
      null,
      { data: null, error: { name: "validation_error", statusCode: 422, message: "Invalid `to` field: détail interne" } },
    ];
    const bilan = await sendProspectBatch({ courriels: courriels(250), replyTo: ADMIN, requestId: "req-1" });
    expect(etat.lots).toHaveLength(2);
    expect(bilan.envoyes).toHaveLength(100);
    expect(bilan.lotsEnvoyes).toBe(1);
    expect(bilan.arret?.motif).toBe("erreur");
    expect(bilan.arret?.message).toBe("L'envoi du lot a échoué. (réf. req-1)");
    expect(bilan.arret?.message).not.toMatch(/Invalid|détail interne/);
  });

  it("quota quotidien (429 daily_quota_exceeded) : arrêt propre, relancer demain avec la même liste", async () => {
    etat.reponses = [
      { data: null, error: { name: "daily_quota_exceeded", statusCode: 429, message: "You have reached your daily email sending quota." } },
    ];
    const bilan = await sendProspectBatch({ courriels: courriels(150), replyTo: ADMIN });
    expect(etat.lots).toHaveLength(1);
    expect(bilan.envoyes).toEqual([]);
    expect(bilan.arret?.motif).toBe("quota_quotidien");
    expect(bilan.arret?.message).toMatch(/Quota quotidien de Resend atteint/);
    expect(bilan.arret?.message).toMatch(/Relance demain avec la même liste/);
  });

  it("quota quotidien atteint au 2e lot : le 1er reste envoyé, rien après", async () => {
    etat.reponses = [null, { data: null, error: { name: "daily_quota_exceeded", statusCode: 429, message: "x" } }];
    const bilan = await sendProspectBatch({ courriels: courriels(300), replyTo: ADMIN });
    expect(etat.lots).toHaveLength(2);
    expect(bilan.envoyes).toHaveLength(100);
    expect(bilan.arret?.motif).toBe("quota_quotidien");
  });

  it("quota mensuel : motif distinct", async () => {
    etat.reponses = [{ data: null, error: { name: "monthly_quota_exceeded", statusCode: 429, message: "x" } }];
    const bilan = await sendProspectBatch({ courriels: courriels(2), replyTo: ADMIN });
    expect(bilan.arret?.motif).toBe("quota_mensuel");
    expect(bilan.arret?.message).toMatch(/Quota mensuel/);
  });

  it("limite de débit : un seul nouvel essai, avec la même clé d'idempotence", async () => {
    etat.reponses = [{ data: null, error: { name: "rate_limit_exceeded", statusCode: 429, message: "Too many requests" } }];
    const bilan = await sendProspectBatch({ courriels: courriels(5), replyTo: ADMIN, pauseDebitMs: 0 });
    expect(etat.lots).toHaveLength(2);
    expect(etat.lots[1].options?.idempotencyKey).toBe(etat.lots[0].options?.idempotencyKey);
    expect(bilan.arret).toBeNull();
    expect(bilan.envoyes).toHaveLength(5);
  });

  it("limite de débit deux fois : arrêt (motif débit)", async () => {
    const debit = { data: null, error: { name: "rate_limit_exceeded", statusCode: 429, message: "x" } };
    etat.reponses = [debit, debit];
    const bilan = await sendProspectBatch({ courriels: courriels(5), replyTo: ADMIN, pauseDebitMs: 0 });
    expect(etat.lots).toHaveLength(2);
    expect(bilan.arret?.motif).toBe("debit");
  });

  it("exception du client (réseau) : arrêt sur erreur", async () => {
    etat.reponses = ["lancer"];
    const bilan = await sendProspectBatch({ courriels: courriels(3), replyTo: ADMIN });
    expect(bilan.envoyes).toEqual([]);
    expect(bilan.arret?.motif).toBe("erreur");
  });

  it("sans RESEND_API_KEY : aucun appel, arrêt « configuration »", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const bilan = await sendProspectBatch({ courriels: courriels(3), replyTo: ADMIN });
    expect(etat.lots).toEqual([]);
    expect(bilan.arret?.motif).toBe("configuration");
  });

  it("le journal ne contient ni adresse, ni objet, ni corps", async () => {
    etat.reponses = [{ data: null, error: { name: "application_error", statusCode: 500, message: "Erreur interne" } }];
    await sendProspectBatch({ courriels: courriels(3), replyTo: ADMIN });
    const texte = journal.join("\n");
    expect(texte).toContain("crm.envoi_gros.resend");
    expect(texte).not.toMatch(/dest\d@exemple\.ca|Objet test|voici notre offre|admin@technolot/);
  });

  it("motif d'une erreur 429 sans type reconnu (repli sur le message)", () => {
    expect(motifErreurResend({ statusCode: 429, message: "daily quota reached" })).toBe("quota_quotidien");
    expect(motifErreurResend({ statusCode: 429, message: "monthly quota reached" })).toBe("quota_mensuel");
    expect(motifErreurResend({ statusCode: 429 })).toBe("debit");
    expect(motifErreurResend({ name: "validation_error" })).toBe("erreur");
    expect(motifErreurResend(null)).toBe("erreur");
  });
});
