import { describe, expect, it, vi } from "vitest";

// email.ts (ré-export du moteur) importe Resend : jamais de réseau ici.
vi.mock("resend", () => ({ Resend: class {} }));

import { renderTemplate as renderTemplateCrm } from "@/lib/crm/email";
import {
  aEnvoyerAujourdhui,
  cleCompagnie,
  debutJourUtc,
  decouperEnLots,
  formaterNombre,
  messageReserve,
  nombreDeLots,
  normaliserObjet,
  planifierEnvoi,
  quotaDuJour,
  renderTemplate,
  variablesDestinataire,
  type ContactConnu,
  type Destinataire,
} from "@/lib/crm/envoi-en-gros";

/*
 * Envoi en gros — découpage en lots, rendu des variables et replis, plan
 * d'envoi (exclusion des désabonnés et des adresses qui ont déjà reçu l'objet).
 */

const dest = (email: string, champs: Partial<Destinataire> = {}): Destinataire => ({
  email,
  ligne: 1,
  prenom: null,
  nom: null,
  compagnie: null,
  titre: null,
  ...champs,
});

const contact = (email: string, champs: Partial<ContactConnu> = {}): ContactConnu => ({
  id: `id-${email}`,
  email,
  first_name: null,
  last_name: null,
  title: null,
  stage: "new",
  company_id: null,
  unsubscribed_at: null,
  compagnie: null,
  ...champs,
});

describe("découpage en lots de 100", () => {
  it("tranches de 100 au plus, dans l'ordre", () => {
    const n = (k: number) => Array.from({ length: k }, (_, i) => i);
    expect(decouperEnLots([])).toEqual([]);
    expect(decouperEnLots(n(100)).map((l) => l.length)).toEqual([100]);
    expect(decouperEnLots(n(101)).map((l) => l.length)).toEqual([100, 1]);
    expect(decouperEnLots(n(250)).map((l) => l.length)).toEqual([100, 100, 50]);
    expect(decouperEnLots(n(500)).map((l) => l.length)).toEqual([100, 100, 100, 100, 100]);
    expect(decouperEnLots(n(250)).flat()).toEqual(n(250));
    expect(decouperEnLots(n(5), 2)).toEqual([[0, 1], [2, 3], [4]]);
  });

  it("taille invalide refusée ; nombre de lots", () => {
    expect(() => decouperEnLots([1], 0)).toThrow(RangeError);
    expect([0, 1, 100, 101, 500].map((k) => nombreDeLots(k))).toEqual([0, 1, 1, 2, 5]);
  });
});

describe("rendu des variables (même moteur que le CRM)", () => {
  const vars = { prenom: "Jean", nom: "Tremblay", compagnie: "Acme", titre: "DG" };

  it("remplace les quatre variables, espaces tolérés, alias {{entreprise}} ; inconnue laissée telle quelle", () => {
    expect(renderTemplate("Bonjour {{prenom}} {{ nom }}, {{titre}} chez {{compagnie}} ({{entreprise}}) {{autre}}", vars)).toBe(
      "Bonjour Jean Tremblay, DG chez Acme (Acme) {{autre}}",
    );
    expect(renderTemplate("{{PRENOM}}", vars)).toBe("Jean");
  });

  it("lib/crm/email.ts ré-exporte la même fonction (envoi manuel et relances inchangés)", () => {
    expect(renderTemplateCrm).toBe(renderTemplate);
  });

  it("replis : valeur de la liste, sinon fiche du CRM, sinon ceux de l'envoi manuel", () => {
    expect(variablesDestinataire(dest("a@exemple.ca"), null)).toEqual({
      prenom: "bonjour",
      nom: "",
      compagnie: "votre entreprise",
      titre: "",
    });
    const fiche = contact("a@exemple.ca", { first_name: " Marie ", last_name: "Roy", title: "CTO", compagnie: "Beta inc." });
    expect(variablesDestinataire(dest("a@exemple.ca"), fiche)).toEqual({
      prenom: "Marie",
      nom: "Roy",
      compagnie: "Beta inc.",
      titre: "CTO",
    });
    expect(
      variablesDestinataire(dest("a@exemple.ca", { prenom: "Mimi", compagnie: "Gamma", titre: "VP" }), fiche),
    ).toEqual({ prenom: "Mimi", nom: "Roy", compagnie: "Gamma", titre: "VP" });
    // Fiche sans compagnie liée : « votre entreprise ».
    expect(variablesDestinataire(dest("a@exemple.ca"), contact("a@exemple.ca", { first_name: "Luc" })).compagnie).toBe(
      "votre entreprise",
    );
  });
});

describe("plan d'envoi : exclusions et rendu", () => {
  const base = {
    contacts: new Map<string, ContactConnu>(),
    desabonnes: new Set<string>(),
    objetsRecus: new Map<string, Set<string>>(),
    objet: "Offre Techno Lot",
    corps: "Bonjour {{prenom}} de {{compagnie}}",
  };

  it("garde l'ordre de la liste et rend l'objet et le corps de chaque courriel", () => {
    const plan = planifierEnvoi({
      ...base,
      destinataires: [dest("b@exemple.ca", { prenom: "Bob" }), dest("a@exemple.ca")],
    });
    expect(plan.prets.map((c) => [c.destinataire.email, c.objet, c.corps, c.contact])).toEqual([
      ["b@exemple.ca", "Offre Techno Lot", "Bonjour Bob de votre entreprise", null],
      ["a@exemple.ca", "Offre Techno Lot", "Bonjour bonjour de votre entreprise", null],
    ]);
    expect(plan.desabonnes).toEqual([]);
    expect(plan.dejaRecus).toEqual([]);
  });

  it("exclut les désabonnés : adresse désabonnée sur une autre fiche, ou fiche marquée", () => {
    const plan = planifierEnvoi({
      ...base,
      destinataires: [dest("autre-fiche@exemple.ca"), dest("marque@exemple.ca"), dest("ok@exemple.ca")],
      desabonnes: new Set(["autre-fiche@exemple.ca"]),
      contacts: new Map([["marque@exemple.ca", contact("marque@exemple.ca", { unsubscribed_at: "2026-10-01T00:00:00Z" })]]),
    });
    expect(plan.desabonnes.map((d) => d.email)).toEqual(["autre-fiche@exemple.ca", "marque@exemple.ca"]);
    expect(plan.prets.map((c) => c.destinataire.email)).toEqual(["ok@exemple.ca"]);
  });

  it("exclut qui a déjà reçu cet objet par l'envoi en gros (casse et espaces ignorés), pas un autre objet", () => {
    const plan = planifierEnvoi({
      ...base,
      destinataires: [dest("deja@exemple.ca"), dest("autre-objet@exemple.ca")],
      objetsRecus: new Map([
        ["deja@exemple.ca", new Set([normaliserObjet("  OFFRE   techno lot ")])],
        ["autre-objet@exemple.ca", new Set([normaliserObjet("Un autre envoi")])],
      ]),
    });
    expect(plan.dejaRecus.map((d) => d.email)).toEqual(["deja@exemple.ca"]);
    expect(plan.prets.map((c) => c.destinataire.email)).toEqual(["autre-objet@exemple.ca"]);
  });

  it("objet avec variables : comparé tel que rendu pour chaque destinataire", () => {
    const plan = planifierEnvoi({
      ...base,
      objet: "{{prenom}}, une offre pour {{compagnie}}",
      destinataires: [dest("jean@exemple.ca", { prenom: "Jean", compagnie: "Acme" }), dest("marie@exemple.ca", { prenom: "Marie" })],
      objetsRecus: new Map([
        ["jean@exemple.ca", new Set([normaliserObjet("Jean, une offre pour Acme")])],
        ["marie@exemple.ca", new Set([normaliserObjet("Jean, une offre pour Acme")])],
      ]),
    });
    expect(plan.dejaRecus.map((d) => d.email)).toEqual(["jean@exemple.ca"]);
    expect(plan.prets.map((c) => c.objet)).toEqual(["Marie, une offre pour votre entreprise"]);
  });

  it("l'objet rendu reste sur une ligne, même si une fiche du CRM contient un saut de ligne", () => {
    const plan = planifierEnvoi({
      ...base,
      objet: "Pour {{prenom}}",
      destinataires: [dest("a@exemple.ca")],
      contacts: new Map([["a@exemple.ca", contact("a@exemple.ca", { first_name: "Jean\r\nBcc: x@y.z" })]]),
    });
    expect(plan.prets[0].objet).toBe("Pour Jean Bcc: x@y.z");
    expect(plan.prets[0].contact?.id).toBe("id-a@exemple.ca");
  });
});

describe("petits utilitaires", () => {
  it("clé de compagnie sans casse ni espaces en trop ; nombres à la française", () => {
    expect(cleCompagnie("  Acme   INC. ")).toBe("acme inc.");
    expect(formaterNombre(10_000)).toBe(`10${String.fromCharCode(0xa0)}000`);
    expect(formaterNombre(500)).toBe("500");
  });
});

describe("quota du jour (forfait gratuit de Resend)", () => {
  it("un par envoi en gros, deux par courriel du CRM, un par avis de soumission ; réserve de 20 déduite", () => {
    expect(quotaDuJour({ enGros: 10, crm: 5, soumissions: 3 })).toEqual({
      utilises: 23,
      disponibles: 57,
      quota: 100,
      reserve: 20,
    });
    expect(quotaDuJour({ enGros: 0, crm: 0, soumissions: 0 }).disponibles).toBe(80);
  });

  it("jamais négatif, même au-delà du quota", () => {
    expect(quotaDuJour({ enGros: 70, crm: 10, soumissions: 5 }).disponibles).toBe(0);
  });

  it("part du jour : les prêts, dans la limite du disponible", () => {
    const quota = quotaDuJour({ enGros: 50, crm: 0, soumissions: 0 }); // 30 disponibles
    expect(aEnvoyerAujourdhui(10, quota)).toBe(10);
    expect(aEnvoyerAujourdhui(150, quota)).toBe(30);
    expect(aEnvoyerAujourdhui(0, quota)).toBe(0);
    expect(messageReserve(quota)).toMatch(/80 courriels par jour au plus, pour garder 20 envois/);
  });

  it("jour civil UTC : 23 h 30 à Montréal le 30 octobre = déjà le 31 en UTC", () => {
    expect(debutJourUtc(new Date("2026-10-30T23:30:00-04:00"))).toBe("2026-10-31T00:00:00.000Z");
    expect(debutJourUtc(new Date("2026-10-30T12:00:00Z"))).toBe("2026-10-30T00:00:00.000Z");
  });
});
