import { z } from "zod";
import { courriel, dateIso, montant, telephone, texte, urlHttps, uuid } from "@/lib/securite/schemas";
import {
  MAX_CORPS,
  MAX_DESTINATAIRES,
  MAX_OBJET,
  MAX_TEXTE_DESTINATAIRES,
} from "@/lib/crm/envoi-en-gros";

/**
 * Schémas de validation serveur de l'admin (check 06) : lots, CRM,
 * calculatrice, analyse de courriel et import eBay.
 *
 * Validés EN TÊTE de chaque action serveur ou route, avant toute lecture ou
 * écriture en base. Objets stricts : un champ inconnu (ex. `role`) est refusé.
 * Chaque chaîne a une longueur maximale, chaque nombre des bornes.
 * Sans `"use client"` ni `server-only` : partageable, mais seule la validation
 * du serveur compte.
 */

/** Chaîne vide, espaces, null ou absent → null (champs facultatifs des formulaires). */
function versNull(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

/** Champ facultatif : vide → null, sinon validé par `schema`. */
export function facultatif<T extends z.ZodType>(schema: T) {
  return z.preprocess(versNull, schema.nullable());
}

/** Texte facultatif nettoyé, `max` caractères au plus. */
export function texteFacultatif(max: number) {
  return facultatif(z.string().trim().max(max));
}

export { uuid };

// --- Lots -----------------------------------------------------------------------

export const STATUTS_LOT = ["negotiating", "purchased", "sold", "cancelled"] as const;
export const SOURCES_LOT = ["manual", "email", "form"] as const;

/**
 * Données d'un lot (createLot / updateLot). `source` et `soumission_id` ne
 * sont que des indications : le serveur décide (`sourceDuLot`).
 */
export const lotSchema = z.strictObject({
  client_name: texte(1, 160),
  client_email: facultatif(courriel),
  client_phone: facultatif(telephone),
  purchase_price: montant,
  sale_price: facultatif(montant),
  status: z.enum(STATUTS_LOT),
  purchased_at: dateIso,
  sold_at: facultatif(dateIso),
  description: texteFacultatif(10_000),
  notes: texteFacultatif(10_000),
  source: z.enum(SOURCES_LOT).optional(),
  soumission_id: facultatif(uuid),
});
export type LotValide = z.infer<typeof lotSchema>;

export const LIBELLES_LOT: Record<string, string> = {
  client_name: "Nom du client",
  client_email: "Courriel",
  client_phone: "Téléphone",
  purchase_price: "Prix d'achat",
  sale_price: "Prix de vente",
  status: "Statut",
  purchased_at: "Date d'achat",
  sold_at: "Date de vente",
  description: "Description",
  notes: "Notes",
  source: "Source",
  soumission_id: "Soumission",
};

// --- CRM ------------------------------------------------------------------------

export const STATUTS_LEAD = ["not_contacted", "contacted", "interested", "not_interested"] as const;
export const ETAPES_CONTACT = [
  "new",
  "contacted",
  "call_booked",
  "call_done",
  "sequence_active",
  "converted",
  "lost",
] as const;
export const TYPES_MODELE = [
  "post_call_intro",
  "cold_outreach",
  "followup_1",
  "followup_2",
  "followup_3",
] as const;

export const statutLeadSchema = z.enum(STATUTS_LEAD);
export const etapeContactSchema = z.enum(ETAPES_CONTACT);
export const typeModeleSchema = z.enum(TYPES_MODELE);
export const champVerifieSchema = z.enum(["email", "phone"]);
export const noteCompagnieSchema = z.string().max(5_000);
export const dateRappelSchema = facultatif(dateIso);

export const compagnieSchema = z.strictObject({
  name: texte(1, 200),
  /** Site web : http(s) seulement ; la valeur saisie est gardée telle quelle. */
  domain: facultatif(urlHttps),
  industry: texteFacultatif(120),
  region: texteFacultatif(120),
  employee_count: facultatif(z.number().int().min(0).max(10_000_000)),
  main_phone: facultatif(telephone),
  fit_score: facultatif(
    z
      .number()
      .refine(Number.isFinite, "Score invalide.")
      .transform((n) => Math.min(10, Math.max(1, Math.round(n)))),
  ),
  street_address: texteFacultatif(300),
  notes: texteFacultatif(5_000),
});

const champsContact = {
  first_name: texteFacultatif(100),
  last_name: texteFacultatif(100),
  title: texteFacultatif(160),
  email: facultatif(courriel),
  phone: facultatif(telephone),
  linkedin_url: facultatif(urlHttps),
  notes: texteFacultatif(5_000),
};

export const nouveauContactSchema = z.strictObject({ company_id: uuid, ...champsContact });
export const contactSchema = z.strictObject(champsContact);

export const activiteSchema = z.strictObject({
  contact_id: uuid,
  activity_type: z.enum(["call_logged", "manual_note"]),
  outcome: texteFacultatif(5_000),
});

export const modeleSchema = z.strictObject({
  subject: texte(1, 300),
  body: texte(1, 20_000),
  is_active: z.boolean(),
});

export const LIBELLES_CRM: Record<string, string> = {
  name: "Nom",
  domain: "Site web",
  industry: "Secteur",
  region: "Région",
  employee_count: "Employés",
  main_phone: "Téléphone",
  fit_score: "Score",
  street_address: "Adresse",
  notes: "Notes",
  company_id: "Compagnie",
  contact_id: "Contact",
  first_name: "Prénom",
  last_name: "Nom",
  title: "Titre",
  email: "Courriel",
  phone: "Téléphone",
  linkedin_url: "LinkedIn",
  activity_type: "Type d'activité",
  outcome: "Note",
  subject: "Sujet",
  body: "Corps",
  is_active: "Actif",
};

// --- Envoi en gros (CRM) ----------------------------------------------------------

/**
 * Texte brut des destinataires (collé ou CSV importé), 100 000 caractères au
 * plus ; le serveur le réanalyse en entier (lib/crm/envoi-en-gros.ts), qui
 * borne aussi les lignes utiles (1 000) et les destinataires (500).
 */
const texteDestinataires = z
  .string()
  .max(MAX_TEXTE_DESTINATAIRES, "Liste trop longue (100 000 caractères au plus) : découpe-la.")
  .refine((v) => v.trim() !== "", "Colle une liste d'adresses ou importe un CSV.");

/** Objet sur une seule ligne (sauts de ligne ramenés à une espace), 1 à 200 caractères. */
const objetEnvoi = z
  .string()
  .max(2_000)
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Objet requis.").max(MAX_OBJET, `Objet trop long (${MAX_OBJET} caractères au plus).`));

const champsEnvoiEnGros = {
  destinataires: texteDestinataires,
  objet: objetEnvoi,
  corps: texte(1, MAX_CORPS),
};

/** « Vérifier la liste » (lecture seule). */
export const verificationEnGrosSchema = z.strictObject(champsEnvoiEnGros);

/**
 * Un lot de l'envoi en gros. `nombre` = destinataires confirmés à la saisie ;
 * `dejaEnvoyes` = envoyés par les lots précédents de ce même envoi (le serveur
 * exige prêts + déjà envoyés = nombre).
 */
export const lotEnGrosSchema = z.strictObject({
  ...champsEnvoiEnGros,
  confirme: z.literal(true, "Coche la case de confirmation avant d'envoyer."),
  nombre: z.number().int().min(1).max(MAX_DESTINATAIRES),
  dejaEnvoyes: z.number().int().min(0).max(MAX_DESTINATAIRES),
});

export const LIBELLES_ENVOI_EN_GROS: Record<string, string> = {
  destinataires: "Destinataires",
  objet: "Objet",
  corps: "Message",
  confirme: "Confirmation",
  nombre: "Nombre de destinataires",
  dejaEnvoyes: "Progression",
};

// --- Calculatrice ---------------------------------------------------------------

/** Taille maximale des données d'un lot enregistré (JSON), en caractères. */
export const MAX_DONNEES_CALCULATRICE = 200_000;

const prixCalculatrice = z.number().refine(Number.isFinite, "Prix invalide.").min(0).max(10_000_000).nullable();

/** Un item de la calculatrice (assets/outils/calculatrice.html : donneesLot / chargerLot). */
export const itemCalculatriceSchema = z.strictObject({
  desc: z.string().max(500),
  qte: z.number().int().min(0).max(1_000_000),
  cat: z.string().max(200).optional(),
  bas: prixCalculatrice.optional(),
  moyen: prixCalculatrice.optional(),
});

export const donneesCalculatriceSchema = z.strictObject({
  nom: z.string().max(120).optional(),
  date: z.string().max(10).optional(),
  usd: z.boolean().optional(),
  taux: z.number().refine(Number.isFinite, "Taux invalide.").min(0).max(1_000).optional(),
  items: z.array(itemCalculatriceSchema).max(5_000),
});

export const lotEnregistreSchema = z.strictObject({
  name: texte(1, 120),
  data: donneesCalculatriceSchema,
});

/**
 * Nom du lot dans l'objet du devis : une seule ligne (sauts de ligne, y compris
 * U+2028/U+2029, ramenés à une espace par `\s`), 120 caractères au plus.
 */
const nomLotDevis = z
  .string()
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().max(120));

export const devisSchema = z.strictObject({
  to: courriel,
  nomClient: z.string().max(160).optional(),
  nomLot: nomLotDevis.optional(),
  /** Envoyé par d'anciennes versions de la calculatrice ; ignoré. */
  offre: z.string().max(100).optional(),
  message: texte(1, 10_000),
});

// --- Analyse de courriel (IA) et import eBay ------------------------------------

export const analyseCourrielSchema = z.strictObject({ email: texte(20, 50_000) });

/** Texte d'une annonce eBay collée : 200 000 caractères au plus, ramené à 60 000 (comme avant). */
export const importEbaySchema = z.strictObject({
  text: z
    .string()
    .max(200_000)
    .transform((t) => t.trim().slice(0, 60_000))
    .pipe(z.string().min(20, "Texte trop court.")),
});

// --- Synchros -------------------------------------------------------------------

export const synchroPubsSchema = z.strictObject({
  days: z.number().int().min(1).max(365).optional(),
  auto: z.boolean().optional(),
});

export const synchroEbaySchema = z.strictObject({ auto: z.boolean().optional() });
