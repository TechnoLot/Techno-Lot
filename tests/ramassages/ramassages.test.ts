import { describe, expect, it } from "vitest";
import {
  ancreVoisine,
  bornesVue,
  clientDuTitre,
  comparerRamassages,
  datesEvenement,
  depuisEvenement,
  descriptionRamassage,
  evenementPourCreation,
  evenementPourModification,
  formulaireDe,
  formulaireNouveau,
  grilleMois,
  heureCourte,
  jourComplet,
  jourSemaineCourt,
  joursSemaine,
  lienFiche,
  lienVue,
  lundiDe,
  momentToronto,
  nomJour,
  nomRamassage,
  notesDeDescription,
  parseAncre,
  parseVue,
  plageHoraire,
  ramassagesDuJour,
  surPlusieursJours,
  texteDescription,
  titreRamassage,
  titreVue,
  uneHeurePlusTard,
  villeDeAdresse,
  type EvenementGoogle,
  type Ramassage,
  type ValeursRamassage,
  bornesLecture,
  compterParMois,
  dansGrille,
  dispositionJour,
  heureDeMinutes,
  horizonAVenir,
  libelleMois,
  lienItineraire,
  minutesDe,
  moisAVenir,
  moisCourt,
  plageHeures,
  prochainRamassage,
} from "@/lib/ramassages/ramassages";
import { etagEvenement, idEvenement, ramassageSchema } from "@/lib/admin/schemas";

/*
 * Ramassages (lib/ramassages/ramassages.ts), module pur. Novembre 2026 : heure
 * normale de l'Est (UTC−5) depuis le dimanche 1er novembre ; octobre : UTC−4.
 * Le lundi 2 novembre 2026 sert d'aujourd'hui.
 */
const AUJOURDHUI = "2026-11-02";
const UUID = "0b9e4c1a-1d2e-4f3a-8b5c-6d7e8f9a0b1c";
const SITE = "https://www.technolot.ca";

/** Ramassage complet, à heure précise par défaut (5 nov., 9 h – 10 h). */
function ramassage(p: Partial<Ramassage> = {}): Ramassage {
  return {
    id: "evt1",
    etag: '"1"',
    titre: "Ramassage · Info Plus",
    client: "Info Plus",
    adresse: "",
    notes: "",
    journee: false,
    jour: "2026-11-05",
    jourFin: "2026-11-05",
    heureDebut: "09:00",
    heureFin: "10:00",
    debut: "2026-11-05T09:00:00-05:00",
    fin: "2026-11-05T10:00:00-05:00",
    companyId: null,
    lotId: null,
    repete: false,
    lienGoogle: null,
    ...p,
  };
}

/* ------------------------------------------------------------------ */
/* Titre, description, liens                                           */
/* ------------------------------------------------------------------ */

describe("titreRamassage / clientDuTitre", () => {
  it("écrit « Ramassage · client » et le relit", () => {
    expect(titreRamassage("  Info Plus ")).toBe("Ramassage · Info Plus");
    expect(clientDuTitre(titreRamassage("Garage Roy"))).toBe("Garage Roy");
  });

  it("accepte les titres tapés à la main dans Google", () => {
    expect(clientDuTitre("Ramassage - Info Plus")).toBe("Info Plus");
    expect(clientDuTitre("ramassage: Garage Roy")).toBe("Garage Roy");
    expect(clientDuTitre("Ramassage — École X")).toBe("École X");
    expect(clientDuTitre("Ramassage chez Clinique Y")).toBe("Clinique Y");
    expect(clientDuTitre("Pick-up Bureau Z")).toBe("Bureau Z");
    expect(clientDuTitre("Pickup : Dépôt W")).toBe("Dépôt W");
  });

  it("garde tel quel un autre titre ; « Ramassage » seul n'a pas de client", () => {
    expect(clientDuTitre("Livraison Dell")).toBe("Livraison Dell");
    expect(clientDuTitre("Ramassages divers")).toBe("Ramassages divers");
    expect(clientDuTitre("Ramassage")).toBe("");
    expect(clientDuTitre("  ")).toBe("");
  });
});

describe("texteDescription", () => {
  it("vide → chaîne vide ; texte simple gardé", () => {
    expect(texteDescription(undefined)).toBe("");
    expect(texteDescription(null)).toBe("");
    expect(texteDescription("Quai B\nDemander Luc")).toBe("Quai B\nDemander Luc");
  });

  it("retire le HTML de l'éditeur de Google Agenda", () => {
    expect(texteDescription("Quai B<br>Demander <b>Luc</b>")).toBe("Quai B\nDemander Luc");
    expect(texteDescription("<p>Un</p><p>Deux</p>")).toBe("Un\nDeux");
    expect(texteDescription("<ul><li>Un</li><li>Deux</li></ul>")).toBe("• Un\n• Deux");
  });

  it("décode les entités et resserre les lignes vides", () => {
    expect(texteDescription("A &amp; B &lt;3 &#233;t&#xe9;&nbsp;!")).toBe("A & B <3 été !");
    expect(texteDescription("Un\r\n\r\n\r\n\r\nDeux  \n")).toBe("Un\n\nDeux");
  });
});

describe("notes ↔ description", () => {
  const lien = `${SITE}/admin/crm/${UUID}`;

  it("ajoute la fiche après les notes", () => {
    expect(descriptionRamassage("Quai B", lien)).toBe(`Quai B\n\nFiche Techno Lot : ${lien}`);
    expect(descriptionRamassage("  ", lien)).toBe(`Fiche Techno Lot : ${lien}`);
    expect(descriptionRamassage("Quai B", null)).toBe("Quai B");
    expect(descriptionRamassage(null, null)).toBe("");
  });

  it("retire la ligne de la fiche à la lecture, même réécrite en HTML par Google", () => {
    expect(notesDeDescription(descriptionRamassage("Quai B\nDemander Luc", lien))).toBe("Quai B\nDemander Luc");
    expect(notesDeDescription(`Quai B<br><br>Fiche Techno Lot : <a href="${lien}">${lien}</a>`)).toBe("Quai B");
    expect(notesDeDescription(descriptionRamassage("", lien))).toBe("");
  });

  it("lienFiche : compagnie d'abord, sinon lot ; rien sans adresse du site", () => {
    expect(lienFiche(`${SITE}/`, { companyId: UUID, lotId: "x" })).toBe(`${SITE}/admin/crm/${UUID}`);
    expect(lienFiche(SITE, { companyId: null, lotId: UUID })).toBe(`${SITE}/admin/lots/${UUID}`);
    expect(lienFiche(SITE, { companyId: null, lotId: null })).toBeNull();
    expect(lienFiche(undefined, { companyId: UUID, lotId: null })).toBeNull();
    expect(lienFiche("  ", { companyId: UUID, lotId: null })).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Événement Google → ramassage                                        */
/* ------------------------------------------------------------------ */

describe("momentToronto", () => {
  it("jour et heure à Toronto, heure normale et heure avancée", () => {
    expect(momentToronto("2026-11-05T14:00:00Z")).toEqual({ jour: "2026-11-05", heure: "09:00" });
    expect(momentToronto("2026-10-30T14:00:00Z")).toEqual({ jour: "2026-10-30", heure: "10:00" });
    expect(momentToronto("2026-11-05T04:30:00Z")).toEqual({ jour: "2026-11-04", heure: "23:30" });
    expect(momentToronto("2026-11-05T09:00:00-05:00")).toEqual({ jour: "2026-11-05", heure: "09:00" });
  });

  it("instant illisible → null", () => {
    expect(momentToronto("pas une date")).toBeNull();
  });
});

describe("depuisEvenement", () => {
  const ev: EvenementGoogle = {
    id: "abc123",
    etag: '"3528"',
    status: "confirmed",
    summary: "Ramassage · Info Plus",
    location: " 12 rue Principale, Laval ",
    description: `Quai B\n\nFiche Techno Lot : ${SITE}/admin/crm/${UUID}`,
    htmlLink: "https://www.google.com/calendar/event?eid=abc",
    start: { dateTime: "2026-11-05T09:00:00-05:00", timeZone: "America/Toronto" },
    end: { dateTime: "2026-11-05T10:30:00-05:00", timeZone: "America/Toronto" },
    extendedProperties: { private: { technolot: "ramassage", companyId: UUID.toUpperCase(), lotId: "" } },
  };

  it("ramassage à heure précise", () => {
    expect(depuisEvenement(ev)).toEqual({
      id: "abc123",
      etag: '"3528"',
      titre: "Ramassage · Info Plus",
      client: "Info Plus",
      adresse: "12 rue Principale, Laval",
      notes: "Quai B",
      journee: false,
      jour: "2026-11-05",
      jourFin: "2026-11-05",
      heureDebut: "09:00",
      heureFin: "10:30",
      debut: "2026-11-05T09:00:00-05:00",
      fin: "2026-11-05T10:30:00-05:00",
      companyId: UUID,
      lotId: null,
      repete: false,
      lienGoogle: "https://www.google.com/calendar/event?eid=abc",
    });
  });

  it("toute la journée : la fin de Google est exclusive", () => {
    const un = depuisEvenement({ id: "j1", start: { date: "2026-11-05" }, end: { date: "2026-11-06" } });
    expect(un).toMatchObject({ journee: true, jour: "2026-11-05", jourFin: "2026-11-05", heureDebut: null, debut: "2026-11-05", fin: "2026-11-06" });
    const trois = depuisEvenement({ id: "j3", start: { date: "2026-11-05" }, end: { date: "2026-11-08" } });
    expect(trois).toMatchObject({ jour: "2026-11-05", jourFin: "2026-11-07" });
    const sansFin = depuisEvenement({ id: "j0", start: { date: "2026-11-05" } });
    expect(sansFin).toMatchObject({ jourFin: "2026-11-05", fin: "2026-11-06" });
  });

  it("une fin à minuit reste sur la veille ; sinon le ramassage couvre plusieurs jours", () => {
    const soir = depuisEvenement({
      id: "s",
      start: { dateTime: "2026-11-05T22:00:00-05:00" },
      end: { dateTime: "2026-11-06T00:00:00-05:00" },
    });
    expect(soir).toMatchObject({ jour: "2026-11-05", jourFin: "2026-11-05", heureFin: "00:00" });
    const long = depuisEvenement({
      id: "l",
      start: { dateTime: "2026-11-05T09:00:00-05:00" },
      end: { dateTime: "2026-11-06T17:00:00-05:00" },
    });
    expect(long).toMatchObject({ jour: "2026-11-05", jourFin: "2026-11-06", heureDebut: "09:00", heureFin: "17:00" });
  });

  it("supprimé, sans identifiant ou sans date lisible → null", () => {
    expect(depuisEvenement({ ...ev, status: "cancelled" })).toBeNull();
    expect(depuisEvenement({ ...ev, id: undefined })).toBeNull();
    expect(depuisEvenement({ ...ev, start: undefined })).toBeNull();
    expect(depuisEvenement({ ...ev, start: { dateTime: "n'importe quoi" } })).toBeNull();
    expect(depuisEvenement({ ...ev, start: { date: "2026-02-30" } })).toBeNull();
  });

  it("lien Google seulement vers google.com en https ; identifiants privés seulement en UUID", () => {
    expect(depuisEvenement({ ...ev, htmlLink: "javascript:alert(1)" })?.lienGoogle).toBeNull();
    expect(depuisEvenement({ ...ev, htmlLink: "https://exemple.com/x" })?.lienGoogle).toBeNull();
    expect(depuisEvenement({ ...ev, htmlLink: "http://www.google.com/calendar" })?.lienGoogle).toBeNull();
    const r = depuisEvenement({ ...ev, extendedProperties: { private: { companyId: "pas-un-uuid", lotId: UUID } } });
    expect(r).toMatchObject({ companyId: null, lotId: UUID });
  });

  it("événement créé dans Google : sans titre, sans propriétés, répété", () => {
    const r = depuisEvenement({ id: "g_20261105T140000Z", recurringEventId: "g", start: ev.start, end: ev.end });
    expect(r).toMatchObject({ titre: "", client: "", adresse: "", notes: "", companyId: null, lotId: null, repete: true, etag: null });
  });
});

/* ------------------------------------------------------------------ */
/* Ramassage → événement Google                                        */
/* ------------------------------------------------------------------ */

const valeurs: ValeursRamassage = {
  client: "Info Plus",
  adresse: "12 rue Principale, Laval",
  date: "2026-11-05",
  journee: false,
  debut: "09:00",
  fin: "10:30",
  notes: "Quai B",
  companyId: UUID,
  lotId: null,
};

describe("événement envoyé à Google", () => {
  const lien = `${SITE}/admin/crm/${UUID}`;

  it("création à heure précise, au fuseau de Toronto", () => {
    expect(evenementPourCreation(valeurs, lien)).toEqual({
      summary: "Ramassage · Info Plus",
      location: "12 rue Principale, Laval",
      description: `Quai B\n\nFiche Techno Lot : ${lien}`,
      start: { dateTime: "2026-11-05T09:00:00", timeZone: "America/Toronto" },
      end: { dateTime: "2026-11-05T10:30:00", timeZone: "America/Toronto" },
      extendedProperties: { private: { technolot: "ramassage", companyId: UUID, lotId: "" } },
    });
  });

  it("création toute la journée : fin exclusive (lendemain), sans heure", () => {
    expect(datesEvenement({ ...valeurs, journee: true, debut: null, fin: null })).toEqual({
      start: { date: "2026-11-05" },
      end: { date: "2026-11-06" },
    });
  });

  it("modification : l'autre forme de date est effacée (null) ; adresse et notes vides effacent", () => {
    const corps = evenementPourModification({ ...valeurs, adresse: null, notes: null, companyId: null }, null, true);
    expect(corps).toEqual({
      summary: "Ramassage · Info Plus",
      location: "",
      description: "",
      start: { dateTime: "2026-11-05T09:00:00", timeZone: "America/Toronto", date: null },
      end: { dateTime: "2026-11-05T10:30:00", timeZone: "America/Toronto", date: null },
      extendedProperties: { private: { technolot: "ramassage", companyId: "", lotId: "" } },
    });
    expect(datesEvenement({ ...valeurs, journee: true }, true)).toEqual({
      start: { date: "2026-11-05", dateTime: null, timeZone: null },
      end: { date: "2026-11-06", dateTime: null, timeZone: null },
    });
  });

  it("modification sans les dates (ramassage de plusieurs jours)", () => {
    const corps = evenementPourModification(valeurs, lien, false);
    expect(corps.start).toBeUndefined();
    expect(corps.end).toBeUndefined();
    expect(corps.summary).toBe("Ramassage · Info Plus");
  });

  it("aller-retour : ce que le site écrit se relit à l'identique", () => {
    const corps = evenementPourCreation(valeurs, lien);
    const relu = depuisEvenement({
      ...corps,
      id: "nouveau",
      start: { dateTime: "2026-11-05T09:00:00-05:00" },
      end: { dateTime: "2026-11-05T10:30:00-05:00" },
    });
    expect(relu).toMatchObject({
      client: valeurs.client,
      adresse: valeurs.adresse,
      notes: valeurs.notes,
      companyId: UUID,
      heureDebut: "09:00",
      heureFin: "10:30",
    });
  });
});

/* ------------------------------------------------------------------ */
/* Formulaire                                                          */
/* ------------------------------------------------------------------ */

describe("formulaire", () => {
  it("uneHeurePlusTard : +1 h, jamais après 23 h 59", () => {
    expect(uneHeurePlusTard("09:30")).toBe("10:30");
    expect(uneHeurePlusTard("22:15")).toBe("23:15");
    expect(uneHeurePlusTard("23:00")).toBe("23:59");
    expect(uneHeurePlusTard("23:45")).toBe("23:59");
    expect(uneHeurePlusTard("")).toBe("10:00");
  });

  it("nouveau : 9 h – 10 h le jour choisi", () => {
    expect(formulaireNouveau("2026-11-05")).toEqual({
      client: "",
      adresse: "",
      date: "2026-11-05",
      journee: false,
      debut: "09:00",
      fin: "10:00",
      notes: "",
      companyId: null,
      lotId: null,
    });
  });

  it("existant : reprend ses valeurs ; toute la journée garde 9 h – 10 h en réserve", () => {
    expect(formulaireDe(ramassage({ adresse: "A", notes: "N", companyId: UUID, heureFin: "11:15" }))).toEqual({
      client: "Info Plus",
      adresse: "A",
      date: "2026-11-05",
      journee: false,
      debut: "09:00",
      fin: "11:15",
      notes: "N",
      companyId: UUID,
      lotId: null,
    });
    const journee = formulaireDe(ramassage({ journee: true, heureDebut: null, heureFin: null }));
    expect(journee).toMatchObject({ journee: true, debut: "09:00", fin: "10:00" });
    expect(formulaireDe(ramassage({ heureFin: "08:00" })).fin).toBe("10:00");
  });

  it("plusieurs jours : dates modifiables seulement dans Google", () => {
    expect(surPlusieursJours(ramassage())).toBe(false);
    expect(surPlusieursJours(ramassage({ jourFin: "2026-11-06" }))).toBe(true);
  });
});

describe("ramassageSchema (validation serveur)", () => {
  const brut = {
    client: " Info Plus ",
    adresse: "",
    date: "2026-11-05",
    journee: false,
    debut: "09:00",
    fin: "10:30",
    notes: "  ",
    companyId: UUID.toUpperCase(),
    lotId: null,
  };

  it("valide : champs vides → null, UUID en minuscules", () => {
    const r = ramassageSchema.safeParse(brut);
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ ...valeurs, adresse: null, notes: null });
  });

  it("toute la journée : heures facultatives", () => {
    const r = ramassageSchema.safeParse({ ...brut, journee: true, debut: "", fin: "" });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ journee: true, debut: null, fin: null });
  });

  it("refuse : client vide, fin avant le début, heure manquante, date impossible", () => {
    const champ = (v: Record<string, unknown>) => {
      const r = ramassageSchema.safeParse({ ...brut, ...v });
      return r.success ? null : r.error.issues.map((i) => [i.path.join("."), i.message]);
    };
    expect(champ({ client: "  " })?.[0]?.[0]).toBe("client");
    expect(champ({ fin: "09:00" })).toEqual([["fin", "La fin doit suivre le début."]]);
    expect(champ({ debut: "" })).toEqual([["debut", "Indique l’heure de début."]]);
    expect(champ({ date: "2026-02-30" })?.[0]?.[0]).toBe("date");
    expect(champ({ debut: "25:00" })?.[0]?.[0]).toBe("debut");
  });

  it("refuse un champ inconnu, un texte trop long ou un identifiant invalide", () => {
    expect(ramassageSchema.safeParse({ ...brut, role: "admin" }).success).toBe(false);
    expect(ramassageSchema.safeParse({ ...brut, client: "x".repeat(121) }).success).toBe(false);
    expect(ramassageSchema.safeParse({ ...brut, notes: "x".repeat(2_001) }).success).toBe(false);
    expect(ramassageSchema.safeParse({ ...brut, companyId: "1; drop" }).success).toBe(false);
  });

  it("identifiant et version d'un événement", () => {
    expect(idEvenement.safeParse("abc123_20261105T140000Z").success).toBe(true);
    expect(idEvenement.safeParse("../x").success).toBe(false);
    expect(idEvenement.safeParse("").success).toBe(false);
    expect(etagEvenement.safeParse('"3528654321234000"').success).toBe(true);
    expect(etagEvenement.safeParse('W/"abc"').success).toBe(true);
    expect(etagEvenement.safeParse("3528").success).toBe(false);
    expect(etagEvenement.safeParse('"1"\r\nX-Injecte: oui').success).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Affichage                                                           */
/* ------------------------------------------------------------------ */

describe("affichage", () => {
  it("heureCourte", () => {
    expect(heureCourte("09:00")).toBe("9 h");
    expect(heureCourte("09:30")).toBe("9 h 30");
    expect(heureCourte("14:05")).toBe("14 h 05");
    expect(heureCourte("00:00")).toBe("0 h");
  });

  it("plageHoraire", () => {
    expect(plageHoraire(ramassage({ heureFin: "10:30" }))).toBe("9 h – 10 h 30");
    expect(plageHoraire(ramassage({ heureFin: "09:00" }))).toBe("9 h");
    expect(plageHoraire(ramassage({ heureFin: null }))).toBe("9 h");
    expect(plageHoraire(ramassage({ journee: true, heureDebut: null, heureFin: null }))).toBe("Toute la journée");
    expect(plageHoraire(ramassage({ journee: true, heureDebut: null, heureFin: null, jourFin: "2026-11-07" }))).toBe(
      "Du 5 nov. au 7 nov.",
    );
    expect(plageHoraire(ramassage({ jourFin: "2026-11-06", heureFin: "17:00" }))).toBe("5 nov., 9 h – 6 nov., 17 h");
  });

  it("nomRamassage : client, sinon titre, sinon « Sans titre »", () => {
    expect(nomRamassage({ client: "Info Plus", titre: "Ramassage · Info Plus" })).toBe("Info Plus");
    expect(nomRamassage({ client: "", titre: "Ramassage" })).toBe("Ramassage");
    expect(nomRamassage({ client: "", titre: "" })).toBe("Sans titre");
  });

  it("villeDeAdresse", () => {
    expect(villeDeAdresse("123 rue Principale, Laval, QC H7N 1A1")).toBe("Laval");
    expect(villeDeAdresse("123 rue Principale, Laval, QC H7N 1A1, Canada")).toBe("Laval");
    expect(villeDeAdresse("4500 boul. X, Montréal (Québec) H1H 1H1")).toBe("Montréal");
    expect(villeDeAdresse("Mascouche, QC")).toBe("Mascouche");
    expect(villeDeAdresse("Laval QC H7N 1A1")).toBe("Laval");
    expect(villeDeAdresse("123 rue X")).toBe("123 rue X");
    expect(villeDeAdresse("")).toBe("");
  });

  it("ordre d'une journée et ramassages de plusieurs jours", () => {
    const a = ramassage({ id: "a", heureDebut: "14:00" });
    const b = ramassage({ id: "b", heureDebut: "09:00" });
    const c = ramassage({ id: "c", journee: true, heureDebut: null });
    const long = ramassage({ id: "long", jour: "2026-11-04", jourFin: "2026-11-06" });
    expect([a, b, c].sort(comparerRamassages).map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(ramassagesDuJour([a, long], "2026-11-06").map((r) => r.id)).toEqual(["long"]);
    expect(ramassagesDuJour([a, long], "2026-11-07")).toEqual([]);
  });

  it("noms des jours", () => {
    expect(nomJour(AUJOURDHUI, AUJOURDHUI)).toBe("Aujourd’hui");
    expect(nomJour("2026-11-03", AUJOURDHUI)).toBe("Demain");
    expect(nomJour("2026-11-05", AUJOURDHUI)).toBe("Jeudi 5 nov.");
    expect(jourComplet("2026-12-01")).toBe("Mardi 1er déc.");
    expect(jourSemaineCourt(AUJOURDHUI)).toBe("lun.");
  });
});

/* ------------------------------------------------------------------ */
/* Vues                                                                */
/* ------------------------------------------------------------------ */

describe("vues Semaine / Mois / Liste", () => {
  it("parseVue et parseAncre", () => {
    expect(parseVue("mois")).toBe("mois");
    expect(parseVue("liste")).toBe("liste");
    expect(parseVue("autre")).toBe("semaine");
    expect(parseVue(undefined)).toBe("semaine");
    expect(parseAncre("2026-11-05", AUJOURDHUI)).toBe("2026-11-05");
    expect(parseAncre("2026-02-30", AUJOURDHUI)).toBe(AUJOURDHUI);
    expect(parseAncre("hier", AUJOURDHUI)).toBe(AUJOURDHUI);
    expect(parseAncre("2040-01-01", AUJOURDHUI)).toBe(AUJOURDHUI);
    expect(parseAncre(null, AUJOURDHUI)).toBe(AUJOURDHUI);
  });

  it("semaine du lundi au dimanche", () => {
    expect(lundiDe("2026-11-02")).toBe("2026-11-02");
    expect(lundiDe("2026-11-04")).toBe("2026-11-02");
    expect(lundiDe("2026-11-08")).toBe("2026-11-02");
    expect(joursSemaine("2026-11-05")).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
  });

  it("grille du mois : 5 ou 6 semaines complètes", () => {
    const novembre = grilleMois("2026-11-15");
    expect(novembre).toHaveLength(6);
    expect(novembre[0][0]).toBe("2026-10-26");
    expect(novembre[5][6]).toBe("2026-12-06");
    const fevrier = grilleMois("2026-02-10");
    expect(fevrier).toHaveLength(5);
    expect([fevrier[0][0], fevrier[4][6]]).toEqual(["2026-01-26", "2026-03-01"]);
    const juin = grilleMois("2026-06-20");
    expect([juin[0][0], juin.length]).toEqual(["2026-06-01", 5]);
  });

  it("jours lus dans Google pour chaque vue", () => {
    expect(bornesVue("semaine", "2026-11-05", AUJOURDHUI)).toEqual({ debut: "2026-11-02", fin: "2026-11-08" });
    expect(bornesVue("mois", "2026-11-15", AUJOURDHUI)).toEqual({ debut: "2026-10-26", fin: "2026-12-06" });
    expect(bornesVue("liste", "2027-01-01", AUJOURDHUI)).toEqual({ debut: AUJOURDHUI, fin: "2027-10-31" });
  });

  it("flèches : semaine voisine, ou le 1er du mois voisin", () => {
    expect(ancreVoisine("semaine", "2026-11-05", 1)).toBe("2026-11-09");
    expect(ancreVoisine("semaine", "2026-11-05", -1)).toBe("2026-10-26");
    expect(ancreVoisine("mois", "2026-11-15", 1)).toBe("2026-12-01");
    expect(ancreVoisine("mois", "2026-12-31", 1)).toBe("2027-01-01");
    expect(ancreVoisine("mois", "2026-01-31", -1)).toBe("2025-12-01");
  });

  it("titre de la période", () => {
    expect(titreVue("semaine", "2026-11-05")).toBe("2 – 8 nov. 2026");
    expect(titreVue("semaine", "2026-12-01")).toBe("30 nov. – 6 déc. 2026");
    expect(titreVue("semaine", "2026-12-30")).toBe("28 déc. 2026 – 3 janv. 2027");
    expect(titreVue("semaine", "2026-06-03")).toBe("1er – 7 juin 2026");
    expect(titreVue("mois", "2026-11-15")).toBe("Novembre 2026");
    expect(titreVue("liste", "2026-11-15")).toBe("À venir");
  });

  it("liens des vues : Semaine et aujourd'hui omis", () => {
    expect(lienVue("semaine", null)).toBe("/admin/ramassages");
    expect(lienVue("semaine", "2026-11-09")).toBe("/admin/ramassages?date=2026-11-09");
    expect(lienVue("mois", "2026-11-01")).toBe("/admin/ramassages?vue=mois&date=2026-11-01");
    expect(lienVue("liste", null)).toBe("/admin/ramassages?vue=liste");
  });
});

/* ------------------------------------------------------------------ */
/* Mois à venir, prochain ramassage                                    */
/* ------------------------------------------------------------------ */

describe("mois à venir", () => {
  it("horizon : d'aujourd'hui à la fin du 12e mois", () => {
    expect(horizonAVenir(AUJOURDHUI)).toEqual({ debut: AUJOURDHUI, fin: "2027-10-31" });
    expect(horizonAVenir("2026-01-31")).toEqual({ debut: "2026-01-31", fin: "2026-12-31" });
  });

  it("les 12 mois, le mois courant d'abord", () => {
    const mois = moisAVenir(AUJOURDHUI);
    expect(mois).toHaveLength(12);
    expect(mois[0]).toEqual({ cle: "2026-11", premier: "2026-11-01", libelle: "Novembre 2026" });
    expect(mois[2]).toEqual({ cle: "2027-01", premier: "2027-01-01", libelle: "Janvier 2027" });
    expect(mois[11].cle).toBe("2027-10");
  });

  it("libellés et nombre par mois de début", () => {
    expect(libelleMois("2026-12")).toBe("Décembre 2026");
    expect(libelleMois("2027-06-15")).toBe("Juin 2027");
    expect(moisCourt("2026-11-01")).toBe("nov.");
    expect(moisCourt("2027-06-01")).toBe("juin");
    const comptes = compterParMois([{ jour: "2026-11-05" }, { jour: "2026-11-30" }, { jour: "2026-12-01" }]);
    expect([...comptes]).toEqual([
      ["2026-11", 2],
      ["2026-12", 1],
    ]);
  });

  it("lecture : la vue et la grille du mini-calendrier ; la liste lit les mois à venir à part", () => {
    expect(bornesLecture("semaine", "2026-11-05", AUJOURDHUI)).toEqual({ debut: "2026-10-26", fin: "2026-12-06" });
    expect(bornesLecture("semaine", "2026-12-30", AUJOURDHUI)).toEqual({ debut: "2026-11-30", fin: "2027-01-03" });
    expect(bornesLecture("mois", "2026-11-15", AUJOURDHUI)).toEqual({ debut: "2026-10-26", fin: "2026-12-06" });
    expect(bornesLecture("liste", AUJOURDHUI, AUJOURDHUI)).toEqual({ debut: "2026-10-26", fin: "2026-12-06" });
  });
});

describe("prochainRamassage (lundi 2 nov. 2026, 10 h à Toronto)", () => {
  const MAINTENANT = new Date("2026-11-02T15:00:00Z");
  const fini = ramassage({ id: "fini", jour: AUJOURDHUI, jourFin: AUJOURDHUI, debut: "2026-11-02T08:00:00-05:00", fin: "2026-11-02T09:00:00-05:00" });
  const enCours = ramassage({ id: "en-cours", jour: AUJOURDHUI, jourFin: AUJOURDHUI, debut: "2026-11-02T09:30:00-05:00", fin: "2026-11-02T11:00:00-05:00" });
  const demain = ramassage({ id: "demain", jour: "2026-11-03", jourFin: "2026-11-03", debut: "2026-11-03T10:00:00-05:00", fin: "2026-11-03T11:00:00-05:00" });
  const journee = ramassage({ id: "journee", journee: true, heureDebut: null, heureFin: null, jour: "2026-11-05", jourFin: "2026-11-05", debut: "2026-11-05", fin: "2026-11-06" });

  it("le premier pas fini, par début ; en cours s'il a commencé", () => {
    expect(prochainRamassage([demain, enCours, fini], MAINTENANT)).toEqual({ ramassage: enCours, enCours: true });
    expect(prochainRamassage([journee, demain, fini], MAINTENANT)).toEqual({ ramassage: demain, enCours: false });
  });

  it("toute la journée : jusqu'à la fin de son dernier jour ; aucun → null", () => {
    const hierAujourdhui = { ...journee, id: "deux-jours", jour: "2026-11-01", jourFin: "2026-11-02" };
    expect(prochainRamassage([demain, hierAujourdhui], MAINTENANT)).toEqual({ ramassage: hierAujourdhui, enCours: true });
    expect(prochainRamassage([{ ...journee, jour: "2026-11-01", jourFin: "2026-11-01" }], MAINTENANT)).toBeNull();
    expect(prochainRamassage([fini], MAINTENANT)).toBeNull();
    expect(prochainRamassage([], MAINTENANT)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Grille horaire                                                      */
/* ------------------------------------------------------------------ */

describe("grille horaire de la semaine", () => {
  it("minutes ↔ heures", () => {
    expect(minutesDe("09:30")).toBe(570);
    expect(minutesDe("00:00")).toBe(0);
    expect(heureDeMinutes(570)).toBe("09:30");
    expect(heureDeMinutes(-20)).toBe("00:00");
    expect(heureDeMinutes(24 * 60)).toBe("23:30");
  });

  it("nouveau ramassage à l'heure cliquée, une heure de durée", () => {
    expect(formulaireNouveau("2026-11-05", "14:30")).toMatchObject({ date: "2026-11-05", debut: "14:30", fin: "15:30" });
    expect(formulaireNouveau("2026-11-05", "23:30")).toMatchObject({ debut: "23:30", fin: "23:59" });
    expect(formulaireNouveau("2026-11-05", "n'importe")).toMatchObject({ debut: "09:00", fin: "10:00" });
  });

  it("dans la grille : à heure précise et sur une seule journée", () => {
    expect(dansGrille(ramassage())).toBe(true);
    expect(dansGrille(ramassage({ journee: true, heureDebut: null }))).toBe(false);
    expect(dansGrille(ramassage({ jourFin: "2026-11-06" }))).toBe(false);
  });

  it("heures montrées : 7 h à 19 h, élargies au besoin", () => {
    expect(plageHeures([])).toEqual({ debut: 7, fin: 19 });
    expect(plageHeures([ramassage({ heureDebut: "06:30", heureFin: "07:15" }), ramassage({ id: "b", heureDebut: "19:00", heureFin: "20:30" })])).toEqual({
      debut: 6,
      fin: 21,
    });
    // Une fin à minuit compte pour 24 h ; toute la journée ne compte pas
    expect(plageHeures([ramassage({ heureDebut: "22:00", heureFin: "00:00" }), ramassage({ id: "j", journee: true, heureDebut: null })])).toEqual({
      debut: 7,
      fin: 24,
    });
  });

  it("chevauchements : côte à côte ; sinon toute la largeur", () => {
    const a = ramassage({ id: "a", heureDebut: "09:00", heureFin: "10:00" });
    const b = ramassage({ id: "b", heureDebut: "09:30", heureFin: "10:30" });
    const c = ramassage({ id: "c", heureDebut: "10:00", heureFin: "11:00" });
    const d = ramassage({ id: "d", heureDebut: "14:00", heureFin: "14:00" });
    const blocs = dispositionJour([c, d, b, a]).map((x) => [x.ramassage.id, x.debut, x.fin, x.colonne, x.colonnes]);
    expect(blocs).toEqual([
      ["a", 540, 600, 0, 2],
      ["b", 570, 630, 1, 2],
      ["c", 600, 660, 0, 2],
      ["d", 840, 870, 0, 1],
    ]);
  });

  it("dispositionJour ignore les ramassages de la rangée « Journée »", () => {
    expect(dispositionJour([ramassage({ journee: true, heureDebut: null }), ramassage({ id: "long", jourFin: "2026-11-06" })])).toEqual([]);
  });

  it("itinéraire Google Maps", () => {
    expect(lienItineraire(" 12 rue X, Laval ")).toBe("https://www.google.com/maps/dir/?api=1&destination=12%20rue%20X%2C%20Laval");
  });
});
