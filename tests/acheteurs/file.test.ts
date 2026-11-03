import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * File des recherches d'acheteurs (lib/acheteurs/file.ts et les routes
 * /api/cron/acheteurs/*) avec une base Supabase SIMULÉE (aucun réseau, aucune
 * vraie clé) : prise conditionnelle avec jeton, plafond de 24 h, réponse lue
 * et rangée au carnet, réponse périmée ignorée, recherche « d'autres
 * acheteurs » ajoutée aux résultats. Compagnies fictives (.example).
 */

type Ligne = Record<string, unknown>;

const etat = vi.hoisted(() => ({
  tables: {} as Record<string, Ligne[]>,
  permis: true,
}));

vi.mock("@/lib/securite/limite", () => ({
  limiter: async () => ({ permis: etat.permis, attente: 0 }),
}));
vi.mock("@/lib/admin/cron", async (original) => ({
  ...(await original<typeof import("@/lib/admin/cron")>()),
  clientServiceCron: () => fauxSupabase(),
}));

/** Client Supabase simulé : select / in / eq / is / order / limit / update / upsert / maybeSingle. */
function fauxSupabase() {
  return {
    from(table: string) {
      const filtres: ((l: Ligne) => boolean)[] = [];
      let maj: Ligne | null = null;
      let fusion: { lignes: Ligne[]; cle: string } | null = null;
      let tri: { colonne: string; croissant: boolean } | null = null;
      let limite = Number.POSITIVE_INFINITY;
      let unique = false;
      const executer = () => {
        const t = (etat.tables[table] ??= []);
        if (fusion) {
          for (const l of fusion.lignes) {
            const i = t.findIndex((x) => x[fusion!.cle] === l[fusion!.cle]);
            if (i >= 0) t[i] = { ...t[i], ...l };
            else t.push({ ...l });
          }
          return { data: null, error: null };
        }
        let lignes = t.filter((l) => filtres.every((f) => f(l)));
        if (maj) for (const l of lignes) Object.assign(l, maj);
        if (tri) {
          const { colonne, croissant } = tri;
          lignes = [...lignes].sort((a, b) => String(a[colonne]).localeCompare(String(b[colonne])) * (croissant ? 1 : -1));
        }
        lignes = lignes.slice(0, limite).map((l) => structuredClone(l));
        return { data: unique ? (lignes[0] ?? null) : lignes, error: null };
      };
      const requete = {
        select: () => requete,
        in: (colonne: string, valeurs: unknown[]) => (filtres.push((l) => valeurs.includes(l[colonne])), requete),
        eq: (colonne: string, valeur: unknown) => (filtres.push((l) => l[colonne] === valeur), requete),
        is: (colonne: string, valeur: unknown) => (filtres.push((l) => (l[colonne] ?? null) === valeur), requete),
        order: (colonne: string, o: { ascending: boolean }) => ((tri = { colonne, croissant: o.ascending }), requete),
        limit: (n: number) => ((limite = n), requete),
        update: (valeurs: Ligne) => ((maj = valeurs), requete),
        upsert: (lignes: Ligne | Ligne[], o: { onConflict: string }) => (
          (fusion = { lignes: [lignes].flat(), cle: o.onConflict }), requete
        ),
        maybeSingle: () => ((unique = true), requete),
        then: (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve().then(executer).then(ok, ko),
      };
      return requete;
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

import { prendreRecherche, recevoirReponse } from "@/lib/acheteurs/file";
import { MESSAGE_PLAFOND, MESSAGES_ECHEC } from "@/lib/acheteurs/types";
import { POST as prendre } from "@/app/api/cron/acheteurs/prendre/route";
import { POST as repondre } from "@/app/api/cron/acheteurs/reponse/route";

const SOUMISSION = "11111111-2222-4333-8444-555555555555";
const AUTRE = "66666666-7777-4888-8999-000000000000";
const T0 = Date.parse("2026-11-03T15:00:00.000Z");
const SECRET_AGENT = "a".repeat(40);

function recherche(extra: Ligne = {}): Ligne {
  return {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    soumission_id: SOUMISSION,
    statut: "en_attente",
    articles: [{ quantite: 12, description: "Cisco Meraki MR57" }],
    domaines_exclus: [],
    resultats: null,
    lignes_refusees: 0,
    erreur: null,
    demande_le: new Date(T0 - 60_000).toISOString(),
    pris_le: null,
    jeton: null,
    resultats_le: null,
    ...extra,
  };
}

function reponseClaude(compagnie = "Surplus Alpha", domaine = "alpha.example") {
  const json = {
    familles: [
      {
        famille: "Cisco Meraki MR",
        rare: true,
        lignes: [
          {
            article: "Cisco Meraki MR57",
            quantite: 12,
            etat: "usagé",
            prix: { bas: 300, haut: 450, devise: "USD", base: "ventes eBay", sources: ["https://www.ebay.com/sch/x"] },
          },
        ],
        acheteurs: [
          {
            compagnie,
            site: `https://www.${domaine}`,
            ville: "Laval",
            region: "Québec",
            pays: "CA",
            confiance: "achete_surplus",
            raison: "Page « Nous achetons »",
            preuve: `https://www.${domaine}/nous-achetons`,
            courriel: `ventes@${domaine}`,
            telephone: "",
            formulaire: "",
            notes: "",
          },
        ],
      },
    ],
    courriel_fr: { objet: "Lot Cisco Meraki", message: "Bonjour,\n\nNous avons un lot." },
    courriel_en: { subject: "Cisco Meraki lot", message: "Hello,\n\nWe have a lot." },
  };
  return "```json\n" + JSON.stringify(json) + "\n```";
}

const ligne = () => etat.tables.recherches_acheteurs[0];

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("SECURITE_RPC_SECRET", "");
  vi.stubEnv("CRON_SECRET", "c".repeat(40));
  vi.stubEnv("AGENT_ACHETEURS_SECRET", SECRET_AGENT);
  etat.tables = { recherches_acheteurs: [], acheteurs: [] };
  etat.permis = true;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("prendreRecherche", () => {
  it("rien à prendre", async () => {
    etat.tables.recherches_acheteurs = [recherche({ statut: "resultats" })];
    expect(await prendreRecherche(fauxSupabase(), T0)).toEqual({ etat: "rien" });
  });

  it("prend la plus ancienne demande : en cours, nouveau jeton, demande sans donnée du client", async () => {
    etat.tables.recherches_acheteurs = [
      recherche({ id: "aaaaaaaa-0000-4000-8000-000000000002", soumission_id: AUTRE, demande_le: new Date(T0).toISOString() }),
      recherche({ domaines_exclus: ["deja.example"] }),
    ];
    const r = await prendreRecherche(fauxSupabase(), T0);
    expect(r.etat).toBe("prise");
    if (r.etat !== "prise") return;
    expect(r.prise.id).toBe("aaaaaaaa-0000-4000-8000-000000000001");
    expect(r.prise.demande).toContain("- 12 × Cisco Meraki MR57");
    expect(r.prise.demande).toContain("deja.example");
    const prise = etat.tables.recherches_acheteurs.find((l) => l.id === r.prise.id)!;
    expect(prise).toMatchObject({ statut: "en_cours", jeton: r.prise.jeton, pris_le: new Date(T0).toISOString() });
    // L'autre attend toujours.
    expect(etat.tables.recherches_acheteurs.find((l) => l.soumission_id === AUTRE)?.statut).toBe("en_attente");
  });

  it("plafond de 24 h : rien n'est pris, l'écran reçoit le message", async () => {
    etat.permis = false;
    etat.tables.recherches_acheteurs = [recherche()];
    expect(await prendreRecherche(fauxSupabase(), T0)).toEqual({ etat: "plafond" });
    expect(ligne()).toMatchObject({ statut: "en_attente", jeton: null, erreur: MESSAGE_PLAFOND });
  });

  it("articles illisibles : échec tout de suite, sans appeler Claude", async () => {
    etat.tables.recherches_acheteurs = [recherche({ articles: [{ description: "" }] })];
    expect(await prendreRecherche(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(ligne()).toMatchObject({ statut: "echec", jeton: null });
  });
});

describe("recevoirReponse", () => {
  async function prise() {
    etat.tables.recherches_acheteurs = [recherche()];
    const r = await prendreRecherche(fauxSupabase(), T0);
    if (r.etat !== "prise") throw new Error("prise attendue");
    return r.prise;
  }

  it("lit la réponse : résultats gardés, compagnie au carnet, jeton effacé", async () => {
    const p = await prise();
    const r = await recevoirReponse(fauxSupabase(), { id: p.id, jeton: p.jeton, reponse: reponseClaude() });
    expect(r).toMatchObject({ etat: "resultats", familles: 1, acheteurs: 1 });
    expect(ligne()).toMatchObject({ statut: "resultats", jeton: null, erreur: null });
    expect(ligne().resultats_le).toEqual(expect.any(String));
    expect(etat.tables.acheteurs).toEqual([expect.objectContaining({ domaine: "alpha.example", courriel: "ventes@alpha.example" })]);
  });

  it("jeton d'une autre prise (annulée, relancée, reprise) : réponse ignorée, rien d'écrit", async () => {
    const p = await prise();
    const r = await recevoirReponse(fauxSupabase(), {
      id: p.id,
      jeton: "bbbbbbbb-0000-4000-8000-000000000009",
      reponse: reponseClaude(),
    });
    expect(r).toEqual({ etat: "perimee" });
    expect(ligne()).toMatchObject({ statut: "en_cours", jeton: p.jeton, resultats: null });
    expect(etat.tables.acheteurs).toEqual([]);
  });

  it("échec signalé par l'agent : message fixe, à relancer", async () => {
    const p = await prise();
    expect(await recevoirReponse(fauxSupabase(), { id: p.id, jeton: p.jeton, echec: "connexion" })).toEqual({
      etat: "echec",
      erreur: MESSAGES_ECHEC.connexion,
    });
    expect(ligne()).toMatchObject({ statut: "echec", jeton: null, erreur: MESSAGES_ECHEC.connexion });
  });

  it("réponse illisible : échec avec la raison, sans détail technique", async () => {
    const p = await prise();
    const r = await recevoirReponse(fauxSupabase(), { id: p.id, jeton: p.jeton, reponse: "Je n'ai rien trouvé." });
    expect(r).toMatchObject({ etat: "echec", erreur: expect.stringContaining("Relancez") });
    expect(ligne().statut).toBe("echec");
  });

  it("« d'autres acheteurs » : les nouvelles compagnies s'ajoutent aux précédentes", async () => {
    const ancienne = {
      familles: [
        {
          nom: "Cisco Meraki MR",
          rare: false,
          lignes: [],
          acheteurs: [{ domaine: "deja.example", raison: null, preuve: "https://deja.example/", confiance: "a_sonder" }],
        },
      ],
      courriels: { fr: null, en: null },
    };
    etat.tables.recherches_acheteurs = [recherche({ resultats: ancienne, domaines_exclus: ["deja.example"] })];
    const r = await prendreRecherche(fauxSupabase(), T0);
    if (r.etat !== "prise") throw new Error("prise attendue");
    await recevoirReponse(fauxSupabase(), { id: r.prise.id, jeton: r.prise.jeton, reponse: reponseClaude() });
    const familles = (ligne().resultats as typeof ancienne).familles;
    expect(familles[0].acheteurs.map((a) => a.domaine)).toEqual(["deja.example", "alpha.example"]);
  });
});

describe("routes de l'agent", () => {
  const appel = (chemin: string, corps?: unknown, cle = SECRET_AGENT) => {
    const texte = corps === undefined ? undefined : JSON.stringify(corps);
    return new Request(`https://technolot.ca${chemin}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cle}`,
        ...(texte ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(texte)) } : {}),
      },
      body: texte,
    });
  };

  it("la clé des tâches planifiées (CRON_SECRET) n'ouvre pas les routes de l'agent", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "cle-de-test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemple.supabase.co");
    expect((await prendre(appel("/api/cron/acheteurs/prendre", undefined, "c".repeat(40)))).status).toBe(401);
    expect((await repondre(appel("/api/cron/acheteurs/reponse", {}, "c".repeat(40)))).status).toBe(401);
  });

  it("prendre : 204 sans demande, puis la demande ; reponse : 400, 200, puis 409 pour un doublon", async () => {
    expect((await prendre(appel("/api/cron/acheteurs/prendre"))).status).toBe(204);

    etat.tables.recherches_acheteurs = [recherche()];
    const r = await prendre(appel("/api/cron/acheteurs/prendre"));
    expect(r.status).toBe(200);
    const p = (await r.json()) as { id: string; jeton: string; demande: string };
    expect(p.demande).toContain("Cisco Meraki MR57");

    expect((await repondre(appel("/api/cron/acheteurs/reponse", { id: p.id, jeton: p.jeton, echec: "inconnu" }))).status).toBe(400);
    const ok = await repondre(appel("/api/cron/acheteurs/reponse", { id: p.id, jeton: p.jeton, reponse: reponseClaude() }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ etat: "resultats" });
    const doublon = await repondre(appel("/api/cron/acheteurs/reponse", { id: p.id, jeton: p.jeton, reponse: reponseClaude() }));
    expect(doublon.status).toBe(409);
  });

  it("prendre : 429 quand le plafond de 24 h est atteint", async () => {
    etat.permis = false;
    etat.tables.recherches_acheteurs = [recherche()];
    expect((await prendre(appel("/api/cron/acheteurs/prendre"))).status).toBe(429);
  });
});
