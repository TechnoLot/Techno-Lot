import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Actions de l'envoi en gros (lib/crm/envoi-en-gros-actions.ts) avec une base
 * Supabase et un client Resend SIMULÉS (aucun réseau, aucune vraie clé) :
 *  - « Vérifier la liste » ne fait aucune écriture et aucun envoi ;
 *  - l'envoi exige la case cochée et le nombre exact, revalide côté serveur
 *    (désabonnés, déjà reçu cet objet), crée les fiches inconnues, trace
 *    chaque envoi (manual_note / envoi_en_gros) et ne fait avancer que
 *    l'étape `new` ;
 *  - arrêt propre sur quota, lots de 100, verrou contre le double envoi ;
 *  - « M'envoyer un test » : à l'admin seulement, sans copie cachée ni écriture.
 * Le refus sans session est couvert par tests/securite/f8-exhaustivite-admin.
 */

type Ligne = Record<string, unknown>;
type Filtre = [op: "eq" | "in" | "pas_null" | "is" | "gte", colonne: string, valeur: unknown];
type Ecriture = { table: string; op: "insert" | "update"; donnees: unknown; filtres: Filtre[] };
type ReponseResend = { data: unknown; error: unknown } | null;

const etat = vi.hoisted(() => ({
  ctx: null as unknown,
  tables: {} as Record<string, Ligne[]>,
  ecritures: [] as Ecriture[],
  envois: [] as { to: string[]; subject: string; text: string }[][],
  /** Envois unitaires (emails.send : courriel test). */
  unitaires: [] as (Record<string, unknown> & { to: string[]; subject: string; text: string })[],
  reponsesResend: [] as ReponseResend[],
  /** Promesse à attendre dans batch.send (simule un lot lent). */
  retenue: null as Promise<void> | null,
  limitePermise: true,
  compteur: 0,
  /** Avis du formulaire de soumission reçus aujourd'hui (fonction admin_soumissions). */
  soumissionsDuJour: 0,
}));

vi.mock("@/lib/securite/garde", () => ({ adminPourAction: async () => etat.ctx }));
vi.mock("@/lib/securite/limite", () => ({
  limiterSelon: async () => (etat.limitePermise ? { permis: true, attente: 0 } : { permis: false, attente: 120 }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("resend", () => ({
  Resend: class {
    batch = {
      send: async (charge: { to: string[]; subject: string; text: string }[]) => {
        if (etat.retenue) await etat.retenue;
        etat.envois.push(charge);
        const r = etat.reponsesResend.shift();
        if (r) return r;
        return { data: { data: charge.map((_, i) => ({ id: `envoi-${i}` })) }, error: null };
      },
    };
    emails = {
      send: async (charge: Record<string, unknown> & { to: string[]; subject: string; text: string }) => {
        etat.unitaires.push(charge);
        return { data: { id: "x" }, error: null };
      },
    };
  },
}));

import { envoyerLotEnGros, envoyerTestEnGros, verifierEnvoiEnGros } from "@/lib/crm/envoi-en-gros-actions";

// --- Base simulée ---------------------------------------------------------------------

function filtrer(lignes: Ligne[], filtres: Filtre[]): Ligne[] {
  return lignes.filter((l) =>
    filtres.every(([op, colonne, valeur]) => {
      const v = l[colonne] ?? null;
      if (op === "eq") return v === valeur;
      if (op === "in") return (valeur as unknown[]).includes(v);
      if (op === "pas_null") return v !== null;
      if (op === "gte") return v !== null && String(v) >= String(valeur);
      return v === valeur;
    }),
  );
}

function fauxSupabase() {
  return {
    rpc(nom: string) {
      const data =
        nom === "admin_soumissions" ? Array.from({ length: etat.soumissionsDuJour }, (_, i) => ({ id: `s-${i}` })) : [];
      return Promise.resolve({ data, error: null });
    },
    from(table: string) {
      let op: "select" | "insert" | "update" = "select";
      let donnees: unknown;
      let colonnes = "*";
      let plage: [number, number] | null = null;
      let unique = false;
      let compter = false;
      let tete = false;
      const filtres: Filtre[] = [];

      const executer = () => {
        const lignesTable = (etat.tables[table] ??= []);
        if (op === "insert") {
          etat.ecritures.push({ table, op, donnees, filtres: [...filtres] });
          // created_at : défaut de la base (now()).
          const nouvelles = (Array.isArray(donnees) ? donnees : [donnees]).map((l) => ({
            id: `${table}-${++etat.compteur}`,
            created_at: new Date().toISOString(),
            ...(l as Ligne),
          }));
          lignesTable.push(...nouvelles);
          return { data: unique ? (nouvelles[0] ?? null) : nouvelles, error: null };
        }
        if (op === "update") {
          etat.ecritures.push({ table, op, donnees, filtres: [...filtres] });
          const visees = filtrer(lignesTable, filtres);
          for (const l of visees) Object.assign(l, donnees as Ligne);
          return { data: visees, error: null };
        }
        let lignes = filtrer(lignesTable, filtres);
        if (compter) return { data: tete ? null : lignes, count: lignes.length, error: null };
        if (plage) lignes = lignes.slice(plage[0], plage[1] + 1);
        if (table === "contacts" && colonnes.includes("companies(")) {
          lignes = lignes.map((l) => ({
            ...l,
            companies: l.company_id
              ? { name: (etat.tables.companies ?? []).find((c) => c.id === l.company_id)?.name ?? null }
              : null,
          }));
        }
        return { data: unique ? (lignes[0] ?? null) : lignes, error: null };
      };

      const requete = {
        select(c?: string, options?: { count?: string; head?: boolean }) {
          colonnes = c ?? "*";
          compter = options?.count === "exact";
          tete = options?.head === true;
          return requete;
        },
        gte(c: string, v: unknown) {
          filtres.push(["gte", c, v]);
          return requete;
        },
        insert(d: unknown) {
          op = "insert";
          donnees = d;
          return requete;
        },
        update(d: unknown) {
          op = "update";
          donnees = d;
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
        not(c: string) {
          filtres.push(["pas_null", c, null]);
          return requete;
        },
        is(c: string, v: unknown) {
          filtres.push(["is", c, v]);
          return requete;
        },
        order() {
          return requete;
        },
        limit() {
          return requete;
        },
        range(de: number, a: number) {
          plage = [de, a];
          return requete;
        },
        single() {
          unique = true;
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

// --- Jeu de données ---------------------------------------------------------------------

const OBJET = "Offre Techno Lot";
const CORPS = "Bonjour {{prenom}} de {{compagnie}},\nVoici notre offre.";
const LISTE = [
  "Courriel;Prénom;Compagnie",
  "jean@exemple.ca;;", // fiche existante (casse différente), étape call_done
  "desabo@exemple.ca;Dé;", // désabonné
  "deja@exemple.ca;Déjà;", // a déjà reçu cet objet par l'envoi en gros
  "nina@exemple.ca;Nina;", // fiche existante à l'étape new
  "ivan@exemple.ca;Ivan;ACME INC.", // inconnu, compagnie existante (casse ignorée)
  "ana@exemple.ca;Ana;Nouvelle Cie", // inconnue, compagnie à créer
].join("\n");

function donneesDeDepart() {
  etat.tables = {
    companies: [{ id: "co-1", name: "Acme inc.", created_at: "2026-01-01T00:00:00Z" }],
    contacts: [
      { id: "c-jean", email: "Jean@Exemple.ca", first_name: "Jean", last_name: "Tremblay", title: "DG", stage: "call_done", company_id: "co-1", unsubscribed_at: null },
      { id: "c-desabo", email: "desabo@exemple.ca", first_name: null, last_name: null, title: null, stage: "contacted", company_id: null, unsubscribed_at: "2026-10-01T00:00:00Z" },
      { id: "c-deja", email: "deja@exemple.ca", first_name: null, last_name: null, title: null, stage: "new", company_id: null, unsubscribed_at: null },
      { id: "c-nina", email: "nina@exemple.ca", first_name: "Nina", last_name: null, title: null, stage: "new", company_id: null, unsubscribed_at: null },
    ],
    outreach_activities: [
      { id: "a-1", contact_id: "c-deja", activity_type: "manual_note", outcome: "envoi_en_gros", subject: "offre  techno LOT" },
    ],
  };
}

const ADMIN = { id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", email: "info@technolot.ca" };
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
  vi.stubEnv("SECURITE_RPC_SECRET", "");
  donneesDeDepart();
  etat.ecritures = [];
  etat.envois = [];
  etat.unitaires = [];
  etat.reponsesResend = [];
  etat.retenue = null;
  etat.limitePermise = true;
  etat.soumissionsDuJour = 0;
  etat.ctx = { supabase: fauxSupabase(), user: ADMIN, requestId: "req-test" };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const destinatairesEnvoyes = () => etat.envois.flat().map((c) => c.to[0]);
const ecrituresDe = (table: string) => etat.ecritures.filter((e) => e.table === table);

describe("Vérifier la liste (lecture seule)", () => {
  it("prêts, exclus, fiches à créer, lots et aperçu ; aucune écriture, aucun envoi", async () => {
    const r = await verifierEnvoiEnGros({ destinataires: LISTE, objet: OBJET, corps: CORPS });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r).toMatchObject({
      valides: 6,
      invalides: 0,
      doublons: 0,
      prets: 4,
      desabonnes: { nombre: 1, exemples: ["desabo@exemple.ca"] },
      dejaRecus: { nombre: 1, exemples: ["deja@exemple.ca"] },
      nouvellesFiches: 2,
      lots: 1,
    });
    expect(r.apercu?.a).toBe("jean@exemple.ca");
    expect(r.apercu?.objet).toBe(OBJET);
    // Prénom et compagnie absents de la liste : ceux de la fiche du CRM.
    expect(r.apercu?.texte.startsWith("Bonjour Jean de Acme inc.,\nVoici notre offre.")).toBe(true);
    expect(r.apercu?.texte).toContain("désabonner");
    expect(etat.ecritures).toEqual([]);
    expect(etat.envois).toEqual([]);
  });

  it("liste de plus de 500 adresses : refus clair avant toute lecture", async () => {
    const grosse = Array.from({ length: 501 }, (_, i) => `c${i}@exemple.ca`).join("\n");
    const r = await verifierEnvoiEnGros({ destinataires: grosse, objet: OBJET, corps: CORPS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/500 au plus par envoi/);
  });

  it("validation stricte : objet vide ou trop long, champ en trop", async () => {
    const vide = await verifierEnvoiEnGros({ destinataires: LISTE, objet: "  ", corps: CORPS });
    expect(vide.ok).toBe(false);
    const long = await verifierEnvoiEnGros({ destinataires: LISTE, objet: "x".repeat(201), corps: CORPS });
    expect(long.ok).toBe(false);
    const enTrop = await verifierEnvoiEnGros({ destinataires: LISTE, objet: OBJET, corps: CORPS, role: "admin" } as never);
    expect(enTrop.ok).toBe(false);
    expect(etat.ecritures).toEqual([]);
  });

  it("limite de débit atteinte : refus", async () => {
    etat.limitePermise = false;
    const r = await verifierEnvoiEnGros({ destinataires: LISTE, objet: OBJET, corps: CORPS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Réessaie dans 2 minutes/);
  });
});

describe("Envoi d'un lot", () => {
  const entree = (champs: Partial<Parameters<typeof envoyerLotEnGros>[0]> = {}) => ({
    destinataires: LISTE,
    objet: OBJET,
    corps: CORPS,
    confirme: true,
    nombre: 4,
    dejaEnvoyes: 0,
    ...champs,
  });

  it("refusé sans la case de confirmation : aucun envoi, aucune écriture", async () => {
    const r = await envoyerLotEnGros(entree({ confirme: false }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Coche la case de confirmation/);
    expect(etat.envois).toEqual([]);
    expect(etat.ecritures).toEqual([]);
  });

  it("refusé si le nombre saisi ne correspond pas au nombre calculé par le serveur", async () => {
    const r = await envoyerLotEnGros(entree({ nombre: 5 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/ne correspond plus à la liste \(4 destinataires\)/);
    expect(etat.envois).toEqual([]);
    expect(etat.ecritures).toEqual([]);
  });

  it("envoie aux seuls prêts, crée les fiches, trace chaque envoi, n'avance que l'étape new", async () => {
    const r = await envoyerLotEnGros(entree());
    expect(r).toEqual({ ok: true, envoyes: 4, echecs: 0, restants: 0, termine: true, arret: null });

    // Revalidation serveur : ni le désabonné, ni celui qui a déjà reçu l'objet.
    expect(etat.envois).toHaveLength(1);
    expect(destinatairesEnvoyes()).toEqual(["jean@exemple.ca", "nina@exemple.ca", "ivan@exemple.ca", "ana@exemple.ca"]);
    expect(etat.envois[0][2].text.startsWith("Bonjour Ivan de ACME INC.,")).toBe(true);

    // Compagnie : « ACME INC. » réutilise « Acme inc. » ; « Nouvelle Cie » est créée (forme de createCompany).
    const compagnies = ecrituresDe("companies");
    expect(compagnies).toHaveLength(1);
    expect(compagnies[0].donnees).toEqual([
      {
        name: "Nouvelle Cie",
        domain: null,
        industry: null,
        region: null,
        employee_count: null,
        main_phone: null,
        fit_score: null,
        street_address: null,
        notes: null,
        research_status: "found",
      },
    ]);
    const nouvelleCie = etat.tables.companies.find((c) => c.name === "Nouvelle Cie");

    // Fiches créées pour les adresses inconnues seulement.
    const fiches = ecrituresDe("contacts").filter((e) => e.op === "insert");
    expect(fiches).toHaveLength(1);
    expect(fiches[0].donnees).toEqual([
      { company_id: "co-1", first_name: "Ivan", last_name: null, title: null, email: "ivan@exemple.ca", stage: "new" },
      { company_id: nouvelleCie?.id, first_name: "Ana", last_name: null, title: null, email: "ana@exemple.ca", stage: "new" },
    ]);

    // Trace : manual_note / envoi_en_gros, contact_id obligatoire, jamais intro_email_sent.
    const traces = ecrituresDe("outreach_activities");
    expect(traces).toHaveLength(1);
    const lignes = traces[0].donnees as Ligne[];
    expect(lignes).toHaveLength(4);
    for (const l of lignes) {
      expect(l).toMatchObject({ activity_type: "manual_note", outcome: "envoi_en_gros", subject: OBJET });
      expect(typeof l.contact_id).toBe("string");
      expect(String(l.body_preview).length).toBeLessThanOrEqual(300);
    }
    expect(lignes.map((l) => l.contact_id).slice(0, 2)).toEqual(["c-jean", "c-nina"]);

    // Étape : new → contacted seulement ; call_done intact ; jamais sequence_active.
    const etapes = ecrituresDe("contacts").filter((e) => e.op === "update");
    expect(etapes).toHaveLength(1);
    expect(etapes[0].donnees).toMatchObject({ stage: "contacted" });
    expect(etapes[0].filtres).toContainEqual(["eq", "stage", "new"]);
    const etape = (id: string) => etat.tables.contacts.find((c) => c.id === id)?.stage;
    expect(etape("c-jean")).toBe("call_done");
    expect(etape("c-nina")).toBe("contacted");
    expect(etape("c-deja")).toBe("new");
    expect(etape("c-desabo")).toBe("contacted");
    expect(etat.tables.contacts.filter((c) => c.email === "ivan@exemple.ca" || c.email === "ana@exemple.ca").map((c) => c.stage)).toEqual([
      "contacted",
      "contacted",
    ]);

    // Tables interdites jamais touchées ; aucun type suivi par les relances automatiques.
    expect(etat.ecritures.map((e) => e.table).filter((t) => ["lots", "soumissions", "email_logs", "sales"].includes(t))).toEqual([]);
    expect(JSON.stringify(etat.ecritures)).not.toMatch(/intro_email_sent|followup_sent|sequence_active/);

    // Journal : compteurs seulement (journaliserAction écrit après la réponse).
    await new Promise((r) => setTimeout(r, 10));
    const texte = journal.join("\n");
    expect(texte).toContain("crm.envoi_en_gros_lot");
    expect(texte).not.toMatch(/@exemple\.ca|Offre Techno Lot|Voici notre offre/);
  });

  it("même liste relancée : les adresses servies sont exclues, rien n'est renvoyé", async () => {
    await envoyerLotEnGros(entree());
    etat.envois = [];
    const relance = await envoyerLotEnGros(entree({ dejaEnvoyes: 4 }));
    expect(relance).toEqual({ ok: true, envoyes: 0, echecs: 0, restants: 0, termine: true, arret: null });
    expect(etat.envois).toEqual([]);

    const verif = await verifierEnvoiEnGros({ destinataires: LISTE, objet: OBJET, corps: CORPS });
    expect(verif.ok && verif.prets).toBe(0);
    expect(verif.ok && verif.dejaRecus.nombre).toBe(5);
  });

  it("quota quotidien atteint : arrêt propre, aucune trace, message pour relancer demain", async () => {
    etat.reponsesResend = [{ data: null, error: { name: "daily_quota_exceeded", statusCode: 429, message: "quota" } }];
    const r = await envoyerLotEnGros(entree());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r).toMatchObject({ envoyes: 0, echecs: 4, restants: 4, termine: false });
    expect(r.arret?.motif).toBe("quota_quotidien");
    expect(r.arret?.message).toMatch(/Relance demain avec la même liste/);
    expect(ecrituresDe("outreach_activities")).toEqual([]);
    expect(etat.tables.contacts.find((c) => c.id === "c-nina")?.stage).toBe("new");
  });

  it("service de courriel non configuré : arrêt avant toute écriture", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const r = await envoyerLotEnGros(entree());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r).toMatchObject({ envoyes: 0, echecs: 4, termine: false });
    expect(r.arret?.motif).toBe("configuration");
    expect(etat.ecritures).toEqual([]);
    expect(etat.envois).toEqual([]);
  });

  it("150 adresses, 80 permises par jour : 80 aujourd'hui, arrêt « réserve », les 70 autres le lendemain", async () => {
    // Jour fixe (midi UTC) : jamais de passage de minuit pendant le test.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-02T15:00:00Z"));
    const liste = Array.from({ length: 150 }, (_, i) => `contact${i}@exemple.ca`).join("\n");

    const verif = await verifierEnvoiEnGros({ destinataires: liste, objet: OBJET, corps: CORPS });
    expect(verif.ok && verif.prets).toBe(150);
    expect(verif.ok && verif.aujourdhui).toBe(80);
    expect(verif.ok && verif.lots).toBe(1);

    // Seule la part du jour (80, pas 150) est acceptée à la confirmation.
    const refus = await envoyerLotEnGros(entree({ destinataires: liste, nombre: 150 }));
    expect(refus.ok).toBe(false);
    expect(etat.envois).toEqual([]);

    const premier = await envoyerLotEnGros(entree({ destinataires: liste, nombre: 80 }));
    expect(premier).toMatchObject({ ok: true, envoyes: 80, restants: 0, termine: true });
    expect(premier.ok && premier.arret?.motif).toBe("reserve");
    expect(premier.ok && premier.arret?.message).toMatch(/Relance la même liste demain/);
    expect(etat.envois[0]).toHaveLength(80);

    // Même jour : la part de l'envoi en gros est épuisée, la réserve de 20 reste.
    const memeJour = await verifierEnvoiEnGros({ destinataires: liste, objet: OBJET, corps: CORPS });
    expect(memeJour.ok && memeJour.quota).toEqual({ utilises: 80, disponibles: 0, quota: 100, reserve: 20 });
    expect(memeJour.ok && memeJour.aujourdhui).toBe(0);

    // Lendemain (minuit UTC passé) : les 70 autres, sans renvoyer les 80 premiers.
    vi.setSystemTime(new Date("2026-11-03T15:00:00Z"));
    const lendemain = await verifierEnvoiEnGros({ destinataires: liste, objet: OBJET, corps: CORPS });
    expect(lendemain.ok && lendemain.prets).toBe(70);
    expect(lendemain.ok && lendemain.aujourdhui).toBe(70);
    const second = await envoyerLotEnGros(entree({ destinataires: liste, nombre: 70 }));
    expect(second).toMatchObject({ ok: true, envoyes: 70, restants: 0, termine: true, arret: null });
    expect(new Set(destinatairesEnvoyes()).size).toBe(150);
  });

  it("verrou : un second lot lancé pendant le premier est refusé", async () => {
    let liberer: () => void = () => {};
    etat.retenue = new Promise<void>((r) => {
      liberer = r;
    });
    const premier = envoyerLotEnGros(entree());
    // Laisse le premier atteindre l'envoi (lectures simulées, puis batch.send retenu).
    await new Promise((r) => setTimeout(r, 20));
    const second = await envoyerLotEnGros(entree());
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/déjà en cours/);
    liberer();
    expect((await premier).ok).toBe(true);
    expect(etat.envois).toHaveLength(1);
  });
});

describe("Quota du jour (forfait gratuit de Resend)", () => {
  const champs = { destinataires: LISTE, objet: OBJET, corps: CORPS };
  /** Courriels du CRM envoyés aujourd'hui : deux envois chacun (copie cachée). */
  const courrielsCrmDuJour = (n: number) => {
    const maintenant = new Date().toISOString();
    for (let i = 0; i < n; i++) {
      etat.tables.outreach_activities.push({
        id: `crm-${i}`,
        contact_id: "c-nina",
        activity_type: i % 2 ? "followup_sent" : "intro_email_sent",
        created_at: maintenant,
      });
    }
  };

  it("compte l'envoi en gros, les courriels du CRM (deux chacun) et les soumissions du jour ; réserve de 20", async () => {
    courrielsCrmDuJour(30); // 60
    etat.soumissionsDuJour = 5; // 5
    const r = await verifierEnvoiEnGros(champs);
    expect(r.ok && r.quota).toEqual({ utilises: 65, disponibles: 15, quota: 100, reserve: 20 });
    expect(r.ok && r.aujourdhui).toBe(4);
  });

  it("2 envois permis pour 4 prêts : seuls les 2 premiers partent, arrêt « réserve »", async () => {
    courrielsCrmDuJour(39); // 78 → 2 permis
    const r = await verifierEnvoiEnGros(champs);
    expect(r.ok && r.aujourdhui).toBe(2);

    const lot = await envoyerLotEnGros({ ...champs, confirme: true, nombre: 2, dejaEnvoyes: 0 });
    expect(lot).toMatchObject({ ok: true, envoyes: 2, restants: 0, termine: true });
    expect(lot.ok && lot.arret?.motif).toBe("reserve");
    expect(destinatairesEnvoyes()).toEqual(["jean@exemple.ca", "nina@exemple.ca"]);
  });

  it("part du jour épuisée : rien n'est envoyé, le test est refusé", async () => {
    courrielsCrmDuJour(40); // 80 → plus rien de permis
    const r = await verifierEnvoiEnGros(champs);
    expect(r.ok && r.aujourdhui).toBe(0);

    const test = await envoyerTestEnGros(champs);
    expect(test.ok).toBe(false);
    if (!test.ok) expect(test.error).toMatch(/test impossible avant demain/);
    expect(etat.unitaires).toEqual([]);
    expect(etat.envois).toEqual([]);
  });

  it("envois d'avant minuit UTC : pas comptés", async () => {
    etat.tables.outreach_activities.push({
      id: "ancien",
      contact_id: "c-nina",
      activity_type: "intro_email_sent",
      created_at: "2020-01-01T00:00:00.000Z",
    });
    const r = await verifierEnvoiEnGros(champs);
    expect(r.ok && r.quota.utilises).toBe(0);
  });
});

describe("M'envoyer un test", () => {
  const champs = { destinataires: LISTE, objet: OBJET, corps: CORPS };

  it("courriel du premier destinataire prêt, à l'admin seulement : « [Test] », sans copie cachée ni écriture", async () => {
    etat.ctx = { supabase: fauxSupabase(), user: { ...ADMIN, email: "anthony@technolot.ca" }, requestId: "req-test" };
    const r = await envoyerTestEnGros(champs);
    expect(r).toEqual({ ok: true, a: "anthony@technolot.ca" });

    expect(etat.unitaires).toHaveLength(1);
    const [c] = etat.unitaires;
    expect(c.to).toEqual(["anthony@technolot.ca"]);
    expect(c.bcc).toBeUndefined();
    expect(c.replyTo).toEqual(["anthony@technolot.ca"]);
    expect(c.subject).toBe(`[Test] ${OBJET}`);
    // Même rendu que l'aperçu : prénom et compagnie de la fiche du CRM.
    expect(c.text.startsWith("Bonjour Jean de Acme inc.,\nVoici notre offre.")).toBe(true);

    // Ni fiche, ni trace, ni envoi groupé.
    expect(etat.ecritures).toEqual([]);
    expect(etat.envois).toEqual([]);

    await new Promise((r) => setTimeout(r, 10));
    const texte = journal.join("\n");
    expect(texte).toContain("crm.envoi_en_gros_test");
    expect(texte).not.toMatch(/@exemple\.ca|Offre Techno Lot|Voici notre offre/);
  });

  it("tous les destinataires exclus : refus clair, aucun envoi", async () => {
    const r = await envoyerTestEnGros({ ...champs, destinataires: "desabo@exemple.ca\ndeja@exemple.ca" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/rien à tester/);
    expect(etat.unitaires).toEqual([]);
  });

  it("compte sans adresse courriel : refus, aucun envoi", async () => {
    etat.ctx = { supabase: fauxSupabase(), user: { id: ADMIN.id, email: null }, requestId: "req-test" };
    const r = await envoyerTestEnGros(champs);
    expect(r.ok).toBe(false);
    expect(etat.unitaires).toEqual([]);
  });

  it("limite de débit atteinte : refus, aucun envoi", async () => {
    etat.limitePermise = false;
    const r = await envoyerTestEnGros(champs);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Réessaie dans 2 minutes/);
    expect(etat.unitaires).toEqual([]);
  });
});
