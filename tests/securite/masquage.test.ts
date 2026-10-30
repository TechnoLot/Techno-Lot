import { describe, expect, it } from "vitest";
import { luhnValide, masquerDonneesSensibles, MENTION_CARTE, MENTION_NAS } from "@/lib/securite/masquage";

describe("luhnValide", () => {
  it("reconnaît une carte de test Visa", () => {
    expect(luhnValide("4111111111111111")).toBe(true);
  });

  it("refuse une suite qui ne passe pas la clé", () => {
    expect(luhnValide("4111111111111112")).toBe(false);
  });

  it("refuse tout ce qui n'est pas un chiffre", () => {
    expect(luhnValide("4111-1111")).toBe(false);
    expect(luhnValide("")).toBe(false);
  });
});

describe("masquerDonneesSensibles — cartes", () => {
  it("masque une carte écrite par groupes de 4", () => {
    const r = masquerDonneesSensibles("Payé avec la carte 4111 1111 1111 1111 hier.");
    expect(r.texte).toBe(`Payé avec la carte ${MENTION_CARTE} hier.`);
    expect(r.masques).toBe(1);
  });

  it("masque une carte avec tirets ou collée", () => {
    expect(masquerDonneesSensibles("5555-5555-5555-4444").texte).toBe(MENTION_CARTE);
    expect(masquerDonneesSensibles("carte 378282246310005 (Amex)").texte).toBe(`carte ${MENTION_CARTE} (Amex)`);
  });

  it("laisse une longue suite qui ne passe pas la clé de Luhn", () => {
    const texte = "Commande 1234 5678 9012 3456";
    expect(masquerDonneesSensibles(texte)).toEqual({ texte, masques: 0 });
  });
});

describe("masquerDonneesSensibles — NAS", () => {
  it("masque un NAS écrit 3-3-3", () => {
    const r = masquerDonneesSensibles("NAS 046 454 286, merci");
    expect(r.texte).toBe(`NAS ${MENTION_NAS}, merci`);
    expect(r.masques).toBe(1);
  });

  it("masque 9 chiffres collés annoncés comme NAS, même avec une faute de frappe", () => {
    expect(masquerDonneesSensibles("Mon numéro d'assurance sociale : 123456789").texte).toBe(
      `Mon numéro d'assurance sociale : ${MENTION_NAS}`,
    );
    expect(masquerDonneesSensibles("SIN #046454286").texte).toBe(`SIN #${MENTION_NAS}`);
  });
});

describe("masquerDonneesSensibles — ce qui reste intact", () => {
  it("garde téléphones, montants, dates, codes postaux et numéros de commande", () => {
    const texte =
      "Appelez au 514 555-1234 ou 1-450-555-0199. Total : 1 234,56 $ le 2026-10-30. " +
      "J7K 3C6. Commande eBay 08-12345-67890. Facture 123456789.";
    expect(masquerDonneesSensibles(texte)).toEqual({ texte, masques: 0 });
  });

  it("compte chaque remplacement", () => {
    const r = masquerDonneesSensibles("4111 1111 1111 1111 et NAS 046 454 286");
    expect(r.masques).toBe(2);
    expect(r.texte).toBe(`${MENTION_CARTE} et NAS ${MENTION_NAS}`);
  });
});
