import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * sendProspectBatch (lib/crm/email.ts) : envoi en gros par la boîte info@
 * (Mail API de Hostinger) avec un `fetch` SIMULÉ : aucune requête réseau,
 * aucune vraie clé. On vérifie les requêtes (un courriel par requête, un seul
 * destinataire chacun, même contenu que l'envoi manuel), la pause entre deux
 * envois, l'arrêt au premier échec et ses motifs (débit, clé, refus,
 * « incertain »). L'envoi manuel (sendProspectEmail, Resend) garde sa copie
 * cachée et son en-tête List-Unsubscribe.
 */

type Requete = { url: string; methode: string; entetes: Record<string, string>; corps: Record<string, unknown> | null };
type Reponse = { statut: number; corps?: unknown } | "lancer";

const etat = vi.hoisted(() => ({
  requetes: [] as Requete[],
  reponses: [] as Reponse[],
  /** Pauses demandées entre deux envois, en ms. */
  attentes: [] as number[],
  /** Courriels de l'envoi manuel (Resend, emails.send). */
  unitaires: [] as Record<string, unknown>[],
}));

vi.mock("node:timers/promises", () => ({
  setTimeout: async (ms: number) => {
    etat.attentes.push(ms);
  },
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (charge: Record<string, unknown>) => {
        etat.unitaires.push(charge);
        return { data: { id: "unitaire" }, error: null };
      },
    };
  },
}));

import { motifErreurHostinger, PAUSE_ENTRE_ENVOIS_MS, sendProspectBatch, sendProspectEmail } from "@/lib/crm/email";
import { ErreurHostinger } from "@/lib/hostinger/mail";

/** Mail API simulée : 204 par défaut, sinon la prochaine réponse prévue. */
async function fauxFetch(url: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  etat.requetes.push({
    url: String(url),
    methode: init.method ?? "GET",
    entetes: { ...(init.headers as Record<string, string>) },
    corps: typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null,
  });
  const r = etat.reponses.shift();
  if (r === "lancer") throw new TypeError("fetch failed");
  if (r) return new Response(r.corps === undefined ? null : JSON.stringify(r.corps), { status: r.statut });
  return new Response(null, { status: 204 });
}

const ADMIN = "admin@technolot.ca";
const ENVOI = "https://api.mail.hostinger.com/api/v1/mailboxes/boite-test/send";
const courriels = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    to: `dest${i}@exemple.ca`,
    subject: "Objet test",
    body: `Bonjour numéro ${i}, voici notre offre.`,
  }));
const indices = (bilan: Awaited<ReturnType<typeof sendProspectBatch>>) => bilan.envoyes.map((e) => e.index);

let journal: string[] = [];

beforeEach(() => {
  journal = [];
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    journal.push(args.map(String).join(" "));
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("fetch", fauxFetch);
  vi.stubEnv("HOSTINGER_MAIL_API_TOKEN", "jeton-factice");
  vi.stubEnv("HOSTINGER_MAIL_MAILBOX_ID", "boite-test");
  vi.stubEnv("RESEND_API_KEY", "re_test_factice");
  vi.stubEnv("FROM_EMAIL", "info@technolot.ca");
  vi.stubEnv("CONTACT_EMAIL", "info@technolot.ca");
  vi.stubEnv("SECURITE_RPC_SECRET", ""); // journal : sortie standard seulement
  etat.requetes = [];
  etat.reponses = [];
  etat.attentes = [];
  etat.unitaires = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("requêtes et contenu", () => {
  it("un courriel par requête à la boîte info@, un seul destinataire chacun, une pause entre deux", async () => {
    const bilan = await sendProspectBatch({ courriels: courriels(3) });
    expect(bilan).toEqual({
      envoyes: [
        { index: 0, to: "dest0@exemple.ca" },
        { index: 1, to: "dest1@exemple.ca" },
        { index: 2, to: "dest2@exemple.ca" },
      ],
      arret: null,
    });
    expect(etat.requetes.map((r) => `${r.methode} ${r.url}`)).toEqual(Array(3).fill(`POST ${ENVOI}`));
    expect(etat.requetes.map((r) => r.corps?.to)).toEqual([["dest0@exemple.ca"], ["dest1@exemple.ca"], ["dest2@exemple.ca"]]);
    expect(etat.requetes[0].entetes.Authorization).toBe("Bearer jeton-factice");
    expect(etat.requetes[0].entetes["Content-Type"]).toBe("application/json");
    expect(etat.attentes).toEqual([PAUSE_ENTRE_ENVOIS_MS, PAUSE_ENTRE_ENVOIS_MS]);
    // Ni copie, ni pièce jointe : aucun destinataire ne voit les autres.
    for (const r of etat.requetes) {
      expect(Object.keys(r.corps ?? {}).sort()).toEqual(["displayName", "html", "subject", "text", "to"]);
    }
  });

  it("même mise en page, signature et mention de désabonnement que l'envoi manuel (Resend)", async () => {
    const un = { to: "jean@exemple.ca", subject: "Bonjour Jean", body: "Bonjour Jean,\n\nVoici <notre> offre." };
    await sendProspectEmail({ ...un, replyTo: ADMIN });
    await sendProspectBatch({ courriels: [un] });

    const c = etat.requetes[0].corps ?? {};
    expect(c.displayName).toBe("Techno Lot");
    expect(c.subject).toBe("Bonjour Jean");
    expect(c.html).toBe(etat.unitaires[0].html);
    expect(c.text).toBe(etat.unitaires[0].text);
    expect(String(c.html)).toContain("Anthony Després");
    expect(String(c.html)).toContain("Voici &lt;notre&gt; offre.");
    expect(String(c.html)).toContain("désabonner");
    expect(String(c.text)).toContain("répondez « désabonner »");

    // L'envoi manuel garde sa copie cachée à la boîte générale et son en-tête de désabonnement.
    expect(etat.unitaires[0].bcc).toEqual(["info@technolot.ca"]);
    expect(etat.unitaires[0].replyTo).toEqual([ADMIN]);
    expect(etat.unitaires[0].headers).toEqual({ "List-Unsubscribe": "<mailto:info@technolot.ca?subject=desabonner>" });
  });

  it("modèle qui a déjà sa mention de désabonnement : pas de seconde mention", async () => {
    await sendProspectBatch({
      courriels: [{ to: "jean@exemple.ca", subject: "Bonjour", body: "Bonjour.\n\nPour vous désabonner, répondez STOP." }],
    });
    expect(String(etat.requetes[0].corps?.text)).not.toContain("Pour ne plus recevoir nos courriels");
  });

  it("liste vide : aucun appel", async () => {
    const bilan = await sendProspectBatch({ courriels: [] });
    expect(etat.requetes).toEqual([]);
    expect(bilan).toEqual({ envoyes: [], arret: null });
  });
});

describe("arrêts", () => {
  it("limite de débit (429) au 3e courriel : les 2 premiers partis, aucun nouvel essai, rien après", async () => {
    etat.reponses = [{ statut: 204 }, { statut: 204 }, { statut: 429, corps: { error: "Too Many Requests", code: "ERR_TOO_MANY_REQUESTS" } }];
    const bilan = await sendProspectBatch({ courriels: courriels(5) });
    expect(etat.requetes).toHaveLength(3);
    expect(indices(bilan)).toEqual([0, 1]);
    expect(bilan.arret?.motif).toBe("debit");
    expect(bilan.arret?.message).toMatch(/Hostinger limite le nombre d'envois/);
  });

  it("clé refusée (401) : arrêt « configuration », aucun courriel parti", async () => {
    etat.reponses = [{ statut: 401, corps: { error: "Missing or invalid credentials.", code: "ERR_UNAUTHORIZED" } }];
    const bilan = await sendProspectBatch({ courriels: courriels(3), requestId: "req-1" });
    expect(etat.requetes).toHaveLength(1);
    expect(bilan.envoyes).toEqual([]);
    expect(bilan.arret?.motif).toBe("configuration");
    expect(bilan.arret?.ref).toBe("req-1");
    expect(bilan.arret?.message).toMatch(/clé de la Mail API de Hostinger absente ou refusée.*\(réf\. req-1\)$/);
  });

  it("courriel refusé (422) : arrêt sur erreur, message générique avec référence, sans le détail de Hostinger", async () => {
    etat.reponses = [
      { statut: 422, corps: { error: "The given data was invalid.", code: "ERR_VALIDATION_FAILED", params: { to: ["détail interne"] } } },
    ];
    const bilan = await sendProspectBatch({ courriels: courriels(2), requestId: "req-2" });
    expect(etat.requetes).toHaveLength(1);
    expect(bilan.envoyes).toEqual([]);
    expect(bilan.arret?.motif).toBe("erreur");
    expect(bilan.arret?.message).toBe(
      "L'envoi par Hostinger a échoué : l'envoi s'est arrêté. Réessaie dans quelques minutes ; les adresses déjà servies seront exclues. (réf. req-2)",
    );
  });

  it("pas de réponse (réseau, délai) : « incertain », ce courriel compte comme envoyé, rien après", async () => {
    etat.reponses = [{ statut: 204 }, "lancer"];
    const bilan = await sendProspectBatch({ courriels: courriels(4) });
    expect(etat.requetes).toHaveLength(2);
    expect(indices(bilan)).toEqual([0, 1]);
    expect(bilan.arret?.motif).toBe("incertain");
    expect(bilan.arret?.message).toMatch(/peut-être parti \(regarde dans Envoyés\)/);
  });

  it("erreur 5xx de Hostinger : « incertain » aussi", async () => {
    etat.reponses = [{ statut: 504, corps: { error: "Upstream service timed out.", code: "ERR_GATEWAY_TIMEOUT" } }];
    const bilan = await sendProspectBatch({ courriels: courriels(2) });
    expect(indices(bilan)).toEqual([0]);
    expect(bilan.arret?.motif).toBe("incertain");
  });

  it("boîte introuvable avant tout envoi (Hostinger injoignable) : rien n'est parti, jamais « incertain »", async () => {
    vi.stubEnv("HOSTINGER_MAIL_MAILBOX_ID", "");
    etat.reponses = ["lancer"]; // GET /api/v1/me
    const bilan = await sendProspectBatch({ courriels: courriels(2) });
    expect(etat.requetes.map((r) => `${r.methode} ${r.url}`)).toEqual(["GET https://api.mail.hostinger.com/api/v1/me"]);
    expect(bilan.envoyes).toEqual([]);
    expect(bilan.arret?.motif).toBe("erreur");
  });

  it("la clé ne donne pas accès à info@ : arrêt « configuration », aucun envoi", async () => {
    vi.stubEnv("HOSTINGER_MAIL_MAILBOX_ID", "");
    etat.reponses = [{ statut: 200, corps: { data: { mailboxes: [{ resourceId: "autre", address: "autre@technolot.ca" }] } } }];
    const bilan = await sendProspectBatch({ courriels: courriels(2) });
    expect(etat.requetes).toHaveLength(1);
    expect(bilan.envoyes).toEqual([]);
    expect(bilan.arret?.motif).toBe("configuration");
  });

  it("sans HOSTINGER_MAIL_API_TOKEN : aucun appel, arrêt « configuration »", async () => {
    vi.stubEnv("HOSTINGER_MAIL_API_TOKEN", "");
    const bilan = await sendProspectBatch({ courriels: courriels(3) });
    expect(etat.requetes).toEqual([]);
    expect(bilan.arret?.motif).toBe("configuration");
  });

  it("le journal ne contient ni adresse, ni objet, ni corps, ni la clé", async () => {
    etat.reponses = [{ statut: 500, corps: { error: "Internal server error.", code: "ERR_INTERNAL_SERVER_ERROR" } }];
    await sendProspectBatch({ courriels: courriels(3) });
    const texte = journal.join("\n");
    expect(texte).toContain("crm.envoi_gros.hostinger");
    expect(texte).not.toMatch(/dest\d@exemple\.ca|Objet test|voici notre offre|jeton-factice/);
  });

  it("motif de chaque erreur", () => {
    expect(motifErreurHostinger(new ErreurHostinger(429))).toBe("debit");
    expect(motifErreurHostinger(new ErreurHostinger(401))).toBe("configuration");
    expect(motifErreurHostinger(new ErreurHostinger(403))).toBe("configuration");
    expect(motifErreurHostinger(new ErreurHostinger(404))).toBe("configuration");
    expect(motifErreurHostinger(new ErreurHostinger(422))).toBe("erreur");
    expect(motifErreurHostinger(new ErreurHostinger(null))).toBe("incertain");
    expect(motifErreurHostinger(new ErreurHostinger(502))).toBe("incertain");
    // Avant toute requête d'envoi, rien n'a pu partir.
    expect(motifErreurHostinger(new ErreurHostinger(null), true)).toBe("erreur");
    expect(motifErreurHostinger(new ErreurHostinger(500), true)).toBe("erreur");
    expect(motifErreurHostinger(new Error("bogue"))).toBe("erreur");
    expect(motifErreurHostinger(null)).toBe("erreur");
  });
});
