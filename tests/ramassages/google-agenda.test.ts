import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { oublierJetons } from "@/lib/google/compte-service";
import {
  ErreurAgenda,
  agendaConfigure,
  creerEvenement,
  listerRamassages,
  modifierEvenement,
  supprimerEvenement,
} from "@/lib/ramassages/google-agenda";
import { evenementPourCreation, type ValeursRamassage } from "@/lib/ramassages/ramassages";

/*
 * Google Agenda (lib/ramassages/google-agenda.ts) : requêtes envoyées à l'API
 * (URL, paramètres, If-Match, corps) et traduction des refus. fetch simulé :
 * l'URL de jeton répond toujours, l'API des événements répond selon le test.
 */

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const CLE = Buffer.from(
  JSON.stringify({ type: "service_account", client_email: "agenda@projet.iam.gserviceaccount.com", private_key: privateKey }),
).toString("base64");
const AGENDA = "abc123@group.calendar.google.com";
const BASE = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(AGENDA)}/events`;
const UUID = "0b9e4c1a-1d2e-4f3a-8b5c-6d7e8f9a0b1c";

type Appel = { url: URL; init: RequestInit };
let appels: Appel[];
let reponses: Array<Response | Error>;
let jetonsDemandes: number;

function json(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json" } });
}

const evenement = (p: Record<string, unknown> = {}) => ({
  id: "evt1",
  etag: '"2"',
  status: "confirmed",
  summary: "Ramassage · Info Plus",
  start: { dateTime: "2026-11-05T09:00:00-05:00" },
  end: { dateTime: "2026-11-05T10:00:00-05:00" },
  ...p,
});

const valeurs: ValeursRamassage = {
  client: "Info Plus",
  adresse: "12 rue Principale, Laval",
  date: "2026-11-05",
  journee: false,
  debut: "09:00",
  fin: "10:00",
  notes: null,
  companyId: UUID,
  lotId: null,
};

beforeEach(() => {
  oublierJetons();
  appels = [];
  reponses = [];
  jetonsDemandes = 0;
  vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON", CLE);
  vi.stubEnv("GOOGLE_CALENDAR_ID", AGENDA);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (entree: string | URL, init: RequestInit = {}) => {
      const url = new URL(String(entree));
      if (url.hostname === "oauth2.googleapis.com") {
        jetonsDemandes++;
        return json(200, { access_token: "jeton-test", expires_in: 3599 });
      }
      appels.push({ url, init });
      const suivante = reponses.shift();
      if (!suivante) throw new Error("réponse non prévue");
      if (suivante instanceof Error) throw suivante;
      return suivante;
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("agendaConfigure", () => {
  it("vrai seulement avec une clé lisible et l'ID de l'agenda", () => {
    expect(agendaConfigure()).toBe(true);
    vi.stubEnv("GOOGLE_CALENDAR_ID", " ");
    expect(agendaConfigure()).toBe(false);
    vi.stubEnv("GOOGLE_CALENDAR_ID", AGENDA);
    vi.stubEnv("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON", "pas une clé");
    expect(agendaConfigure()).toBe(false);
  });
});

describe("listerRamassages", () => {
  it("demande les jours de Toronto, occurrences comprises, avec le jeton du compte de service", async () => {
    reponses.push(json(200, { items: [evenement(), evenement({ id: "supprime", status: "cancelled" })] }));
    const liste = await listerRamassages("2026-11-02", "2026-11-08");

    expect(liste.map((r) => r.id)).toEqual(["evt1"]);
    const { url, init } = appels[0];
    expect(`${url.origin}${url.pathname}`).toBe(BASE);
    expect(url.searchParams.get("timeMin")).toBe("2026-11-02T05:00:00.000Z");
    expect(url.searchParams.get("timeMax")).toBe("2026-11-09T05:00:00.000Z");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("orderBy")).toBe("startTime");
    expect(url.searchParams.get("timeZone")).toBe("America/Toronto");
    expect(url.searchParams.get("fields")).toMatch(/^items\(.*extendedProperties.*\),nextPageToken$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jeton-test");
    expect(init.method).toBe("GET");
  });

  it("semaine du changement d'heure : minuit à Toronto en heure avancée puis normale", async () => {
    reponses.push(json(200, { items: [] }));
    await listerRamassages("2026-10-26", "2026-11-01");
    expect(appels[0].url.searchParams.get("timeMin")).toBe("2026-10-26T04:00:00.000Z");
    expect(appels[0].url.searchParams.get("timeMax")).toBe("2026-11-02T05:00:00.000Z");
  });

  it("suit les pages et trie par jour puis par heure ; un seul jeton pour plusieurs lectures", async () => {
    reponses.push(
      json(200, {
        items: [evenement({ id: "tard", start: { dateTime: "2026-11-05T15:00:00-05:00" } })],
        nextPageToken: "p2",
      }),
      json(200, {
        items: [
          evenement({ id: "tot", start: { dateTime: "2026-11-05T08:00:00-05:00" } }),
          evenement({ id: "veille", start: { date: "2026-11-04" }, end: { date: "2026-11-05" } }),
        ],
      }),
      json(200, { items: [] }),
    );
    const liste = await listerRamassages("2026-11-02", "2026-11-08");
    expect(liste.map((r) => r.id)).toEqual(["veille", "tot", "tard"]);
    expect(appels[1].url.searchParams.get("pageToken")).toBe("p2");

    await listerRamassages("2026-11-09", "2026-11-15");
    expect(jetonsDemandes).toBe(1);
  });

  it("refus traduits en français ; le détail brut de Google reste pour le journal", async () => {
    const cas: Array<[Response | Error, RegExp, boolean]> = [
      [json(404, { error: { code: 404 } }), /Agenda introuvable \(404\)/, true],
      [json(403, { error: { errors: [{ reason: "forbidden" }] } }), /Accès à l’agenda refusé \(403\)/, true],
      [json(403, { error: { errors: [{ reason: "rateLimitExceeded" }] } }), /Trop de demandes/, false],
      [json(429, {}), /Trop de demandes/, false],
      [json(500, { error: { message: "brut" } }), /ne répond pas pour l’instant \(500\)/, true],
      [new TypeError("fetch failed"), /erreur réseau/, false],
      [new DOMException("délai", "TimeoutError"), /délai dépassé/, false],
    ];
    for (const [reponse, message, avecDetail] of cas) {
      reponses.push(reponse);
      const err = await listerRamassages("2026-11-02", "2026-11-08").catch((e: unknown) => e);
      expect(err, String(message)).toBeInstanceOf(Error);
      expect((err as Error).message).toMatch(message);
      expect((err as { detail?: unknown }).detail !== undefined, String(message)).toBe(avecDetail);
    }
  });

  it("401 : jeton oublié, le prochain appel en redemande un", async () => {
    reponses.push(json(401, { error: { code: 401 } }), json(200, { items: [] }));
    await expect(listerRamassages("2026-11-02", "2026-11-08")).rejects.toThrow(/Clé Google Agenda refusée \(401\)/);
    await listerRamassages("2026-11-02", "2026-11-08");
    expect(jetonsDemandes).toBe(2);
  });

  it("agenda non relié : aucune requête", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_ID", "");
    await expect(listerRamassages("2026-11-02", "2026-11-08")).rejects.toThrow("Google Agenda n’est pas encore relié.");
    expect(appels).toEqual([]);
    expect(jetonsDemandes).toBe(0);
  });
});

describe("creerEvenement / modifierEvenement / supprimerEvenement", () => {
  const lien = `https://www.technolot.ca/admin/crm/${UUID}`;

  it("création : POST du corps prévu, ramassage relu de la réponse", async () => {
    reponses.push(json(200, evenement({ id: "nouveau", location: valeurs.adresse })));
    const r = await creerEvenement(valeurs, lien);

    const { url, init } = appels[0];
    expect(init.method).toBe("POST");
    expect(`${url.origin}${url.pathname}`).toBe(BASE);
    expect(JSON.parse(String(init.body))).toEqual(evenementPourCreation(valeurs, lien));
    expect((init.headers as Record<string, string>)["If-Match"]).toBeUndefined();
    expect(r).toMatchObject({ id: "nouveau", adresse: valeurs.adresse, client: "Info Plus" });
  });

  it("modification : PATCH de l'événement avec If-Match ; dates effacées ou gardées", async () => {
    reponses.push(json(200, evenement()), json(200, evenement()));
    await modifierEvenement("evt1_20261105T140000Z", '"2"', valeurs, null, true);
    await modifierEvenement("evt1", '"3"', valeurs, null, false);

    expect(appels[0].init.method).toBe("PATCH");
    expect(appels[0].url.pathname).toBe(`${new URL(BASE).pathname}/evt1_20261105T140000Z`);
    expect((appels[0].init.headers as Record<string, string>)["If-Match"]).toBe('"2"');
    expect(JSON.parse(String(appels[0].init.body)).start).toEqual({
      dateTime: "2026-11-05T09:00:00",
      timeZone: "America/Toronto",
      date: null,
    });
    expect(JSON.parse(String(appels[1].init.body)).start).toBeUndefined();
  });

  it("modification refusée : changé dans Google (412, vérifié encore présent), sans détail au journal", async () => {
    reponses.push(json(412, { error: { code: 412 } }), json(200, { status: "confirmed" }));
    const change = await modifierEvenement("evt1", '"2"', valeurs, null, true).catch((e: unknown) => e);
    expect(change).toBeInstanceOf(ErreurAgenda);
    expect((change as ErreurAgenda).statut).toBe(412);
    expect((change as ErreurAgenda).message).toMatch(/modifié dans Google Agenda pendant que tu l’avais ouvert/);
    expect((change as ErreurAgenda).detail).toBeUndefined();
    // Vérification : simple lecture du statut de l'événement, sans If-Match
    expect(appels[1].init.method).toBe("GET");
    expect(appels[1].url.searchParams.get("fields")).toBe("status");
    expect((appels[1].init.headers as Record<string, string>)["If-Match"]).toBeUndefined();
  });

  it("modification d'un ramassage supprimé dans Google : 410, ou 412 puis statut « cancelled » → « n'existe plus »", async () => {
    reponses.push(json(410, {}), json(412, {}), json(200, { status: "cancelled" }), json(412, {}), json(404, {}));
    for (let i = 0; i < 3; i++) {
      await expect(modifierEvenement("evt1", '"2"', valeurs, null, true)).rejects.toThrow(
        "Ce ramassage n’existe plus dans Google Agenda : actualise la page.",
      );
    }
  });

  it("suppression : DELETE avec If-Match ; déjà supprimé = rien à faire", async () => {
    reponses.push(new Response(null, { status: 204 }), json(410, {}), json(404, {}), json(412, {}), json(200, { status: "cancelled" }));
    await expect(supprimerEvenement("evt1", '"2"')).resolves.toBeUndefined();
    expect(appels[0].init.method).toBe("DELETE");
    expect((appels[0].init.headers as Record<string, string>)["If-Match"]).toBe('"2"');
    await expect(supprimerEvenement("evt1", '"2"')).resolves.toBeUndefined();
    await expect(supprimerEvenement("evt1", '"2"')).resolves.toBeUndefined();
    // Supprimé dans Google avec une version périmée : 412, puis la vérification dit « cancelled »
    await expect(supprimerEvenement("evt1", '"2"')).resolves.toBeUndefined();
  });

  it("suppression refusée : changé entre-temps (encore présent), ou vérification impossible", async () => {
    reponses.push(json(412, {}), json(200, { status: "confirmed" }), json(412, {}), new TypeError("fetch failed"));
    await expect(supprimerEvenement("evt1", '"2"')).rejects.toBeInstanceOf(ErreurAgenda);
    const err = await supprimerEvenement("evt1", '"2"').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ErreurAgenda);
    expect((err as ErreurAgenda).statut).toBe(412);
  });
});
