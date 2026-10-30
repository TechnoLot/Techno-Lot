import { describe, expect, it } from "vitest";
import {
  activiteSchema,
  analyseCourrielSchema,
  compagnieSchema,
  contactSchema,
  devisSchema,
  importEbaySchema,
  lotEnregistreSchema,
  lotSchema,
  modeleSchema,
  nouveauContactSchema,
  statutLeadSchema,
  synchroEbaySchema,
  synchroPubsSchema,
  uuid,
} from "@/lib/admin/schemas";
import { champsEnErreur, echecValidation } from "@/lib/admin/erreurs-admin";
import { messageErreurApi } from "@/lib/admin/message-erreur";

const ID = "11111111-2222-4333-8444-555555555555";
const LONG = "a".repeat(100_000);

const lot = {
  client_name: "Entreprise ABC",
  client_email: "Client@Exemple.CA",
  client_phone: "514-555-1234",
  purchase_price: 1234.567,
  sale_price: null,
  status: "purchased",
  purchased_at: "2026-10-30",
  sold_at: "",
  description: "  Lot de portables  ",
  notes: "",
  source: "manual",
  soumission_id: null,
};

describe("lotSchema (createLot / updateLot)", () => {
  it("accepte un lot valide, normalise et arrondit au cent", () => {
    const r = lotSchema.safeParse(lot);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.purchase_price).toBe(1234.57);
    expect(r.data.client_email).toBe("client@exemple.ca");
    expect(r.data.sold_at).toBeNull();
    expect(r.data.notes).toBeNull();
    expect(r.data.description).toBe("Lot de portables");
  });

  it("refuse un prix négatif", () => {
    expect(lotSchema.safeParse({ ...lot, purchase_price: -3 }).success).toBe(false);
    expect(lotSchema.safeParse({ ...lot, sale_price: -0.01 }).success).toBe(false);
  });

  it("refuse un prix en chaîne (« -3 »), infini ou démesuré", () => {
    expect(lotSchema.safeParse({ ...lot, purchase_price: "-3" }).success).toBe(false);
    expect(lotSchema.safeParse({ ...lot, purchase_price: Number.POSITIVE_INFINITY }).success).toBe(false);
    expect(lotSchema.safeParse({ ...lot, purchase_price: 1e12 }).success).toBe(false);
  });

  it("refuse une chaîne de 100 000 caractères", () => {
    expect(lotSchema.safeParse({ ...lot, client_name: LONG }).success).toBe(false);
    expect(lotSchema.safeParse({ ...lot, notes: LONG }).success).toBe(false);
  });

  it("refuse un mauvais type", () => {
    expect(lotSchema.safeParse({ ...lot, client_name: 42 }).success).toBe(false);
    expect(lotSchema.safeParse({ ...lot, client_name: { $ne: null } }).success).toBe(false);
  });

  it("refuse un champ en trop (role, created_by, id)", () => {
    for (const extra of [{ role: "admin" }, { created_by: ID }, { id: ID }]) {
      const r = lotSchema.safeParse({ ...lot, ...extra });
      expect(r.success).toBe(false);
      if (!r.success) expect(Object.keys(champsEnErreur(r.error))).toContain(Object.keys(extra)[0]);
    }
  });

  it("refuse un statut, une source ou une date hors liste", () => {
    expect(lotSchema.safeParse({ ...lot, status: "gratuit" }).success).toBe(false);
    expect(lotSchema.safeParse({ ...lot, source: "pirate" }).success).toBe(false);
    expect(lotSchema.safeParse({ ...lot, purchased_at: "2026-02-30" }).success).toBe(false);
    expect(lotSchema.safeParse({ ...lot, purchased_at: "30/10/2026" }).success).toBe(false);
  });

  it("refuse une soumission_id qui n'est pas un UUID", () => {
    expect(lotSchema.safeParse({ ...lot, soumission_id: "1 or 1=1" }).success).toBe(false);
  });

  it("echecValidation : message français et champs", () => {
    const r = lotSchema.safeParse({ ...lot, purchase_price: -3, role: "admin" });
    expect(r.success).toBe(false);
    if (r.success) return;
    const e = echecValidation(r.error, { purchase_price: "Prix d'achat" });
    expect(e.ok).toBe(false);
    expect(e.error).toMatch(/^Données invalides/);
    expect(e.champs?.purchase_price).toMatch(/négatif/);
    expect(e.champs?.role).toBe("Champ non permis.");
  });
});

describe("schémas du CRM", () => {
  it("LinkedIn : javascript:, data: et // refusés ; https gardé", () => {
    for (const mauvais of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "//evil.example", "mailto:a@b.c"]) {
      expect(contactSchema.safeParse({ linkedin_url: mauvais }).success, mauvais).toBe(false);
    }
    const r = contactSchema.safeParse({ linkedin_url: "linkedin.com/in/x" });
    expect(r.success && r.data.linkedin_url).toBe("https://linkedin.com/in/x");
  });

  it("site web de la compagnie : javascript: refusé", () => {
    expect(compagnieSchema.safeParse({ name: "X", domain: "javascript:alert(1)" }).success).toBe(false);
    expect(compagnieSchema.safeParse({ name: "X", domain: "exemple.ca" }).success).toBe(true);
  });

  it("contact : courriel invalide, champ en trop, chaîne énorme refusés ; vides → null", () => {
    expect(contactSchema.safeParse({ email: "pas-un-courriel" }).success).toBe(false);
    expect(contactSchema.safeParse({ role: "admin" }).success).toBe(false);
    expect(contactSchema.safeParse({ notes: LONG }).success).toBe(false);
    const r = contactSchema.safeParse({ first_name: "", email: "", phone: "  " });
    expect(r.success).toBe(true);
    if (r.success) expect([r.data.first_name, r.data.email, r.data.phone]).toEqual([null, null, null]);
  });

  it("nouveau contact : company_id doit être un UUID", () => {
    expect(nouveauContactSchema.safeParse({ company_id: "x" }).success).toBe(false);
    expect(nouveauContactSchema.safeParse({ company_id: ID }).success).toBe(true);
  });

  it("compagnie : score borné 1-10, employés entiers positifs", () => {
    const r = compagnieSchema.safeParse({ name: "X", fit_score: 42 });
    expect(r.success && r.data.fit_score).toBe(10);
    expect(compagnieSchema.safeParse({ name: "X", employee_count: -1 }).success).toBe(false);
    expect(compagnieSchema.safeParse({ name: "X", employee_count: 1.5 }).success).toBe(false);
    expect(compagnieSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("énumérations et activité", () => {
    expect(statutLeadSchema.safeParse("interested").success).toBe(true);
    expect(statutLeadSchema.safeParse("admin").success).toBe(false);
    expect(activiteSchema.safeParse({ contact_id: ID, activity_type: "intro_email_sent" }).success).toBe(false);
    expect(activiteSchema.safeParse({ contact_id: ID, activity_type: "call_logged", outcome: LONG }).success).toBe(false);
  });

  it("modèle de courriel : longueurs bornées, booléen exigé", () => {
    expect(modeleSchema.safeParse({ subject: "S", body: "B", is_active: true }).success).toBe(true);
    expect(modeleSchema.safeParse({ subject: "S", body: LONG, is_active: true }).success).toBe(false);
    expect(modeleSchema.safeParse({ subject: "S", body: "B", is_active: "oui" }).success).toBe(false);
  });

  it("uuid : refuse l'injection, normalise en minuscules", () => {
    expect(uuid.safeParse("1 or 1=1").success).toBe(false);
    expect(uuid.safeParse(ID.toUpperCase()).data).toBe(ID);
  });
});

describe("calculatrice", () => {
  const donnees = {
    nom: "Lot test",
    date: "2026-10-30",
    usd: false,
    taux: 1.37,
    items: [{ desc: "Dell OptiPlex", qte: 3, cat: "PC", bas: 120, moyen: null }],
  };

  it("lot enregistré : accepte la forme de la calculatrice", () => {
    expect(lotEnregistreSchema.safeParse({ name: "Lot test", data: donnees }).success).toBe(true);
  });

  it("lot enregistré : nom trop long, champ en trop, prix négatif refusés", () => {
    expect(lotEnregistreSchema.safeParse({ name: "x".repeat(121), data: donnees }).success).toBe(false);
    expect(lotEnregistreSchema.safeParse({ name: "x", data: donnees, role: "admin" }).success).toBe(false);
    expect(lotEnregistreSchema.safeParse({ name: "x", data: { ...donnees, items: [{ desc: "a", qte: 1, bas: -1 }] } }).success).toBe(false);
    expect(lotEnregistreSchema.safeParse({ name: "x", data: { ...donnees, items: [{ desc: LONG, qte: 1 }] } }).success).toBe(false);
  });

  it("devis : nom du lot sur une ligne (sauts de ligne retirés), message borné", () => {
    const r = devisSchema.safeParse({ to: "a@b.ca", message: "Bonjour", nomLot: "Lot\r\nBcc: x@y.z fin" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nomLot).toBe("Lot Bcc: x@y.z fin");
    expect(devisSchema.safeParse({ to: "a@b.ca", message: "x".repeat(10_001) }).success).toBe(false);
    expect(devisSchema.safeParse({ to: "a@b.ca", message: "x", nomLot: "n".repeat(121) }).success).toBe(false);
    expect(devisSchema.safeParse({ to: "pas un courriel", message: "x" }).success).toBe(false);
    expect(devisSchema.safeParse({ to: "a@b.ca", message: "   " }).success).toBe(false);
  });
});

describe("IA, import eBay, synchros", () => {
  it("courriel à analyser : 20 à 50 000 caractères", () => {
    expect(analyseCourrielSchema.safeParse({ email: "court" }).success).toBe(false);
    expect(analyseCourrielSchema.safeParse({ email: "x".repeat(50_001) }).success).toBe(false);
    expect(analyseCourrielSchema.safeParse({ email: "x".repeat(100) }).success).toBe(true);
  });

  it("import eBay : ramené à 60 000, borné à 200 000", () => {
    const r = importEbaySchema.safeParse({ text: "y".repeat(100_000) });
    expect(r.success && r.data.text.length).toBe(60_000);
    expect(importEbaySchema.safeParse({ text: "y".repeat(200_001) }).success).toBe(false);
  });

  it("synchros : bornes et champs inconnus", () => {
    expect(synchroPubsSchema.safeParse({ days: 400 }).success).toBe(false);
    expect(synchroPubsSchema.safeParse({ days: 30, auto: false }).success).toBe(true);
    expect(synchroPubsSchema.safeParse({}).success).toBe(true);
    expect(synchroEbaySchema.safeParse({ auto: "oui" }).success).toBe(false);
    expect(synchroEbaySchema.safeParse({ auto: true, role: "admin" }).success).toBe(false);
  });
});

describe("messageErreurApi (affichage côté navigateur)", () => {
  it("message générique + référence, jamais de détail inventé", () => {
    expect(messageErreurApi({ error: "Lecture impossible.", ref: "abc" }, 500)).toBe("Lecture impossible. (réf. abc)");
    expect(messageErreurApi({}, 502)).toBe("Erreur 502.");
    expect(messageErreurApi(null, 401)).toBe("Erreur 401.");
    expect(messageErreurApi({ error: "Échec (réf. abc)", ref: "abc" }, 500)).toBe("Échec (réf. abc)");
  });
});
