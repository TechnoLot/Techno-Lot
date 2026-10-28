import type { Locale } from "@/lib/i18n";

/**
 * Textes du formulaire de soumission en étapes (FR / EN).
 * Les libellés historiques (nom, courriel, erreurs…) restent dans lib/i18n.ts → form ;
 * ce fichier ne contient que les nouveautés.
 * Aucune constante partagée ici n'est dans un fichier "use client".
 */

export const CATEGORIES = [
  "portables",
  "bureau",
  "ecrans",
  "serveurs",
  "reseau",
  "stockage",
  "mobiles",
  "imprimantes",
  "autre",
] as const;

export type CategorieId = (typeof CATEGORIES)[number];

/** Noms français des catégories : toujours utilisés dans le message envoyé à l'équipe. */
const categoriesFr: Record<CategorieId, string> = {
  portables: "Portables",
  bureau: "Ordinateurs de bureau",
  ecrans: "Écrans",
  serveurs: "Serveurs",
  reseau: "Réseau",
  stockage: "Stockage",
  mobiles: "Téléphones et tablettes",
  imprimantes: "Imprimantes",
  autre: "Autre",
};

const categoriesEn: Record<CategorieId, string> = {
  portables: "Laptops",
  bureau: "Desktop computers",
  ecrans: "Monitors",
  serveurs: "Servers",
  reseau: "Networking",
  stockage: "Storage",
  mobiles: "Phones and tablets",
  imprimantes: "Printers",
  autre: "Other",
};

const fr = {
  categories: categoriesFr,
  steps: ["Votre matériel", "Vos coordonnées", "Envoi"],
  stepOf: (n: number, total: number) => `Étape ${n} sur ${total}`,
  progressLabel: "Progression de la soumission",
  next: "Continuer",
  back: "Retour",
  edit: "Modifier",

  // Étape 1
  materialTitle: "Qu'avez-vous à vendre ?",
  materialHint:
    "Touchez les catégories de votre lot, puis ajustez les quantités. Des quantités approximatives suffisent. Avec « Autre », écrivez vous-même le matériel : ajoutez-en autant qu'il faut.",
  categoriesLegend: "Catégories de matériel",
  quantitiesTitle: "Quantités",
  qtyUnknown: "quantité à préciser",
  quantityLabel: (cat: string) => `Quantité — ${cat}`,
  decrease: (cat: string) => `Retirer une unité — ${cat}`,
  increase: (cat: string) => `Ajouter une unité — ${cat}`,
  removeCategory: (cat: string) => `Retirer la catégorie ${cat}`,
  categoryAdded: (cat: string) => `${cat} ajouté à votre lot.`,
  categoryRemoved: (cat: string) => `${cat} retiré de votre lot.`,
  otherChip: "Autre",
  otherPlaceholder: "Ex. processeurs, cartes graphiques…",
  otherNameLabel: (n: number) => `Matériel « Autre » ${n} : de quoi s'agit-il ?`,
  otherFallback: (n: number) => `Autre ${n}`,
  otherUnnamed: "Autre (à préciser)",
  otherAdd: "Ajouter un autre matériel",
  otherAdded: "Ligne « Autre » ajoutée : écrivez le matériel.",
  otherRemoved: "Ligne « Autre » retirée.",
  descriptionLabel: "Description du lot",
  descriptionOptional: "facultatif",
  descriptionPlaceholder:
    "Modèles, état, année, accessoires, lieu du ramassage… tout ce qui nous aide à évaluer votre lot.",
  filesTitle: "Inventaire et photos",
  filesHint: "Facultatif, mais une liste ou quelques photos accélèrent l'évaluation.",
  dropInventoryTitle: "Inventaire",
  dropInventoryText: "Glissez votre fichier ici ou cliquez pour le choisir",
  dropInventoryFormats: "Excel, CSV ou PDF",
  dropPhotosTitle: "Photos du lot",
  dropPhotosText: "Glissez vos photos ici ou cliquez pour les choisir",
  dropPhotosFormats: "JPG, PNG, HEIC… plusieurs images acceptées",
  dropActive: "Relâchez pour ajouter",
  removeFile: (name: string) => `Retirer ${name}`,
  filesAdded: (n: number) => `${n} fichier${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""}.`,
  fileRemoved: (name: string) => `${name} retiré.`,
  rejected: (names: string) => `Format non accepté : ${names}`,
  sizeUsage: (used: string, max: string) => `${used} sur ${max}`,
  sizeLabel: "Taille totale des pièces jointes",

  // Étape 2
  contactTitle: "Comment vous joindre ?",
  contactHint: "Nous vous répondons dans un délai de 24 heures.",
  companyLabel: "Entreprise",
  companyPlaceholder: "Nom de l'entreprise",
  cityLabel: "Ville",
  cityPlaceholder: "Ville du ramassage",
  optional: "facultatif",
  required: "obligatoire",

  // Étape 3
  reviewTitle: "Vérifiez et envoyez",
  reviewHint: "Un dernier coup d'œil avant l'envoi.",
  reviewMaterial: "Matériel",
  reviewNoMaterial: "Aucune catégorie choisie",
  reviewDescription: "Description",
  reviewFiles: "Pièces jointes",
  reviewNoFiles: "Aucune",
  reviewContact: "Coordonnées",
  filesCount: (n: number) => `${n} fichier${n > 1 ? "s" : ""}`,

  // Envoi et succès
  sendingStatus: "Envoi de votre soumission en cours…",
  successNextTitle: "La suite",
  successNext: [
    {
      title: "Réponse en 24 h",
      text: "Nous analysons votre lot et vous répondons dans un délai de 24 heures.",
    },
    {
      title: "Ramassage gratuit",
      text: "Notre équipe se rend sur place pour emballer, charger et transporter votre matériel, partout au Québec.",
    },
    {
      title: "Paiement rapide et garanti",
      text: "La moitié est versée au ramassage, le solde sans délai après l'inspection.",
    },
  ],
  successCall: "Une question d'ici là ?",
};

export type TextesFormulaire = typeof fr;

const en: TextesFormulaire = {
  categories: categoriesEn,
  steps: ["Your equipment", "Your details", "Send"],
  stepOf: (n, total) => `Step ${n} of ${total}`,
  progressLabel: "Request progress",
  next: "Continue",
  back: "Back",
  edit: "Edit",

  materialTitle: "What do you have to sell?",
  materialHint:
    "Tap the categories in your lot, then adjust the quantities. Rough quantities are fine. With “Other”, type the equipment yourself: add as many as you need.",
  categoriesLegend: "Equipment categories",
  quantitiesTitle: "Quantities",
  qtyUnknown: "quantity to confirm",
  quantityLabel: (cat) => `Quantity — ${cat}`,
  decrease: (cat) => `Remove one unit — ${cat}`,
  increase: (cat) => `Add one unit — ${cat}`,
  removeCategory: (cat) => `Remove the ${cat} category`,
  categoryAdded: (cat) => `${cat} added to your lot.`,
  categoryRemoved: (cat) => `${cat} removed from your lot.`,
  otherChip: "Other",
  otherPlaceholder: "E.g. CPUs, graphics cards…",
  otherNameLabel: (n) => `“Other” item ${n}: what is it?`,
  otherFallback: (n) => `Other ${n}`,
  otherUnnamed: "Other (to be specified)",
  otherAdd: "Add another item",
  otherAdded: "“Other” line added: type the equipment.",
  otherRemoved: "“Other” line removed.",
  descriptionLabel: "Lot description",
  descriptionOptional: "optional",
  descriptionPlaceholder:
    "Models, condition, year, accessories, pickup location… anything that helps us appraise your lot.",
  filesTitle: "Inventory and photos",
  filesHint: "Optional, but a list or a few photos speed up the appraisal.",
  dropInventoryTitle: "Inventory",
  dropInventoryText: "Drop your file here or click to choose it",
  dropInventoryFormats: "Excel, CSV or PDF",
  dropPhotosTitle: "Photos of your lot",
  dropPhotosText: "Drop your photos here or click to choose them",
  dropPhotosFormats: "JPG, PNG, HEIC… multiple images accepted",
  dropActive: "Release to add",
  removeFile: (name) => `Remove ${name}`,
  filesAdded: (n) => `${n} file${n > 1 ? "s" : ""} added.`,
  fileRemoved: (name) => `${name} removed.`,
  rejected: (names) => `Format not accepted: ${names}`,
  sizeUsage: (used, max) => `${used} of ${max}`,
  sizeLabel: "Total attachment size",

  contactTitle: "How can we reach you?",
  contactHint: "We get back to you within 24 hours.",
  companyLabel: "Company",
  companyPlaceholder: "Company name",
  cityLabel: "City",
  cityPlaceholder: "Pickup city",
  optional: "optional",
  required: "required",

  reviewTitle: "Review and send",
  reviewHint: "One last look before sending.",
  reviewMaterial: "Equipment",
  reviewNoMaterial: "No category selected",
  reviewDescription: "Description",
  reviewFiles: "Attachments",
  reviewNoFiles: "None",
  reviewContact: "Contact details",
  filesCount: (n) => `${n} file${n > 1 ? "s" : ""}`,

  sendingStatus: "Sending your request…",
  successNextTitle: "What happens next",
  successNext: [
    {
      title: "Response within 24 h",
      text: "We review your lot and get back to you within 24 hours.",
    },
    {
      title: "Free pickup",
      text: "Our team comes on site to pack, load and transport your equipment, anywhere in Québec.",
    },
    {
      title: "Fast, guaranteed payment",
      text: "Half is paid at pickup, the balance without delay after inspection.",
    },
  ],
  successCall: "Any questions in the meantime?",
};

export function getTextesFormulaire(locale: Locale): TextesFormulaire {
  return locale === "en" ? en : fr;
}

/** Catégorie présente = choisie ; null = quantité effacée (« à préciser »). */
export type Quantites = Partial<Record<CategorieId, number | null>>;

/** Ligne « Autre » : matériel écrit par le client, avec sa quantité (null = à préciser). */
export type Autre = { id: string; nom: string; qte: number | null };

export const QTE_MAX = 99999;
/** Longueur maximale du nom d'un matériel « Autre ». */
export const AUTRE_NOM_MAX = 80;
/** Nombre maximal de lignes « Autre ». */
export const AUTRES_MAX = 20;

/**
 * Compose le champ `message` envoyé à /api/soumission : les nouvelles informations
 * (catégories et quantités, entreprise, ville) en lignes lisibles au début, puis la
 * description libre. Toujours en français : le message est lu par l'équipe Techno Lot.
 * Sans aucune information ajoutée, la description est envoyée telle quelle.
 */
export function composerMessage({
  quantites,
  autres = [],
  entreprise,
  ville,
  description,
}: {
  quantites: Quantites;
  /** Lignes « Autre » écrites par le client (ex. « Processeurs (autre) : 12 ») */
  autres?: Autre[];
  entreprise: string;
  ville: string;
  description: string;
}): string {
  const lignes: string[] = [];
  const choisies = CATEGORIES.filter((id) => id !== "autre" && quantites[id] !== undefined);
  if (choisies.length > 0 || autres.length > 0) {
    lignes.push("Matériel :");
    for (const id of choisies) {
      const q = quantites[id];
      lignes.push(`- ${categoriesFr[id]} : ${q ? q : "quantité à préciser"}`);
    }
    for (const a of autres) {
      const nom = a.nom.trim();
      lignes.push(`- ${nom ? `${nom} (autre)` : "Autre (non précisé)"} : ${a.qte ? a.qte : "quantité à préciser"}`);
    }
  }
  if (entreprise.trim()) lignes.push(`Entreprise : ${entreprise.trim()}`);
  if (ville.trim()) lignes.push(`Ville : ${ville.trim()}`);

  const texte = description.trim();
  if (lignes.length === 0) return texte;
  if (!texte) return lignes.join("\n");
  return `${lignes.join("\n")}\n\nDescription :\n${texte}`;
}

/** Taille lisible, en Mo avec une décimale (Ko sous 1 Mo). */
export function formatTaille(octets: number, locale: Locale): string {
  const fr = locale === "fr";
  if (octets < 1024 * 1024) {
    const ko = Math.max(1, Math.round(octets / 1024));
    return `${ko} ${fr ? "Ko" : "KB"}`;
  }
  const mo = octets / (1024 * 1024);
  const val = mo.toLocaleString(fr ? "fr-CA" : "en-CA", { maximumFractionDigits: 1 });
  return `${val} ${fr ? "Mo" : "MB"}`;
}
