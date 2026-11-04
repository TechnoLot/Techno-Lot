import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * File des lectures de pièces jointes (lib/acheteurs/file-lecture.ts et les
 * routes /api/cron/acheteurs/lecture/*) avec une base Supabase et une boîte
 * info@ SIMULÉES (aucun réseau, aucune vraie clé) ; les tableurs sont de vrais
 * petits classeurs. Toutes les personnes et compagnies sont fictives.
 */

type Ligne = Record<string, unknown>;

const etat = vi.hoisted(() => ({
  tables: {} as Record<string, Ligne[]>,
  permis: true,
  /** Colonnes lues, par table. */
  lus: {} as Record<string, string[]>,
  /** Une lecture de ces colonnes rend une erreur. */
  colonnesEnPanne: null as string | null,
  /** Appelée juste avant un upsert : une autre écriture passe entre la lecture et l'ajout. */
  avantUpsert: null as (() => void) | null,
}));

const boite = vi.hoisted(() => ({
  emplacement: { dossier: "INBOX", uid: 42 } as { dossier: string; uid: number } | null,
  pieces: [] as { id: string; nom: string; type: string; taille: number }[],
  octets: new Map<string, Uint8Array>(),
  panne: null as "recherche" | "pieces" | "octets" | null,
}));

const photo = vi.hoisted(() => ({ preparerPhoto: vi.fn() }));

vi.mock("@/lib/securite/limite", () => ({
  limiter: async () => ({ permis: etat.permis, attente: 0 }),
}));
vi.mock("@/lib/admin/cron", async (original) => ({
  ...(await original<typeof import("@/lib/admin/cron")>()),
  clientServiceCron: () => fauxSupabase(),
}));
vi.mock("@/lib/acheteurs/photo", () => photo);
vi.mock("@/lib/hostinger/mail", async (original) => {
  const vrai = await original<typeof import("@/lib/hostinger/mail")>();
  const panne = (ou: typeof boite.panne) => {
    if (boite.panne === ou) throw new vrai.ErreurHostinger(404, "boîtes accessibles : secret@exemple.example");
  };
  return {
    ...vrai,
    trouverCourrielSoumission: async () => (panne("recherche"), boite.emplacement),
    piecesDuCourriel: async () => (panne("pieces"), boite.pieces),
    octetsPiece: async (_dossier: string, _uid: number, id: string) => (panne("octets"), boite.octets.get(id) ?? null),
  };
});

/** Client simulé : select / in / eq / is / gte / lte / order / limit / update / upsert / delete / maybeSingle. */
function fauxSupabase() {
  return {
    from(table: string) {
      const filtres: ((l: Ligne) => boolean)[] = [];
      let maj: Ligne | null = null;
      let fusion: { lignes: Ligne[]; cle: string; ignorer: boolean } | null = null;
      let retrait = false;
      let colonnes = "";
      let tri: { colonne: string; croissant: boolean } | null = null;
      let limite = Number.POSITIVE_INFINITY;
      let unique = false;
      const executer = () => {
        const t = (etat.tables[table] ??= []);
        if (colonnes && colonnes === etat.colonnesEnPanne) return { data: null, error: { message: "panne simulée" } };
        if (fusion) {
          etat.avantUpsert?.();
          for (const l of fusion.lignes) {
            const i = t.findIndex((x) => x[fusion!.cle] === l[fusion!.cle]);
            if (i < 0) t.push(ligneParDefaut(l));
            else if (!fusion.ignorer) t[i] = { ...t[i], ...l };
          }
          return { data: null, error: null };
        }
        if (retrait) {
          etat.tables[table] = t.filter((l) => !filtres.every((f) => f(l)));
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
        select: (c: string) => {
          colonnes = c;
          (etat.lus[table] ??= []).push(c);
          return requete;
        },
        in: (colonne: string, valeurs: unknown[]) => (filtres.push((l) => valeurs.includes(l[colonne])), requete),
        eq: (colonne: string, valeur: unknown) => (filtres.push((l) => l[colonne] === valeur), requete),
        is: (colonne: string, valeur: unknown) => (filtres.push((l) => (l[colonne] ?? null) === valeur), requete),
        gte: (colonne: string, valeur: string) => (filtres.push((l) => String(l[colonne]) >= valeur), requete),
        lte: (colonne: string, valeur: string) => (filtres.push((l) => String(l[colonne]) <= valeur), requete),
        order: (colonne: string, o: { ascending: boolean }) => ((tri = { colonne, croissant: o.ascending }), requete),
        limit: (n: number) => ((limite = n), requete),
        update: (valeurs: Ligne) => ((maj = valeurs), requete),
        upsert: (lignes: Ligne | Ligne[], o: { onConflict: string; ignoreDuplicates?: boolean }) => (
          (fusion = { lignes: [lignes].flat(), cle: o.onConflict, ignorer: Boolean(o.ignoreDuplicates) }), requete
        ),
        delete: () => ((retrait = true), requete),
        maybeSingle: () => ((unique = true), requete),
        then: (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve().then(executer).then(ok, ko),
      };
      return requete;
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

let compteur = 0;

/** Valeurs par défaut de la table lectures_soumissions. */
function ligneParDefaut(l: Ligne): Ligne {
  compteur++;
  return {
    id: `aaaaaaaa-0000-4000-8000-${String(compteur).padStart(12, "0")}`,
    statut: "en_attente",
    articles: [],
    articles_ignores: 0,
    pieces: [],
    courriel: null,
    erreur: null,
    demande_le: new Date(T0 - 60_000).toISOString(),
    pris_le: null,
    jeton: null,
    lue_le: null,
    ...l,
  };
}

import { pieceDeLecture, prendreLecture, recevoirLecture, type PriseLecture } from "@/lib/acheteurs/file-lecture";
import {
  LIMITES_LECTURE,
  MESSAGE_PLAFOND_LECTURE,
  MESSAGES_ECHEC_LECTURE,
  type ArticleLu,
  type PieceLue,
} from "@/lib/acheteurs/types";
import { POST as prendre } from "@/app/api/cron/acheteurs/lecture/prendre/route";
import { POST as servirPiece } from "@/app/api/cron/acheteurs/lecture/piece/route";
import { POST as repondre } from "@/app/api/cron/acheteurs/lecture/reponse/route";

const SOUMISSION = "11111111-2222-4333-8444-555555555555";
const AUTRE = "66666666-7777-4888-8999-000000000000";
const JETON_PERIME = "bbbbbbbb-0000-4000-8000-000000000009";
const T0 = Date.parse("2026-11-05T15:00:00.000Z");
const SECRET_AGENT = "a".repeat(40);

const NOM = "Marie-Ève Fictive";
const COURRIEL = "mfictive@usine-exemple.example";
const TELEPHONE = "450-555-0142";
const COMPAGNIE = "Usine Exemple inc.";
const VILLE = "Saint-Fictif";

function soumission(extra: Ligne = {}): Ligne {
  return {
    id: SOUMISSION,
    DATE: new Date(T0 - 10 * 60_000).toISOString(),
    nom: NOM,
    courriel: COURRIEL,
    telephone: TELEPHONE,
    message: `Entreprise : ${COMPAGNIE}\nVille : ${VILLE}\n\nDescription : Bonjour, voir les fichiers joints.\n${NOM}, ${COMPAGNIE}, ${TELEPHONE}`,
    locale: "fr",
    fichiers: ["inventaire.xlsx"],
    ...extra,
  };
}

// --- Fichiers fictifs -------------------------------------------------------------------

const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];

/** Archive ZIP sans compression (le CRC n'est pas vérifié à la lecture). */
function zip(fichiers: Record<string, string>): Uint8Array {
  const encodeur = new TextEncoder();
  const blocs: number[] = [];
  const centraux: number[] = [];
  let n = 0;
  for (const [nom, contenu] of Object.entries(fichiers)) {
    const donnees = [...encodeur.encode(contenu)];
    const nomOctets = [...encodeur.encode(nom)];
    const commun = [...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(donnees.length), ...u32(donnees.length), ...u16(nomOctets.length), ...u16(0)];
    centraux.push(0x50, 0x4b, 0x01, 0x02, ...u16(20), ...commun, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(blocs.length), ...nomOctets);
    blocs.push(0x50, 0x4b, 0x03, 0x04, ...commun, ...nomOctets, ...donnees);
    n++;
  }
  const fin = [0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(n), ...u16(n), ...u32(centraux.length), ...u32(blocs.length), ...u16(0)];
  return Uint8Array.from([...blocs, ...centraux, ...fin]);
}

function cellule(reference: string, valeur: string): string {
  return `<c r="${reference}" t="inlineStr"><is><t>${valeur}</t></is></c>`;
}

/** Classeur d'une feuille, avec une colonne privée et le nom du client dans une cellule. */
function classeur(): Uint8Array {
  const feuille = [
    `<row r="1">${cellule("A1", "Modèle")}${cellule("B1", "Quantité")}${cellule("C1", "Courriel")}${cellule("D1", "Lieu")}</row>`,
    `<row r="2">${cellule("A2", "Cisco Meraki MR57")}<c r="B2"><v>12</v></c>${cellule("C2", COURRIEL)}${cellule("D2", "Usine Exemple")}</row>`,
  ].join("");
  return zip({
    "[Content_Types].xml": "<Types/>",
    "docProps/core.xml": `<cp:coreProperties><dc:creator>${NOM}</dc:creator></cp:coreProperties>`,
    "xl/workbook.xml": `<workbook xmlns:r="urn:r"><sheets><sheet name="Inventaire" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${feuille}</sheetData></worksheet>`,
  });
}

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0]);
const PDF = new TextEncoder().encode("%PDF-1.7\nfictif\n");
const EXECUTABLE = Uint8Array.from([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0]);

const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function ajouterPiece(id: string, nom: string, type: string, octets?: Uint8Array): void {
  boite.pieces.push({ id, nom, type, taille: octets?.length ?? 1 });
  if (octets) boite.octets.set(id, octets);
}

/** Tableur (0), photo 1 (1), PDF (2), photo 2 (3). */
function lotComplet(): void {
  ajouterPiece("p0", "Inventaire Usine Exemple confidentiel.xlsx", MIME_XLSX, classeur());
  ajouterPiece("p1", "photo-marie-tremblay.jpg", "image/jpeg", JPEG);
  ajouterPiece("p2", "bon de commande 2026.pdf", "application/pdf", PDF);
  ajouterPiece("p3", "entrepot.png", "image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]));
}

const lignes = () => etat.tables.lectures_soumissions as Ligne[];
const ligne = () => lignes()[0];
const piecesDe = (l: Ligne) => l.pieces as PieceLue[];

async function prise(): Promise<PriseLecture> {
  etat.tables.soumissions = [soumission()];
  const r = await prendreLecture(fauxSupabase(), T0);
  if (r.etat !== "prise") throw new Error(`prise attendue, reçu ${r.etat}`);
  return r.prise;
}

function reponseClaude(articles: Partial<ArticleLu>[]): string {
  return "```json\n" + JSON.stringify({ articles }) + "\n```";
}

const appel = (chemin: string, corps?: unknown, cle: string | null = SECRET_AGENT) => {
  const texte = corps === undefined ? undefined : JSON.stringify(corps);
  return new Request(`https://technolot.ca/api/cron/acheteurs/lecture/${chemin}`, {
    method: "POST",
    headers: {
      ...(cle ? { authorization: `Bearer ${cle}` } : {}),
      ...(texte ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(texte)) } : {}),
    },
    body: texte,
  });
};

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("SECURITE_RPC_SECRET", "");
  vi.stubEnv("CRON_SECRET", "c".repeat(40));
  vi.stubEnv("AGENT_ACHETEURS_SECRET", SECRET_AGENT);
  vi.stubEnv("HOSTINGER_MAIL_API_TOKEN", "cle-de-test");
  etat.tables = { soumissions: [], lectures_soumissions: [] };
  etat.permis = true;
  etat.lus = {};
  etat.colonnesEnPanne = null;
  etat.avantUpsert = null;
  boite.emplacement = { dossier: "INBOX", uid: 42 };
  boite.pieces = [];
  boite.octets = new Map();
  boite.panne = null;
  photo.preparerPhoto.mockReset();
  photo.preparerPhoto.mockResolvedValue(Buffer.from("photo-reduite"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("routes : authentification", () => {
  it("401 sans Bearer ou avec la clé des tâches planifiées, sur les 3 routes", async () => {
    const routes = [
      () => prendre(appel("prendre", undefined, null)),
      () => servirPiece(appel("piece", {}, null)),
      () => repondre(appel("reponse", {}, null)),
      () => prendre(appel("prendre", undefined, "c".repeat(40))),
      () => servirPiece(appel("piece", {}, "c".repeat(40))),
      () => repondre(appel("reponse", {}, "c".repeat(40))),
    ];
    for (const route of routes) expect((await route()).status).toBe(401);
  });
});

describe("détection des soumissions avec fichiers", () => {
  it("reçue il y a 1 min : pas prise, le courriel n'a peut-être pas encore été reçu", async () => {
    etat.tables.soumissions = [soumission({ DATE: new Date(T0 - 60_000).toISOString() })];
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(lignes()).toEqual([]);
  });

  it("reçue avant LECTURE_DEPUIS : pas prise", async () => {
    etat.tables.soumissions = [soumission({ DATE: "2026-11-03T23:59:00.000Z" })];
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(lignes()).toEqual([]);
  });

  it("passée la fenêtre de 30 jours : pas prise", async () => {
    const tard = Date.parse("2027-01-15T15:00:00.000Z");
    etat.tables.soumissions = [soumission({ DATE: new Date(tard - 31 * 86_400_000).toISOString() })];
    expect(await prendreLecture(fauxSupabase(), tard)).toEqual({ etat: "rien" });
    expect(lignes()).toEqual([]);
  });

  it("sans fichiers : pas prise", async () => {
    etat.tables.soumissions = [soumission({ fichiers: [] }), soumission({ id: AUTRE, fichiers: null })];
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(lignes()).toEqual([]);
  });

  it("déjà une ligne (lue, en échec) : aucun doublon, rien de recréé", async () => {
    etat.tables.soumissions = [soumission(), soumission({ id: AUTRE })];
    etat.tables.lectures_soumissions = [
      ligneParDefaut({ soumission_id: SOUMISSION, statut: "lue", articles: [{ description: "gardé" }] }),
      ligneParDefaut({ soumission_id: AUTRE, statut: "echec", erreur: "Courriel introuvable." }),
    ];
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(lignes()).toHaveLength(2);
    expect(ligne()).toMatchObject({ statut: "lue", articles: [{ description: "gardé" }] });
    expect(lignes()[1]).toMatchObject({ statut: "echec" });
  });

  it("une ligne créée juste avant l'ajout (relecture de l'admin) n'est pas écrasée", async () => {
    etat.tables.soumissions = [soumission()];
    etat.avantUpsert = () => {
      etat.tables.lectures_soumissions.push(ligneParDefaut({ soumission_id: SOUMISSION, statut: "lue" }));
      etat.avantUpsert = null;
    };
    await prendreLecture(fauxSupabase(), T0);
    expect(lignes()).toHaveLength(1);
    expect(ligne().statut).toBe("lue");
  });

  it("ne lit que id et fichiers : aucun renseignement personnel à cette étape", async () => {
    etat.tables.soumissions = [soumission({ DATE: new Date(T0 - 60_000).toISOString() })];
    await prendreLecture(fauxSupabase(), T0);
    expect(etat.lus.soumissions).toEqual(["id, fichiers"]);
  });

  it("une détection en panne n'empêche pas de traiter la file", async () => {
    lotComplet();
    etat.colonnesEnPanne = "id, fichiers";
    etat.tables.soumissions = [soumission()];
    etat.tables.lectures_soumissions = [ligneParDefaut({ soumission_id: SOUMISSION })];
    expect((await prendreLecture(fauxSupabase(), T0)).etat).toBe("prise");
  });
});

describe("prise complète", () => {
  it("la demande contient les cellules, et rien qui désigne le client ni aucun nom de fichier", async () => {
    lotComplet();
    const p = await prise();

    expect(p.demande).toContain("A=Cisco Meraki MR57 | B=12");
    expect(p.demande).toContain("Bonjour, voir les fichiers joints.");
    expect(p.demande).toContain("FICHIER 1 (cellules non vides");
    expect(p.demande).toContain("FICHIER 2 : le PDF joint plus bas.");
    expect(p.demande).toContain("LES PHOTOS (2)");

    for (const interdit of [
      "Marie",
      "Ève",
      "Fictive",
      "mfictive",
      COURRIEL,
      TELEPHONE,
      "450",
      "Usine Exemple",
      VILLE,
      "Inventaire Usine",
      "confidentiel",
      "photo-marie",
      "tremblay",
      "bon de commande",
      "entrepot",
      ".xlsx",
      ".jpg",
      ".png",
      ".pdf",
      "docProps",
    ]) {
      expect(p.demande).not.toContain(interdit);
    }
  });

  it("pieces de l'agent : photos et PDF seulement, avec leur position", async () => {
    lotComplet();
    const p = await prise();
    expect(p.pieces).toEqual([
      { index: 1, etiquette: "Photo 1", type: "image" },
      { index: 2, etiquette: "Fichier 2 (PDF)", type: "pdf" },
      { index: 3, etiquette: "Photo 2", type: "image" },
    ]);
    expect(JSON.stringify(p.pieces)).not.toContain("photo-marie");
  });

  it("la ligne passe « en cours » : jeton, courriel et pièces gardés pour le téléchargement", async () => {
    lotComplet();
    const p = await prise();
    expect(ligne()).toMatchObject({
      id: p.id,
      statut: "en_cours",
      jeton: p.jeton,
      pris_le: new Date(T0).toISOString(),
      courriel: { dossier: "INBOX", uid: 42 },
    });
    expect(piecesDe(ligne()).map((x) => [x.role, x.numero, x.lu])).toEqual([
      ["tableur", null, true],
      ["photo", 1, false],
      ["pdf", null, false],
      ["photo", 2, false],
    ]);
  });

  it("un tableur illisible ne prend pas de numéro de fichier", async () => {
    ajouterPiece("p0", "abime.xlsx", MIME_XLSX, new TextEncoder().encode("pas un classeur"));
    ajouterPiece("p1", "liste.pdf", "application/pdf", PDF);
    const p = await prise();
    expect(p.pieces).toEqual([{ index: 1, etiquette: "Fichier 1 (PDF)", type: "pdf" }]);
    expect(piecesDe(ligne())[0]).toMatchObject({ lu: false, raison: "Fichier illisible : à ouvrir vous-même" });
  });

  it("un tableur trop lourd ou absent de la boîte : même raison", async () => {
    ajouterPiece("p0", "enorme.csv", "text/csv"); // octetsPiece rend null
    ajouterPiece("p1", "liste.pdf", "application/pdf", PDF);
    await prise();
    expect(piecesDe(ligne())[0]).toMatchObject({ lu: false, raison: "Fichier illisible : à ouvrir vous-même" });
  });

  it("tableur vide : sa raison, aucun bloc dans la demande", async () => {
    ajouterPiece("p0", "vide.csv", "text/csv", new TextEncoder().encode(";;;\n;;;\n"));
    ajouterPiece("p1", "liste.pdf", "application/pdf", PDF);
    const p = await prise();
    expect(piecesDe(ligne())[0]).toMatchObject({ lu: false, raison: "Fichier vide" });
    expect(p.demande).not.toContain("cellules non vides");
  });

  it("budget de texte commun : le premier tableur long est coupé, le suivant ne prend plus rien", async () => {
    const long = Array.from({ length: 4_000 }, (_, i) => `Serveur modele ${i};${i};neuf;entrepot principal`).join("\n");
    ajouterPiece("p0", "long.csv", "text/csv", new TextEncoder().encode(long));
    ajouterPiece("p1", "suite.csv", "text/csv", new TextEncoder().encode("Routeur Exemple;3\n"));
    const p = await prise();
    expect(piecesDe(ligne())[0]).toMatchObject({ lu: true, raison: "Fichier très long : seul le début a été lu" });
    expect(piecesDe(ligne())[1]).toMatchObject({ lu: false, raison: "Trop de texte dans les autres fichiers : à ouvrir vous-même" });
    expect(p.demande).toContain("(fichier tronqué)");
    expect(p.demande.length).toBeLessThan(LIMITES_LECTURE.texteTableur + 5_000);
  });
});

describe("rien à faire lire à Claude", () => {
  it(".xls et .heic : lue, 0 article, chacun avec sa raison, sans Claude", async () => {
    ajouterPiece("p0", "stock.xls", "application/vnd.ms-excel");
    ajouterPiece("p1", "IMG_0001.heic", "image/heic");
    etat.tables.soumissions = [soumission()];

    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(ligne()).toMatchObject({ statut: "lue", articles: [], articles_ignores: 0, jeton: null, courriel: null, erreur: null });
    expect(ligne().lue_le).toEqual(expect.any(String));
    expect(piecesDe(ligne()).map((p) => [p.nom, p.lu, p.raison])).toEqual([
      ["stock.xls", false, "Ancien format Excel (.xls) : à ouvrir vous-même"],
      ["IMG_0001.heic", false, "Photo HEIC : à regarder vous-même"],
    ]);
  });

  it(".xls et .heic à côté d'une photo : la lecture part, leurs raisons restent", async () => {
    ajouterPiece("p0", "stock.xls", "application/vnd.ms-excel");
    ajouterPiece("p1", "IMG_0001.heic", "image/heic");
    ajouterPiece("p2", "lot.jpg", "image/jpeg", JPEG);
    const p = await prise();
    expect(p.pieces).toEqual([{ index: 2, etiquette: "Photo 1", type: "image" }]);
    expect(piecesDe(ligne())[0].raison).toContain(".xls");
    expect(piecesDe(ligne())[1].raison).toContain("HEIC");
  });
});

describe("échecs de la préparation", () => {
  it("courriel introuvable : message fixe", async () => {
    boite.emplacement = null;
    etat.tables.soumissions = [soumission()];
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(ligne()).toMatchObject({
      statut: "echec",
      jeton: null,
      erreur: "Courriel introuvable dans la boîte info@ : les pièces jointes ne peuvent pas être lues.",
    });
  });

  it.each(["recherche", "pieces", "octets"] as const)("ErreurHostinger (%s) : message fixe, sans le détail", async (ou) => {
    lotComplet();
    boite.panne = ou;
    etat.tables.soumissions = [soumission()];
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(ligne()).toMatchObject({
      statut: "echec",
      jeton: null,
      erreur: "La boîte info@ n'a pas répondu : relisez les pièces jointes plus tard.",
    });
    expect(String(ligne().erreur)).not.toContain("secret@");
  });

  it("Mail API non configurée : prendreLecture termine en échec", async () => {
    vi.stubEnv("HOSTINGER_MAIL_API_TOKEN", "");
    etat.tables.soumissions = [soumission()];
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(ligne()).toMatchObject({ statut: "echec", erreur: "La Mail API de Hostinger n'est pas configurée." });
  });

  it("soumission disparue : la ligne est supprimée", async () => {
    etat.tables.lectures_soumissions = [ligneParDefaut({ soumission_id: SOUMISSION })];
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(lignes()).toEqual([]);
  });

  it("une autre erreur remonte : la reprise après 30 min fera le reste", async () => {
    lotComplet();
    etat.colonnesEnPanne = "id, DATE, nom, courriel, telephone, message, locale, fichiers";
    etat.tables.soumissions = [soumission()];
    await expect(prendreLecture(fauxSupabase(), T0)).rejects.toBeTruthy();
    expect(ligne().statut).toBe("en_cours");
  });
});

describe("plafond, reprise et prises conditionnelles", () => {
  it("plafond : rien n'est pris, l'écran reçoit le message", async () => {
    etat.permis = false;
    etat.tables.soumissions = [soumission()];
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "plafond" });
    expect(ligne()).toMatchObject({ statut: "en_attente", jeton: null, erreur: MESSAGE_PLAFOND_LECTURE });
  });

  it("reprise d'une lecture abandonnée après 30 min, pas avant", async () => {
    lotComplet();
    etat.tables.soumissions = [soumission()];
    const ancien = "cccccccc-0000-4000-8000-000000000001";
    const abandonnee = (minutes: number) => [
      ligneParDefaut({ soumission_id: SOUMISSION, statut: "en_cours", jeton: ancien, pris_le: new Date(T0 - minutes * 60_000).toISOString() }),
    ];

    etat.tables.lectures_soumissions = abandonnee(29);
    expect(await prendreLecture(fauxSupabase(), T0)).toEqual({ etat: "rien" });
    expect(ligne().jeton).toBe(ancien);

    etat.tables.lectures_soumissions = abandonnee(31);
    const r = await prendreLecture(fauxSupabase(), T0);
    expect(r.etat).toBe("prise");
    expect(ligne().jeton).not.toBe(ancien);
    expect(ligne().pris_le).toBe(new Date(T0).toISOString());
  });

  it("deux prises en même temps ne visent jamais la même ligne", async () => {
    lotComplet();
    etat.tables.soumissions = [soumission()];
    etat.tables.lectures_soumissions = [ligneParDefaut({ soumission_id: SOUMISSION })];
    const r = await Promise.all([prendreLecture(fauxSupabase(), T0), prendreLecture(fauxSupabase(), T0)]);
    expect(r.map((x) => x.etat).sort()).toEqual(["prise", "rien"]);
  });

  it("deux prises de suite : deux lignes différentes", async () => {
    lotComplet();
    etat.tables.soumissions = [soumission(), soumission({ id: AUTRE })];
    const a = await prendreLecture(fauxSupabase(), T0);
    const b = await prendreLecture(fauxSupabase(), T0);
    if (a.etat !== "prise" || b.etat !== "prise") throw new Error("deux prises attendues");
    expect(a.prise.id).not.toBe(b.prise.id);
    expect(a.prise.jeton).not.toBe(b.prise.jeton);
  });
});

describe("route prendre", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(T0);
  });

  it("204 sans rien à lire, 200 avec la prise, 429 au plafond", async () => {
    expect((await prendre(appel("prendre"))).status).toBe(204);

    lotComplet();
    etat.tables.soumissions = [soumission()];
    const r = await prendre(appel("prendre"));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toMatchObject({ id: ligne().id, jeton: ligne().jeton, demande: expect.any(String) });

    etat.tables.soumissions = [soumission({ id: AUTRE })];
    etat.permis = false;
    expect((await prendre(appel("prendre"))).status).toBe(429);
  });

  it("Mail API non configurée : 204, les lectures attendent en file", async () => {
    vi.stubEnv("HOSTINGER_MAIL_API_TOKEN", "");
    etat.tables.soumissions = [soumission()];
    expect((await prendre(appel("prendre"))).status).toBe(204);
    expect(lignes()).toEqual([]);
  });

  it("500 sans détail interne quand la file est illisible", async () => {
    etat.colonnesEnPanne = "id, statut, demande_le, pris_le, jeton";
    const r = await prendre(appel("prendre"));
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("panne simulée");
  });
});

describe("route piece", () => {
  const demander = (p: PriseLecture, index: number, jeton = p.jeton) => servirPiece(appel("piece", { id: p.id, jeton, index }));

  it("une photo passe par preparerPhoto : jamais l'original", async () => {
    lotComplet();
    const p = await prise();
    const r = await demander(p, 1);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/jpeg");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(photo.preparerPhoto).toHaveBeenCalledWith(JPEG);
    expect(Buffer.from(await r.arrayBuffer()).toString()).toBe("photo-reduite");
  });

  it("un PDF part tel quel", async () => {
    lotComplet();
    const p = await prise();
    const r = await demander(p, 2);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(PDF);
    expect(photo.preparerPhoto).not.toHaveBeenCalled();
  });

  it("jeton périmé ou lecture terminée : 409", async () => {
    lotComplet();
    const p = await prise();
    expect((await demander(p, 1, JETON_PERIME)).status).toBe(409);
    await recevoirLecture(fauxSupabase(), { id: p.id, jeton: p.jeton, echec: "autre" });
    expect((await demander(p, 1)).status).toBe(409);
  });

  it("un exécutable renommé .jpg : 422, sans passer par sharp", async () => {
    ajouterPiece("p0", "lot.jpg", "image/jpeg", EXECUTABLE);
    const p = await prise();
    expect((await demander(p, 0)).status).toBe(422);
    expect(photo.preparerPhoto).not.toHaveBeenCalled();
  });

  it("un JPEG renommé .pdf : 422", async () => {
    ajouterPiece("p0", "liste.pdf", "application/pdf", JPEG);
    const p = await prise();
    expect((await demander(p, 0)).status).toBe(422);
  });

  it("index hors bornes : 422 ; hors du format : 400", async () => {
    lotComplet();
    const p = await prise();
    expect((await demander(p, 50)).status).toBe(422);
    expect((await demander(p, 101)).status).toBe(400);
  });

  it("un tableur ne se télécharge pas : 422", async () => {
    lotComplet();
    const p = await prise();
    expect((await demander(p, 0)).status).toBe(422);
  });

  it("photo corrompue, ou sharp absent : 422", async () => {
    lotComplet();
    const p = await prise();
    photo.preparerPhoto.mockRejectedValue(new Error("Input buffer contains unsupported image format"));
    expect((await demander(p, 1)).status).toBe(422);
  });

  it("boîte injoignable au téléchargement : 422", async () => {
    lotComplet();
    const p = await prise();
    boite.panne = "octets";
    expect((await demander(p, 1)).status).toBe(422);
  });
});

describe("recevoirLecture", () => {
  const article = (a: Partial<ArticleLu>): Partial<ArticleLu> => ({
    quantite: 2,
    etat: "usage",
    verification: "non_vu",
    remarque: "",
    photos: [],
    ...a,
  });

  it("garde les articles ; jeton et courriel effacés", async () => {
    lotComplet();
    const p = await prise();
    const r = await recevoirLecture(fauxSupabase(), {
      id: p.id,
      jeton: p.jeton,
      lues: [1, 2, 3],
      reponse: reponseClaude([article({ description: "Cisco Meraki MR57", verification: "confirme", photos: [1], quantite: 12 })]),
    });
    expect(r).toEqual({ etat: "lue", articles: 1 });
    expect(ligne()).toMatchObject({
      statut: "lue",
      jeton: null,
      courriel: null,
      erreur: null,
      articles_ignores: 0,
      articles: [
        { description: "Cisco Meraki MR57", quantite: 12, etat: "usage", verification: "confirme", remarque: null, photos: [1] },
      ],
    });
    expect(ligne().lue_le).toEqual(expect.any(String));
  });

  it("le client est retiré d'une description, masqué dans une remarque, et un article qui ne le désignait que lui part", async () => {
    lotComplet();
    const p = await prise();
    await recevoirLecture(fauxSupabase(), {
      id: p.id,
      jeton: p.jeton,
      lues: [1, 2, 3],
      reponse: reponseClaude([
        article({ description: `Cisco Meraki MR57 ${COMPAGNIE}`, remarque: `Étiquette ${NOM}, ${COURRIEL}` }),
        article({ description: NOM }),
      ]),
    });
    const [gardé, ...reste] = ligne().articles as ArticleLu[];
    expect(reste).toEqual([]);
    expect(gardé.description).toBe("Cisco Meraki MR57");
    expect(gardé.remarque).toBe("Étiquette [client], [client]");
    expect(ligne().articles_ignores).toBe(1);
  });

  it("une photo jamais remise à Claude est retirée ; « confirme » sans photo devient « non_vu »", async () => {
    lotComplet();
    const p = await prise();
    await recevoirLecture(fauxSupabase(), {
      id: p.id,
      jeton: p.jeton,
      lues: [1, 2], // la photo 2 (index 3) n'a pas été remise
      reponse: reponseClaude([
        article({ description: "Vue sur la photo 1", verification: "confirme", photos: [1, 2, 9] }),
        article({ description: "Vue sur la photo 2", verification: "confirme", photos: [2] }),
        article({ description: "Douteux", verification: "doute", photos: [2] }),
      ]),
    });
    expect((ligne().articles as ArticleLu[]).map((a) => [a.description, a.verification, a.photos])).toEqual([
      ["Vue sur la photo 1", "confirme", [1]],
      ["Vue sur la photo 2", "non_vu", []],
      ["Douteux", "doute", []],
    ]);
  });

  it("`lues` met à jour les pièces ; les tableurs ne changent pas ; un index hors bornes est ignoré", async () => {
    lotComplet();
    ajouterPiece("p4", "stock.xls", "application/vnd.ms-excel");
    ajouterPiece("p5", "autre.pdf", "application/pdf", PDF);
    const p = await prise();
    await recevoirLecture(fauxSupabase(), { id: p.id, jeton: p.jeton, lues: [1, 2, 0, 99], reponse: reponseClaude([]) });
    expect(piecesDe(ligne()).map((x) => [x.nom, x.lu, x.raison])).toEqual([
      ["Inventaire Usine Exemple confidentiel.xlsx", true, null],
      ["photo-marie-tremblay.jpg", true, null],
      ["bon de commande 2026.pdf", true, null],
      ["entrepot.png", false, "Photo illisible : à regarder vous-même"],
      ["stock.xls", false, "Ancien format Excel (.xls) : à ouvrir vous-même"],
      ["autre.pdf", false, "PDF illisible : à ouvrir vous-même"],
    ]);
  });

  it("soumission supprimée pendant la lecture : la liste est quand même gardée", async () => {
    lotComplet();
    const p = await prise();
    etat.tables.soumissions = [];
    expect(
      await recevoirLecture(fauxSupabase(), { id: p.id, jeton: p.jeton, lues: [], reponse: reponseClaude([article({ description: "Dell Latitude 5410" })]) }),
    ).toEqual({ etat: "lue", articles: 1 });
  });

  it("réponse mal formée : échec avec la raison, sans détail technique", async () => {
    lotComplet();
    const p = await prise();
    const r = await recevoirLecture(fauxSupabase(), { id: p.id, jeton: p.jeton, lues: [], reponse: "Je n'ai rien compris." });
    expect(r).toMatchObject({ etat: "echec", erreur: expect.stringContaining("Relisez") });
    expect(ligne()).toMatchObject({ statut: "echec", jeton: null, courriel: null });
  });

  it("jeton périmé : réponse ignorée, rien d'écrit", async () => {
    lotComplet();
    const p = await prise();
    const r = await recevoirLecture(fauxSupabase(), {
      id: p.id,
      jeton: JETON_PERIME,
      lues: [],
      reponse: reponseClaude([article({ description: "Dell Latitude 5410" })]),
    });
    expect(r).toEqual({ etat: "perimee" });
    expect(ligne()).toMatchObject({ statut: "en_cours", jeton: p.jeton, articles: [] });
  });

  it("échec signalé par l'agent : message fixe", async () => {
    lotComplet();
    const p = await prise();
    expect(await recevoirLecture(fauxSupabase(), { id: p.id, jeton: p.jeton, echec: "limite" })).toEqual({
      etat: "echec",
      erreur: MESSAGES_ECHEC_LECTURE.limite,
    });
    expect(ligne()).toMatchObject({ statut: "echec", jeton: null, courriel: null, erreur: MESSAGES_ECHEC_LECTURE.limite });
  });
});

describe("pieceDeLecture", () => {
  it("rejette une ligne dont le courriel gardé est illisible", async () => {
    lotComplet();
    const p = await prise();
    ligne().courriel = { dossier: 3 };
    expect(await pieceDeLecture(fauxSupabase(), { id: p.id, jeton: p.jeton, index: 1 })).toEqual({ etat: "illisible" });
  });
});

describe("route reponse", () => {
  const corps = (p: PriseLecture, extra: Ligne) => ({ id: p.id, jeton: p.jeton, ...extra });

  it("400 pour un corps hors format, 200, puis 409 pour un doublon", async () => {
    lotComplet();
    const p = await prise();
    const reponse = reponseClaude([]);
    expect((await repondre(appel("reponse", corps(p, { echec: "inconnu" })))).status).toBe(400);
    expect((await repondre(appel("reponse", corps(p, { reponse })))).status).toBe(400); // `lues` manque
    expect((await repondre(appel("reponse", corps(p, { reponse, lues: [101] })))).status).toBe(400);
    expect((await repondre(appel("reponse", corps(p, { reponse, lues: [], extra: 1 })))).status).toBe(400);

    const ok = await repondre(appel("reponse", corps(p, { reponse, lues: [1] })));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ etat: "lue", articles: 0 });
    expect((await repondre(appel("reponse", corps(p, { reponse, lues: [1] })))).status).toBe(409);
  });

  it("jeton périmé : 409", async () => {
    lotComplet();
    const p = await prise();
    const r = await repondre(appel("reponse", { id: p.id, jeton: JETON_PERIME, reponse: reponseClaude([]), lues: [] }));
    expect(r.status).toBe(409);
  });

  it("échec de l'agent : 200 avec le message fixe", async () => {
    lotComplet();
    const p = await prise();
    const r = await repondre(appel("reponse", corps(p, { echec: "delai" })));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ etat: "echec", erreur: MESSAGES_ECHEC_LECTURE.delai });
  });
});
