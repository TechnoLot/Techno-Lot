import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Relances automatiques (app/api/admin/auto-relances) avec une base Supabase
 * et la Mail API de Hostinger SIMULÉES (aucun réseau, aucune vraie clé) :
 * relance 1 aux seuls contacts éligibles, depuis la boîte info@, une pause
 * entre deux envois, 50 au plus par passage ; arrêt du passage si Hostinger
 * limite ou refuse la clé ; réponse incertaine notée comme envoyée (jamais
 * renvoyée). Le refus sans Bearer est couvert par tests/securite/f3-routes-garde.
 */

type Ligne = Record<string, unknown>;
type Filtre = [op: "eq" | "in" | "pas_null" | "is", colonne: string, valeur: unknown];
type Reponse = { statut: number; corps?: unknown } | "lancer";

const etat = vi.hoisted(() => ({
  tables: {} as Record<string, Ligne[]>,
  insertions: [] as { table: string; donnees: Ligne }[],
  /** Destinataire de chaque POST /send, dans l'ordre. */
  envois: [] as string[],
  reponses: [] as Reponse[],
  attentes: [] as number[],
}));

vi.mock("@/lib/securite/garde", () => ({ bearerCronValide: () => true }));
vi.mock("@/lib/admin/cron", () => ({
  clientServiceCron: () => fauxSupabase(),
  refusCron: () => new Response(null, { status: 401 }),
  reponseServiceManquant: () => new Response(null, { status: 503 }),
}));
vi.mock("node:timers/promises", () => ({
  setTimeout: async (ms: number) => {
    etat.attentes.push(ms);
  },
}));

/** Mail API de Hostinger simulée : seul POST /send est attendu (boîte fixée par HOSTINGER_MAIL_MAILBOX_ID). */
async function fauxFetch(url: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  if (!String(url).endsWith("/api/v1/mailboxes/boite-test/send")) throw new Error(`requête inattendue : ${String(url)}`);
  etat.envois.push((JSON.parse(String(init.body)) as { to: string[] }).to[0]);
  const r = etat.reponses.shift();
  if (r === "lancer") throw new TypeError("fetch failed");
  if (r) return new Response(r.corps === undefined ? null : JSON.stringify(r.corps), { status: r.statut });
  return new Response(null, { status: 204 });
}

function fauxSupabase() {
  return {
    from(table: string) {
      let colonnes = "*";
      let unique = false;
      let insertion: Ligne | null = null;
      const filtres: Filtre[] = [];
      const executer = () => {
        if (insertion) {
          etat.insertions.push({ table, donnees: insertion });
          return { data: null, error: null };
        }
        let lignes = (etat.tables[table] ?? []).filter((l) =>
          filtres.every(([op, colonne, valeur]) => {
            const v = l[colonne] ?? null;
            if (op === "in") return (valeur as unknown[]).includes(v);
            if (op === "pas_null") return v !== null;
            return v === valeur;
          }),
        );
        if (table === "contacts" && colonnes.includes("companies(")) {
          lignes = lignes.map((l) => ({ ...l, companies: null }));
        }
        return { data: unique ? (lignes[0] ?? null) : lignes, error: null };
      };
      const requete = {
        select(c?: string) {
          colonnes = c ?? "*";
          return requete;
        },
        insert(d: Ligne) {
          insertion = d;
          return requete;
        },
        eq(c: string, v: unknown) {
          filtres.push(["eq", c, v]);
          return requete;
        },
        in(c: string, v: unknown[]) {
          filtres.push(["in", c, v]);
          return requete;
        },
        is(c: string, v: unknown) {
          filtres.push(["is", c, v]);
          return requete;
        },
        not(c: string) {
          filtres.push(["pas_null", c, null]);
          return requete;
        },
        order() {
          return requete;
        },
        limit() {
          return requete;
        },
        maybeSingle() {
          unique = true;
          return requete;
        },
        then<R1, R2>(ok?: (v: ReturnType<typeof executer>) => R1, ko?: (e: unknown) => R2) {
          return Promise.resolve().then(executer).then(ok, ko);
        },
      };
      return requete;
    },
  };
}

import { POST } from "@/app/api/admin/auto-relances/route";

const IL_Y_A = (jours: number) => new Date(Date.now() - jours * 86_400_000).toISOString();
const contact = (id: string, email: string, champs: Ligne = {}): Ligne => ({
  id,
  email,
  first_name: id,
  last_name: null,
  title: null,
  stage: "sequence_active",
  unsubscribed_at: null,
  company_id: null,
  ...champs,
});
const intro = (contactId: string, jours: number): Ligne => ({
  id: `intro-${contactId}`,
  contact_id: contactId,
  activity_type: "intro_email_sent",
  sequence_step: null,
  occurred_at: IL_Y_A(jours),
});

function donneesDeDepart() {
  etat.tables = {
    email_templates: [
      { id: "m-1", template_type: "followup_1", is_active: true, subject: "Suite pour {{compagnie}}", body: "Bonjour {{prenom}}, petite relance." },
    ],
    contacts: [
      contact("ana", "ana@exemple.ca"), // éligible
      contact("bob", "bob@exemple.ca"), // intro trop récent
      contact("cleo", "cleo@exemple.ca"), // relance 1 déjà faite
      contact("dan", "dan@exemple.ca"), // adresse désabonnée sur une autre fiche
      contact("dan-bis", "Dan@Exemple.ca", { stage: "contacted", unsubscribed_at: "2026-10-01T00:00:00Z" }),
      contact("eve", "eve@exemple.ca"), // éligible
    ],
    outreach_activities: [
      intro("ana", 10),
      intro("bob", 3),
      intro("cleo", 12),
      { id: "f1-cleo", contact_id: "cleo", activity_type: "followup_sent", sequence_step: 1, occurred_at: IL_Y_A(2) },
      intro("dan", 10),
      intro("eve", 9),
    ],
  };
}

const appeler = async () => {
  const res = await POST(new Request("http://localhost/api/admin/auto-relances", { method: "POST" }));
  return (await res.json()) as {
    checked: number;
    sent: number;
    skipped: number;
    errors: { contactId: string; ref: string }[];
    arret: string | null;
  };
};
const traces = () => etat.insertions.filter((i) => i.table === "outreach_activities").map((i) => i.donnees);

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("fetch", fauxFetch);
  vi.stubEnv("HOSTINGER_MAIL_API_TOKEN", "jeton-factice");
  vi.stubEnv("HOSTINGER_MAIL_MAILBOX_ID", "boite-test");
  vi.stubEnv("CONTACT_EMAIL", "info@technolot.ca");
  vi.stubEnv("SECURITE_RPC_SECRET", "");
  donneesDeDepart();
  etat.insertions = [];
  etat.envois = [];
  etat.reponses = [];
  etat.attentes = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Relances automatiques par la boîte info@", () => {
  it("relance 1 aux seuls contacts éligibles, une pause entre deux envois, trace « auto »", async () => {
    const r = await appeler();
    expect(r).toEqual({ checked: 5, sent: 2, skipped: 3, errors: [], arret: null });
    expect(etat.envois).toEqual(["ana@exemple.ca", "eve@exemple.ca"]);
    expect(etat.attentes).toEqual([1_000]);
    expect(traces()).toHaveLength(2);
    for (const t of traces()) {
      expect(t).toMatchObject({ activity_type: "followup_sent", sequence_step: 1, outcome: "auto", email_template_id: "m-1" });
    }
    expect(traces()[0]).toMatchObject({ contact_id: "ana", subject: "Suite pour votre entreprise" });
  });

  it("Hostinger limite (429) : passage arrêté, rien de noté, le reste au passage suivant", async () => {
    etat.reponses = [{ statut: 429, corps: { error: "Too Many Requests", code: "ERR_TOO_MANY_REQUESTS" } }];
    const r = await appeler();
    expect(r).toMatchObject({ sent: 0, arret: "debit" });
    expect(r.errors.map((e) => e.contactId)).toEqual(["ana"]);
    expect(etat.envois).toEqual(["ana@exemple.ca"]);
    expect(traces()).toEqual([]);
  });

  it("réponse incertaine : notée comme envoyée (jamais renvoyée), passage arrêté", async () => {
    etat.reponses = ["lancer"];
    const r = await appeler();
    expect(r).toMatchObject({ sent: 1, arret: "incertain" });
    expect(r.errors.map((e) => e.contactId)).toEqual(["ana"]);
    expect(etat.envois).toEqual(["ana@exemple.ca"]);
    expect(traces().map((t) => t.contact_id)).toEqual(["ana"]);
  });

  it("adresse refusée (422) : rien de noté pour elle, la suivante part quand même", async () => {
    etat.reponses = [{ statut: 422, corps: { error: "The given data was invalid.", code: "ERR_VALIDATION_FAILED" } }];
    const r = await appeler();
    expect(r).toMatchObject({ sent: 1, arret: null });
    expect(r.errors.map((e) => e.contactId)).toEqual(["ana"]);
    expect(etat.envois).toEqual(["ana@exemple.ca", "eve@exemple.ca"]);
    expect(traces().map((t) => t.contact_id)).toEqual(["eve"]);
  });

  it("50 relances au plus par passage : les autres attendent le suivant", async () => {
    for (let i = 0; i < 51; i++) {
      etat.tables.contacts.push(contact(`c${i}`, `c${i}@exemple.ca`));
      etat.tables.outreach_activities.push(intro(`c${i}`, 8));
    }
    const r = await appeler();
    expect(r).toMatchObject({ sent: 50, arret: "plafond", errors: [] });
    expect(etat.envois).toHaveLength(50);
    expect(traces()).toHaveLength(50);
  });
});
