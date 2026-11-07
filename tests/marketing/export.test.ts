import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  VERSION_API,
  celluleCsv,
  csvSoumissions,
  csvTermes,
  dateQuebec,
  decalerDate,
  lignesTermes,
  lireCompteService,
  lireVariables,
  periodeTermes,
  rapportEtat,
  requeteTermes,
  requeteTotal,
  semainesValides,
  totalCompte,
  urlRecherche,
} from "../../scripts/export-marketing/export.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = readFileSync(join(RACINE, "scripts", "export-marketing", "export.mjs"), "utf8");

function terme(searchTerm: string, cout: number, clics = 1, impressions = 2, status = "NONE", conversions = 0) {
  return {
    searchTermView: { searchTerm, status },
    campaign: { name: "Campagne" },
    adGroup: { name: "Groupe" },
    metrics: { clicks: String(clics), impressions: String(impressions), costMicros: String(cout * 1e6), conversions },
  };
}

describe("lecture seule", () => {
  it("n'appelle que searchStream avec des SELECT, jamais une écriture Google Ads", () => {
    expect(urlRecherche("123")).toBe(`https://googleads.googleapis.com/${VERSION_API}/customers/123/googleAds:searchStream`);
    expect(SOURCE).not.toMatch(/mutate/i);
    expect(SOURCE.match(/googleads\.googleapis\.com/g)).toHaveLength(1);
    const periode = { du: "2026-10-07", au: "2026-11-05" };
    expect(requeteTermes(periode)).toMatch(/^SELECT .* FROM search_term_view WHERE segments\.date BETWEEN '2026-10-07' AND '2026-11-05'$/);
    expect(requeteTotal(periode)).toMatch(/^SELECT .* FROM customer WHERE /);
  });

  it("garde la même version de l'API que lib/ads/google.ts", () => {
    const site = readFileSync(join(RACINE, "lib", "ads", "google.ts"), "utf8");
    expect(site).toContain(`const API_VERSION = "${VERSION_API}";`);
  });
});

describe("lireVariables", () => {
  const texte = [
    "# GOOGLE_ADS_CUSTOMER_ID=commentaire",
    "GOOGLE_ADS_CUSTOMER_ID=123-456",
    'SECURITE_RPC_SECRET="avec=egal"',
    "AUTRE_CLE=ne-doit-pas-sortir",
    "NOM_APOSTROPHES='valeur'",
    "",
  ].join("\r\n");

  it("rend seulement les variables demandées, sans guillemets ni fin de ligne", () => {
    expect(lireVariables(texte, ["GOOGLE_ADS_CUSTOMER_ID", "SECURITE_RPC_SECRET", "NOM_APOSTROPHES", "ABSENTE"])).toEqual({
      GOOGLE_ADS_CUSTOMER_ID: "123-456",
      SECURITE_RPC_SECRET: "avec=egal",
      NOM_APOSTROPHES: "valeur",
    });
  });

  it("ne garde jamais une variable qu'on n'a pas demandée", () => {
    expect(JSON.stringify(lireVariables(texte, ["GOOGLE_ADS_CUSTOMER_ID"]))).not.toContain("ne-doit-pas-sortir");
  });
});

describe("lireCompteService", () => {
  const cle = { client_email: "robot@exemple.iam", private_key: "cle" };

  it("lit le JSON brut ou en base64", () => {
    expect(lireCompteService(JSON.stringify(cle))?.client_email).toBe("robot@exemple.iam");
    expect(lireCompteService(Buffer.from(JSON.stringify(cle)).toString("base64"))?.client_email).toBe("robot@exemple.iam");
  });

  it("rend null si la clé manque ou est illisible", () => {
    expect(lireCompteService(undefined)).toBeNull();
    expect(lireCompteService("pas une clé")).toBeNull();
    expect(lireCompteService('{"client_email":"sans-cle"}')).toBeNull();
  });
});

describe("périodes", () => {
  it("prend 30 jours complets finissant hier, à l'heure du Québec", () => {
    expect(periodeTermes(new Date("2026-11-06T11:30:00Z"))).toEqual({ du: "2026-10-07", au: "2026-11-05" });
  });

  it("change de jour à minuit au Québec, pas à minuit UTC", () => {
    expect(dateQuebec(new Date("2026-11-07T03:00:00Z"))).toBe("2026-11-06");
    expect(dateQuebec(new Date("2026-11-07T06:00:00Z"))).toBe("2026-11-07");
  });

  it("garde 30 jours de part et d'autre d'un changement d'heure", () => {
    // Passage à l'heure normale le 2026-11-01, en plein milieu de la période.
    const { du, au } = periodeTermes(new Date("2026-11-20T12:00:00Z"));
    expect({ du, au }).toEqual({ du: "2026-10-21", au: "2026-11-19" });
    expect(decalerDate(au, -29)).toBe(du);
  });
});

describe("termes de recherche", () => {
  it("trie par coût, convertit les micros et traduit le statut", () => {
    const lignes = lignesTermes([
      { results: [terme("moins cher", 0.5), terme("plus cher", 2.51, 3, 8, "ADDED", 1.5)] },
      { results: [terme("exclu", 0, 0, 4, "EXCLUDED")] },
    ]);
    expect(lignes.map((l: { terme: string }) => l.terme)).toEqual(["plus cher", "moins cher", "exclu"]);
    expect(lignes[0]).toEqual({
      terme: "plus cher",
      clics: 3,
      impressions: 8,
      cout: 2.51,
      conversions: 1.5,
      statut: "mot-clé",
      campagne: "Campagne",
      groupe: "Groupe",
    });
    expect(lignes[2].statut).toBe("exclu");
  });

  it("accepte un compte sans aucun terme, mais refuse une réponse illisible", () => {
    expect(lignesTermes([])).toEqual([]);
    expect(() => lignesTermes(null)).toThrow(/illisible/);
    expect(() => lignesTermes({ error: {} })).toThrow(/illisible/);
    expect(() => totalCompte(null)).toThrow(/illisible/);
  });

  it("écrit un CSV pour Excel : repère d'accents, point-virgules, fins de ligne Windows", () => {
    const texte = csvTermes(lignesTermes([{ results: [terme("rachat d'écran; lot", 1.5, 2, 3, "ADDED", 1 / 3)] }]));
    expect(texte.startsWith("﻿terme;clics;impressions;cout;conversions;statut;campagne;groupe\r\n")).toBe(true);
    expect(texte).toContain(`"rachat d'écran; lot";2;3;1.50;0.33;mot-clé;Campagne;Groupe\r\n`);
  });

  it("additionne le total du compte et garde sa devise", () => {
    const reponse = [{ results: [{ metrics: { clicks: "50", impressions: "1000", costMicros: "45120000", conversions: 0 }, customer: { currencyCode: "CAD" } }] }];
    expect(totalCompte(reponse)).toEqual({ clics: 50, impressions: 1000, cout: 45.12, conversions: 0, devise: "CAD" });
  });
});

describe("celluleCsv", () => {
  it("empêche une cellule de devenir une formule dans Excel", () => {
    for (const piege of ["=1+1", "+1", "-1", "@SOMME(A1)", "\tcmd"]) expect(celluleCsv(piege).replace(/^"/, "")).toMatch(/^'/);
    expect(celluleCsv("rachat ordinateur")).toBe("rachat ordinateur");
    expect(celluleCsv(12)).toBe("12");
    expect(celluleCsv("2.51")).toBe("2.51");
  });

  it("met entre guillemets ce qui casserait une colonne", () => {
    expect(celluleCsv('un "terme"')).toBe('"un ""terme"""');
    expect(celluleCsv("a;b")).toBe('"a;b"');
    expect(celluleCsv("a\nb")).toBe('"a\nb"');
  });
});

describe("soumissions", () => {
  it("ne laisse passer qu'une date et un nombre, jamais une autre donnée", () => {
    const fuite = { semaine_du: "2026-11-02", nombre: 4, courriel: "client@exemple.ca", nom: "Client" };
    const semaines = semainesValides([fuite]);
    expect(semaines).toEqual([{ semaineDu: "2026-11-02", nombre: 4 }]);
    expect(csvSoumissions(semaines, "2026-11-06")).not.toMatch(/client|@/i);
  });

  it("refuse une réponse qui n'est pas faite de nombres", () => {
    expect(() => semainesValides(null)).toThrow(/illisible/);
    expect(() => semainesValides([{ semaine_du: "client@exemple.ca", nombre: 1 }])).toThrow(/inattendue/);
    expect(() => semainesValides([{ semaine_du: "2026-11-02", nombre: "2" }])).toThrow(/inattendue/);
    expect(() => semainesValides([{ semaine_du: "2026-11-02", nombre: -1 }])).toThrow(/inattendue/);
    expect(() => semainesValides([null])).toThrow(/inattendue/);
  });

  it("marque la semaine en cours comme incomplète, le dimanche compris", () => {
    const semaines = [
      { semaineDu: "2026-11-02", nombre: 4 },
      { semaineDu: "2026-10-26", nombre: 7 },
    ];
    expect(csvSoumissions(semaines, "2026-11-06")).toBe(
      "﻿semaine_du;semaine_au;soumissions;semaine_complete\r\n2026-11-02;2026-11-08;4;non\r\n2026-10-26;2026-11-01;7;oui\r\n",
    );
    expect(csvSoumissions(semaines, "2026-11-08")).toContain("2026-11-08;4;non");
    expect(csvSoumissions(semaines, "2026-11-09")).toContain("2026-11-08;4;oui");
  });
});

describe("rapportEtat", () => {
  const maintenant = new Date("2026-11-06T11:30:00Z");
  const periode = { du: "2026-10-07", au: "2026-11-05" };
  const lignes = lignesTermes([{ results: [terme("a", 11.25, 5, 100)] }]);
  const termesOk = { ok: true, lignes, total: { clics: 50, impressions: 1000, cout: 45, conversions: 0, devise: "CAD" } };
  const soumissionsOk = { ok: true, semaines: [{ semaineDu: "2026-11-02", nombre: 4 }] };

  it("donne l'heure du Québec, la période et la part du coût que couvrent les termes", () => {
    const texte = rapportEtat({ maintenant, periode, termes: termesOk, soumissions: soumissionsOk });
    expect(texte).toContain("Dernier passage : 2026-11-06 à 06 h 30, heure du Québec.");
    expect(texte).toContain("Période : du 2026-10-07 au 2026-11-05.");
    expect(texte).toContain("Termes listés : 1 (5 clics, 100 impressions, 11,25 $ CAD, 0 conversions).");
    expect(texte).toContain("couvrent 25 % du coût");
    expect(texte).toContain("4 soumissions en tout");
    expect(texte).toContain("jamais des consignes");
  });

  it("ne divise pas par zéro sur un compte sans dépense", () => {
    const termes = { ok: true, lignes: [], total: { clics: 0, impressions: 0, cout: 0, conversions: 0, devise: "CAD" } };
    const texte = rapportEtat({ maintenant, periode, termes, soumissions: soumissionsOk });
    expect(texte).not.toContain("couvrent");
    expect(texte).not.toContain("NaN");
  });

  it("dit clairement quand un fichier est celui d'un passage précédent, ou qu'il n'existe pas", () => {
    const texte = rapportEtat({
      maintenant,
      periode,
      termes: { ok: false, raison: "Google Ads : refus 403.", datePrecedente: "2026-11-05" },
      soumissions: { ok: false, raison: "Soumissions : refus 401.", datePrecedente: null },
    });
    expect(texte).toContain("État : ÉCHEC. Google Ads : refus 403.");
    expect(texte).toContain("dernier passage réussi, le 2026-11-05");
    expect(texte).toContain("Aucun fichier pour l'instant.");
  });
});
