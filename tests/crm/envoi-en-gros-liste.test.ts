import { describe, expect, it } from "vitest";
import { courriel } from "@/lib/securite/schemas";
import {
  analyserListe,
  courrielValide,
  MAX_DESTINATAIRES,
  MAX_LIGNES_UTILES,
  MAX_TEXTE_DESTINATAIRES,
  normaliserCourriel,
  problemeBloquant,
} from "@/lib/crm/envoi-en-gros";

/*
 * Envoi en gros — analyse de la liste (lib/crm/envoi-en-gros.ts), la même
 * dans le navigateur (résumé en direct) et sur le serveur (revalidation).
 */

const BOM = String.fromCharCode(0xfeff);
const emails = (texte: string) => analyserListe(texte).destinataires.map((d) => d.email);

describe("une adresse par ligne", () => {
  it("lit une adresse par ligne ; lignes vides ignorées, numéros de ligne conservés", () => {
    const a = analyserListe("jean@exemple.ca\n\n  marie@exemple.com  \r\nluc@exemple.org\n");
    expect(a.destinataires.map((d) => [d.email, d.ligne])).toEqual([
      ["jean@exemple.ca", 1],
      ["marie@exemple.com", 3],
      ["luc@exemple.org", 4],
    ]);
    expect(a.colonnes).toBeNull();
    expect(a.invalides).toEqual([]);
    expect(a.problemes).toEqual([]);
  });

  it("met les courriels en minuscules et retire les doublons sans tenir compte de la casse", () => {
    const a = analyserListe("Jean@Exemple.CA\nmarie@exemple.com\nJEAN@exemple.ca\n jean@exemple.ca ");
    expect(a.destinataires.map((d) => d.email)).toEqual(["jean@exemple.ca", "marie@exemple.com"]);
    expect(a.doublons).toEqual([
      { ligne: 3, email: "jean@exemple.ca", premiereLigne: 1 },
      { ligne: 4, email: "jean@exemple.ca", premiereLigne: 1 },
    ]);
  });

  it("liste simple : plusieurs adresses par ligne et « Nom <adresse> » d'Outlook", () => {
    expect(emails("Jean Tremblay <Jean@Exemple.ca>; Marie Roy <marie@exemple.com>")).toEqual([
      "jean@exemple.ca",
      "marie@exemple.com",
    ]);
    expect(emails("a@exemple.ca, b@exemple.ca; c@exemple.ca\nd@exemple.ca e@exemple.ca")).toEqual([
      "a@exemple.ca",
      "b@exemple.ca",
      "c@exemple.ca",
      "d@exemple.ca",
      "e@exemple.ca",
    ]);
    expect(emails("mailto:Jean@Exemple.ca")).toEqual(["jean@exemple.ca"]);
  });

  it("lignes invalides rapportées avec leur numéro", () => {
    const a = analyserListe(
      "bon@exemple.ca\npas-un-courriel\njean@\n@exemple.ca\njean tremblay@exemple.ca\njean@exemple\nok@exemple.qc.ca",
    );
    expect(a.destinataires.map((d) => d.email)).toEqual(["bon@exemple.ca", "ok@exemple.qc.ca"]);
    expect(a.invalides).toEqual([
      { ligne: 2, valeur: "pas-un-courriel" },
      { ligne: 3, valeur: "jean@" },
      { ligne: 4, valeur: "@exemple.ca" },
      { ligne: 5, valeur: "jean tremblay@exemple.ca" },
      { ligne: 6, valeur: "jean@exemple" },
    ]);
  });

  it("caractères invisibles en bordure retirés (copier-coller du web)", () => {
    const zeroLargeur = String.fromCharCode(0x200b);
    expect(emails(`${zeroLargeur}jean@exemple.ca${zeroLargeur}`)).toEqual(["jean@exemple.ca"]);
  });
});

describe("CSV exporté d'Excel", () => {
  it("point-virgule, en-tête accentué et BOM UTF-8 (Excel en français)", () => {
    const csv = `${BOM}Prénom;Nom;Courriel;Entreprise;Titre\r\nÉric;Tremblay;eric@acme.ca;Acme inc.;Directeur TI\r\nJulie;Roy;JULIE@ACME.CA;Acme inc.;\r\n`;
    const a = analyserListe(csv);
    expect(a.separateur).toBe(";");
    expect(a.colonnes).toEqual({ email: 2, prenom: 0, nom: 1, compagnie: 3, titre: 4 });
    expect(a.destinataires).toEqual([
      { email: "eric@acme.ca", ligne: 2, prenom: "Éric", nom: "Tremblay", compagnie: "Acme inc.", titre: "Directeur TI" },
      { email: "julie@acme.ca", ligne: 3, prenom: "Julie", nom: "Roy", compagnie: "Acme inc.", titre: null },
    ]);
    expect(a.problemes).toEqual([]);
  });

  it("virgule et guillemets : séparateur et guillemet doublé dans un champ, saut de ligne entre guillemets", () => {
    const csv = [
      "email,prenom,compagnie,titre",
      '"jean@exemple.ca","Jean","Tremblay, Fils et associés","Directeur ""TI"""',
      'marie@exemple.ca,Marie,"Roy',
      'inc.",Présidente',
      "luc@exemple.ca,Luc,,",
    ].join("\n");
    const a = analyserListe(csv);
    expect(a.separateur).toBe(",");
    expect(a.destinataires[0]).toMatchObject({
      email: "jean@exemple.ca",
      ligne: 2,
      prenom: "Jean",
      compagnie: "Tremblay, Fils et associés",
      titre: 'Directeur "TI"',
    });
    // Le saut de ligne entre guillemets devient une espace ; les numéros suivent les vraies lignes.
    expect(a.destinataires[1]).toMatchObject({ email: "marie@exemple.ca", ligne: 3, compagnie: "Roy inc.", titre: "Présidente" });
    expect(a.destinataires[2]).toMatchObject({ email: "luc@exemple.ca", ligne: 5, compagnie: null, titre: null });
  });

  it("tabulation (copier-coller d'Excel), en-tête en anglais et en majuscules", () => {
    const a = analyserListe("FIRST NAME\tLAST NAME\tE-MAIL\tCOMPANY\tJOB TITLE\nJean\tTremblay\tjean@exemple.ca\tAcme\tCTO");
    expect(a.separateur).toBe("\t");
    expect(a.colonnes).toEqual({ email: 2, prenom: 0, nom: 1, compagnie: 3, titre: 4 });
    expect(a.destinataires[0]).toMatchObject({ email: "jean@exemple.ca", prenom: "Jean", nom: "Tremblay", compagnie: "Acme", titre: "CTO" });
  });

  it("ligne « sep=; » d'Excel : séparateur imposé, numéros de ligne conservés", () => {
    const a = analyserListe('sep=;\nCourriel;Nom\njean@exemple.ca;"Tremblay, Jean"');
    expect(a.separateur).toBe(";");
    expect(a.destinataires).toEqual([
      { email: "jean@exemple.ca", ligne: 3, prenom: null, nom: "Tremblay, Jean", compagnie: null, titre: null },
    ]);
  });

  it("sans en-tête : la colonne qui contient des @ (le reste est ignoré)", () => {
    const a = analyserListe("Jean;jean@exemple.ca;Acme\nMarie;marie@exemple.ca;Beta\nLuc;pas-valide;Gamma");
    expect(a.colonnes).toBeNull();
    expect(a.destinataires.map((d) => [d.email, d.prenom, d.compagnie])).toEqual([
      ["jean@exemple.ca", null, null],
      ["marie@exemple.ca", null, null],
    ]);
    expect(a.invalides).toEqual([{ ligne: 3, valeur: "pas-valide" }]);
  });

  it("en-tête sans colonne de courriel nommée : la colonne des @", () => {
    const a = analyserListe("Prénom;Adresse web;Compagnie\nJean;jean@exemple.ca;Acme");
    expect(a.colonnes).toEqual({ prenom: 0, compagnie: 2 });
    expect(a.destinataires[0]).toMatchObject({ email: "jean@exemple.ca", prenom: "Jean", compagnie: "Acme" });
  });

  it("« Fonction » passe avant « Titre » (civilité d'un export Outlook) ; « Société » = compagnie", () => {
    const a = analyserListe("Titre;Prénom;Nom;Société;Fonction;Adresse de messagerie\nM.;Jean;Tremblay;Acme;Directeur TI;jean@exemple.ca");
    expect(a.colonnes).toEqual({ email: 5, prenom: 1, nom: 2, compagnie: 3, titre: 4 });
    expect(a.destinataires[0].titre).toBe("Directeur TI");
  });

  it("courriel vide dans une ligne du CSV : ligne invalide", () => {
    const a = analyserListe("Courriel;Prénom\njean@exemple.ca;Jean\n;Marie");
    expect(a.destinataires).toHaveLength(1);
    expect(a.invalides).toEqual([{ ligne: 3, valeur: "(vide)" }]);
  });

  it("guillemet jamais refermé : la liste est relue sans guillemets (aucune ligne avalée)", () => {
    expect(emails('Courriel;Nom\njean@exemple.ca;"Tremblay\nmarie@exemple.ca;Roy')).toEqual([
      "jean@exemple.ca",
      "marie@exemple.ca",
    ]);
  });

  it("valeurs reprises sur une ligne et bornées (elles peuvent aller dans l'objet)", () => {
    const tab = String.fromCharCode(9);
    const a = analyserListe(`Courriel,Prénom,Compagnie\njean@exemple.ca,"Jean${tab}\n  Paul","${"x".repeat(300)}"`);
    expect(a.destinataires[0].prenom).toBe("Jean Paul");
    expect(a.destinataires[0].compagnie).toHaveLength(200);
  });
});

describe("limites et problèmes bloquants", () => {
  const liste = (n: number) => Array.from({ length: n }, (_, i) => `contact${i}@exemple.ca`).join("\n");

  it(`exactement ${MAX_DESTINATAIRES} adresses : acceptée`, () => {
    const a = analyserListe(liste(MAX_DESTINATAIRES));
    expect(a.destinataires).toHaveLength(MAX_DESTINATAIRES);
    expect(problemeBloquant(a)).toBeNull();
  });

  it(`plus de ${MAX_DESTINATAIRES} adresses valides : message clair demandant de découper la liste`, () => {
    const a = analyserListe(liste(MAX_DESTINATAIRES + 1));
    expect(a.problemes).toEqual(["trop_de_destinataires"]);
    expect(problemeBloquant(a)).toMatch(/501 adresses valides : 500 au plus par envoi\. Découpe-la/);
  });

  it(`plus de ${MAX_LIGNES_UTILES} lignes utiles`, () => {
    const texte = Array.from({ length: MAX_LIGNES_UTILES + 1 }, () => "pas-un-courriel").join("\n");
    const a = analyserListe(texte);
    expect(a.lignesUtiles).toBe(MAX_LIGNES_UTILES + 1);
    expect(a.problemes).toContain("trop_de_lignes");
  });

  it("plus de 100 000 caractères : refusée (analyse bornée)", () => {
    const a = analyserListe("a".repeat(MAX_TEXTE_DESTINATAIRES + 1));
    expect(a.problemes[0]).toBe("trop_long");
    expect(problemeBloquant(a)).toMatch(/dépasse 100\s000 caractères/);
  });

  it("vide, ou aucune adresse valide", () => {
    expect(analyserListe(" \n\n ").problemes).toEqual(["vide"]);
    expect(analyserListe("Courriel;Nom").problemes).toEqual(["vide"]);
    expect(analyserListe("jean@\nmarie").problemes).toEqual(["aucun_valide"]);
  });
});

describe("courrielValide : même règle que la validation du serveur (Zod)", () => {
  it("accord avec `courriel` (lib/securite/schemas.ts) sur des cas limites", () => {
    const cas = [
      "jean@exemple.ca",
      "Jean.Tremblay+promo@Exemple.QC.CA",
      "o'neil@exemple.com",
      "j_e-a+n@sous.domaine.exemple.ca",
      "a@b.co",
      "jean..t@exemple.ca",
      ".jean@exemple.ca",
      "jean.@exemple.ca",
      "jean@exemple",
      "jean@-exemple.ca",
      "jean@exemple.c",
      "jean@exemple..ca",
      "jean@exemple.ca.",
      "andré@exemple.ca",
      "a b@exemple.ca",
      "jean@exemple.ca,marie@exemple.ca",
      `${"x".repeat(250)}@e.ca`,
    ];
    for (const c of cas) {
      expect(courrielValide(normaliserCourriel(c)), c).toBe(courriel.safeParse(c).success);
    }
  });
});
