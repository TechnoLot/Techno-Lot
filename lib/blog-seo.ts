import type { Locale } from "@/lib/i18n";
import { findRoute } from "@/lib/seo/routes";

/**
 * Référencement du blogue : langue forcée, consolidation des articles qui se
 * répètent, bloc « À retenir » et liens vers les pages de services.
 *
 * Fichier sans dépendance vers lib/posts.ts (c'est lui qui importe celui-ci).
 */

/* ------------------------------------------------------------------ */
/* Langue                                                               */
/* ------------------------------------------------------------------ */

/**
 * Langue forcée par slug. Par défaut, la langue d'un article Soro est détectée
 * sur son corps (lib/posts.ts, detectLang) ; ajoutez ici un slug seulement si
 * la détection se trompe.
 */
export const LANG_OVERRIDES: Record<string, Locale> = {};

/* ------------------------------------------------------------------ */
/* Consolidation                                                        */
/* ------------------------------------------------------------------ */

/**
 * Activé le 2026-10-28 avec l'accord du client. Les articles « secondary »
 * sont marqués noindex (follow), retirés du plan du site et de la liste du
 * blogue, et affichent un lien vers l'article de référence (pillar) ou la page
 * relatedPath. À false : tout reste indexé.
 */
export const APPLY_CONSOLIDATION = true;

export type BlogRole = "pillar" | "secondary" | "standalone";

export type BlogSeoEntry = {
  role: BlogRole;
  /** Slug de l'article de référence du même sujet (même langue). */
  pillar?: string;
  /** Page du site (chemin français du registre) qui fait référence sur ce sujet. */
  relatedPath?: string;
};

/**
 * Rôle de chaque article Soro (analyse du 2026-10-28). Ajustements :
 * - qui-paie-transport-informatique et is-pickup-free-ramassage-gratuit
 *   présentent le ramassage gratuit comme conditionnel → secondary, renvoi
 *   vers /prise-en-charge-complete ;
 * - how-to-buy-electronic-equipment-for-your-business (achat d'équipement
 *   neuf, hors sujet) → secondary sans article de référence.
 * - qui-rachete-equipements-reseau-quebec, rachat-de-portable-equipements-en-lot
 *   et preparer-appareils-ramassage-en-lot sont réécrits en français
 *   (lib/blog-articles/rewrites.ts) ; le premier devient la référence FR du
 *   groupe Réseau.
 * Un slug absent de la liste (nouvel article) est traité comme standalone.
 */
export const BLOG_CONSOLIDATION: Record<string, BlogSeoEntry> = {
  "vendre-materiel-electronique-entreprise": { role: "secondary", pillar: "rachat-informatique-valoriser-vos-lots" }, // fr · lot-generique
  "data-wiping-versus-physical-destruction-entreprise": { role: "secondary", pillar: "effacer-donnees-avant-revente" }, // fr · donnees-securite
  "reprise-informatique-versus-recyclage": { role: "secondary", pillar: "rachat-ou-recyclage-electronique" }, // fr · rachat-vs-recyclage
  "meilleurs-criteres-acheteur-informatique": { role: "pillar" }, // fr · choisir-acheteur
  "organiser-enlevement-materiel-bureautique": { role: "pillar" }, // fr · enlevement-retrait
  "qui-paie-transport-informatique": { role: "secondary", relatedPath: "/prise-en-charge-complete" }, // fr · transport-ramassage-gratuit
  "benefices-vente-materiel-en-lot": { role: "secondary", pillar: "rachat-informatique-valoriser-vos-lots" }, // fr · lot-generique
  "qui-achete-moniteurs-ordinateur-quebec": { role: "standalone" }, // fr · moniteurs
  "calculer-valeur-residuelle-materiel-ti": { role: "pillar" }, // fr · valeur-estimation
  "comment-retirer-technologie-bureau": { role: "secondary", pillar: "organiser-enlevement-materiel-bureautique" }, // fr · enlevement-retrait
  "reprise-equipement-telecom": { role: "secondary", pillar: "rachat-equipements-telecommunication-entreprise" }, // fr · telecom
  "guide-retrait-responsable-centre-donnees": { role: "standalone" }, // fr · centre-de-donnees
  "preparer-appareils-ramassage-en-lot": { role: "standalone" }, // fr · preparation-inventaire
  "rachat-materiel-bureau": { role: "secondary", pillar: "rachat-informatique-valoriser-vos-lots" }, // fr · lot-generique
  "hardware-resale-guide-vendre-lots-ti": { role: "secondary", pillar: "rachat-informatique-valoriser-vos-lots" }, // fr · lot-generique
  "is-pickup-free-ramassage-gratuit": { role: "secondary", relatedPath: "/prise-en-charge-complete" }, // fr · transport-ramassage-gratuit
  "itad-vendors-choisir-partenaire-fiable": { role: "secondary", pillar: "meilleurs-criteres-acheteur-informatique" }, // fr · choisir-acheteur
  "bulk-device-valuation-guide": { role: "pillar" }, // en · valeur-estimation
  "enterprise-hardware-chain-of-custody": { role: "pillar" }, // en · donnees-securite
  "how-to-sell-surplus-monitors": { role: "standalone" }, // en · moniteurs
  "electronics-buyback-provider": { role: "secondary", pillar: "compare-business-equipment-buyers" }, // en · choisir-acheteur
  "it-asset-disposition-versus-resale": { role: "pillar" }, // en · rachat-vs-recyclage
  "asset-recovery-retired-tech-value": { role: "secondary", pillar: "sell-your-it-equipment" }, // en · lot-generique
  "used-network-gear-equipements-reseau-recherches-occasion": { role: "secondary", pillar: "sell-networking-equipment-bulk" }, // en · reseau
  "hardware-lot-appraisal": { role: "secondary", pillar: "bulk-device-valuation-guide" }, // en · valeur-estimation
  "guide-to-data-center-decommissioning": { role: "pillar" }, // en · centre-de-donnees
  "compare-business-equipment-buyers": { role: "pillar" }, // en · choisir-acheteur
  "server-decommissioning-without-losing-value": { role: "secondary", pillar: "improve-server-resale-value" }, // en · serveurs
  "corporate-it-asset-disposition": { role: "secondary", pillar: "sell-your-it-equipment" }, // en · lot-generique
  "electronics-liquidation": { role: "standalone" }, // en · liquidation
  "optimiser-actifs-technologiques": { role: "secondary", pillar: "sell-your-it-equipment" }, // en · lot-generique
  "who-buys-used-switches": { role: "secondary", pillar: "sell-networking-equipment-bulk" }, // en · reseau
  "data-center-liquidation": { role: "secondary", pillar: "guide-to-data-center-decommissioning" }, // en · centre-de-donnees
  "improve-server-resale-value": { role: "pillar" }, // en · serveurs
  "corporate-e-waste-disposal-that-pays-back": { role: "secondary", pillar: "it-asset-disposition-versus-resale" }, // en · rachat-vs-recyclage
  "how-to-document-hardware-inventory": { role: "standalone" }, // en · preparation-inventaire
  "sell-networking-equipment-bulk": { role: "pillar" }, // en · reseau
  "how-to-resell-computer-stuff": { role: "secondary", pillar: "sell-your-it-equipment" }, // en · lot-generique
  "sell-your-it-equipment": { role: "pillar" }, // en · lot-generique
  "how-to-buy-electronic-equipment-for-your-business": { role: "secondary" }, // en · achat-equipement-acheteur
  "actifs-technologiques-surplus-value": { role: "secondary", pillar: "sell-your-it-equipment" }, // en · lot-generique
  "planifier-retrait-reseau": { role: "secondary", pillar: "sell-networking-equipment-bulk" }, // en · reseau
  "serveurs-usages-sell-retired-servers": { role: "secondary", pillar: "improve-server-resale-value" }, // en · serveurs
  "server-destruction-and-reuse-practical-plan": { role: "secondary", pillar: "enterprise-hardware-chain-of-custody" }, // en · donnees-securite
  "economie-circulaire-des-technologies-action": { role: "standalone" }, // en · reemploi-economie-circulaire
  "guide-declassement-parc-bureautique": { role: "pillar" }, // en · enlevement-retrait
  "recyclage-reconditionnement-informatique-it-assets": { role: "secondary", pillar: "it-asset-disposition-versus-resale" }, // en · rachat-vs-recyclage
  "equipment-buyback-payment-reliability": { role: "standalone" }, // en · paiement
  "optimizing-technology-assets-better-returns-montreal": { role: "pillar" }, // en · montreal
  "qui-rachete-equipements-reseau-quebec": { role: "pillar" }, // fr · reseau (réécrit localement le 2026-10-28)
  "guide-revente-serveurs-entreprise": { role: "secondary", pillar: "improve-server-resale-value" }, // en · serveurs
  "combien-vaut-un-serveur": { role: "secondary", pillar: "reprise-serveurs-entreprise" }, // fr · serveurs
  "buy-it-equipment-montreal-area": { role: "secondary", pillar: "optimizing-technology-assets-better-returns-montreal" }, // en · montreal
  "rachat-informatique-valoriser-vos-lots": { role: "pillar" }, // fr · lot-generique
  "vendre-mes-electroniques-en-lots": { role: "secondary", pillar: "sell-your-it-equipment" }, // en · lot-generique
  "meilleurs-equipements-informatiques-a-revendre": { role: "secondary", pillar: "bulk-device-valuation-guide" }, // en · valeur-estimation
  "it-equipment-value-after-upgrade": { role: "secondary", pillar: "sell-your-it-equipment" }, // en · lot-generique
  "effacer-donnees-avant-revente": { role: "pillar" }, // fr · donnees-securite
  "organiser-enlevement-equipements-sans-delais": { role: "secondary", pillar: "guide-declassement-parc-bureautique" }, // en · enlevement-retrait
  "reemploi-equipements-electroniques-professionnels": { role: "standalone" }, // fr · reemploi-economie-circulaire
  "achat-telephone-cellulaire-lot-entreprises": { role: "standalone" }, // fr · cellulaires
  "rachat-de-laptop-valoriser-parc-ti": { role: "secondary", pillar: "rachat-de-portable-equipements-en-lot" }, // fr · portables
  "revente-equipements-professionnels": { role: "secondary", pillar: "rachat-informatique-valoriser-vos-lots" }, // fr · lot-generique
  "que-faire-parc-informatique-obsolete": { role: "standalone" }, // fr · parc-obsolete
  "liquidation-surplus-informatique-entreprise": { role: "standalone" }, // fr · liquidation
  "vendre-lot-electronique-montreal-sans-logistique": { role: "standalone" }, // fr · montreal
  "rachat-de-portable-equipements-en-lot": { role: "pillar" }, // fr · portables
  "reprise-solutions-stockage-informatique": { role: "standalone" }, // fr · stockage
  "valorisation-materiel-audiovisuel-entreprise": { role: "standalone" }, // fr · audiovisuel
  "vente-tablettes-usagees-en-lot": { role: "standalone" }, // fr · tablettes
  "rachat-equipements-telecommunication-entreprise": { role: "pillar" }, // fr · telecom
  "paiement-rapide-materiel-informatique": { role: "standalone" }, // fr · paiement
  "vendre-ordinateurs-portables-entreprise": { role: "secondary", pillar: "rachat-de-portable-equipements-en-lot" }, // fr · portables
  "rachat-ou-recyclage-electronique": { role: "pillar" }, // fr · rachat-vs-recyclage
  "estimation-parc-informatique": { role: "secondary", pillar: "calculer-valeur-residuelle-materiel-ti" }, // fr · valeur-estimation
  "reprise-serveurs-entreprise": { role: "pillar" }, // fr · serveurs
  "vendre-lot-electronique-quebec": { role: "secondary", pillar: "rachat-informatique-valoriser-vos-lots" }, // fr · lot-generique
  "rachat-parc-informatique": { role: "secondary", pillar: "rachat-informatique-valoriser-vos-lots" }, // fr · lot-generique
  "achat-lots-informatiques-vendre-sans-perdre-temps": { role: "secondary", pillar: "rachat-informatique-valoriser-vos-lots" }, // fr · lot-generique
  "rachat-materiel-electronique-lots-ti": { role: "secondary", pillar: "rachat-informatique-valoriser-vos-lots" }, // fr · lot-generique
};

export function blogSeoEntry(slug: string): BlogSeoEntry | undefined {
  return BLOG_CONSOLIDATION[slug];
}

/** Article secondaire écarté de l'index (seulement si la consolidation est appliquée). */
export function isConsolidated(slug: string): boolean {
  return APPLY_CONSOLIDATION && BLOG_CONSOLIDATION[slug]?.role === "secondary";
}

/** L'article doit-il être indexé, listé dans le blogue et dans le plan du site ? */
export function isIndexable(slug: string): boolean {
  return !isConsolidated(slug);
}

/* ------------------------------------------------------------------ */
/* Libellés                                                             */
/* ------------------------------------------------------------------ */

export const blogSeoText: Record<
  Locale,
  {
    referenceArticle: string;
    referencePage: string;
    keyFactsTitle: string;
    keyFacts: string[];
    keyFactsButton: string;
    relatedTitle: string;
    breadcrumbHome: string;
    breadcrumbBlog: string;
  }
> = {
  fr: {
    referenceArticle: "Article de référence sur ce sujet :",
    referencePage: "Page de référence sur ce sujet :",
    keyFactsTitle: "À retenir chez Techno Lot",
    keyFacts: [
      "Offre dans les 24 heures",
      "Ramassage sans frais et sans minimum partout au Québec",
      "La moitié du paiement au ramassage et le solde après l'inspection (15 jours ouvrables au maximum)",
      "Effacement sécurisé des données avec certificat de destruction, sans frais",
    ],
    keyFactsButton: "Faire une soumission",
    relatedTitle: "Services liés",
    breadcrumbHome: "Accueil",
    breadcrumbBlog: "Blogue",
  },
  en: {
    referenceArticle: "Main article on this topic:",
    referencePage: "Main page on this topic:",
    keyFactsTitle: "Key facts about Techno Lot",
    keyFacts: [
      "Offer within 24 hours",
      "Free pickup with no minimum, anywhere in Québec",
      "Half of the payment at pickup and the balance after inspection (within 15 business days at most)",
      "Secure data erasure with a certificate of destruction, at no charge",
    ],
    keyFactsButton: "Get a quote",
    relatedTitle: "Related services",
    breadcrumbHome: "Home",
    breadcrumbBlog: "Blog",
  },
};

/** Libellés des pages de services (clé : chemin français du registre). */
export const SERVICE_LABELS: Record<string, Record<Locale, string>> = {
  "/rachat-serveurs-et-stockage": {
    fr: "Rachat de serveurs et de stockage",
    en: "Server and storage buyback",
  },
  "/rachat-equipements-reseau-telecom": {
    fr: "Rachat d'équipements réseau et télécom",
    en: "Network and telecom equipment buyback",
  },
  "/rachat-ordinateurs-portables-en-lot": {
    fr: "Rachat d'ordinateurs portables en lot",
    en: "Bulk laptop buyback",
  },
  "/rachat-materiel-informatique-montreal": {
    fr: "Rachat de matériel informatique à Montréal",
    en: "IT equipment buyback in Montréal",
  },
  "/rachat-materiel-informatique-laval": {
    fr: "Rachat de matériel informatique à Laval",
    en: "IT equipment buyback in Laval",
  },
  "/rachat-materiel-informatique-terrebonne-mascouche": {
    fr: "Rachat de matériel informatique à Terrebonne et Mascouche",
    en: "IT equipment buyback in Terrebonne and Mascouche",
  },
  "/rachat-materiel-informatique-rive-nord": {
    fr: "Rachat de matériel informatique sur la Rive-Nord",
    en: "IT equipment buyback on the North Shore",
  },
  "/rachat-materiel-informatique-rive-sud": {
    fr: "Rachat de matériel informatique sur la Rive-Sud",
    en: "IT equipment buyback on the South Shore",
  },
  "/rachat-materiel-informatique-blainville": {
    fr: "Rachat de matériel informatique à Blainville",
    en: "IT equipment buyback in Blainville",
  },
  "/rachat-materiel-informatique-boisbriand": {
    fr: "Rachat de matériel informatique à Boisbriand",
    en: "IT equipment buyback in Boisbriand",
  },
  "/rachat-materiel-informatique-brossard": {
    fr: "Rachat de matériel informatique à Brossard",
    en: "IT equipment buyback in Brossard",
  },
  "/rachat-materiel-informatique-cote-saint-luc": {
    fr: "Rachat de matériel informatique à Côte-Saint-Luc",
    en: "IT equipment buyback in Côte-Saint-Luc",
  },
  "/rachat-materiel-informatique-dorval": {
    fr: "Rachat de matériel informatique à Dorval",
    en: "IT equipment buyback in Dorval",
  },
  "/rachat-materiel-informatique-kirkland": {
    fr: "Rachat de matériel informatique à Kirkland",
    en: "IT equipment buyback in Kirkland",
  },
  "/rachat-materiel-informatique-lachine": {
    fr: "Rachat de matériel informatique à Lachine",
    en: "IT equipment buyback in Lachine",
  },
  "/rachat-materiel-informatique-lasalle": {
    fr: "Rachat de matériel informatique à LaSalle",
    en: "IT equipment buyback in LaSalle",
  },
  "/rachat-materiel-informatique-longueuil": {
    fr: "Rachat de matériel informatique à Longueuil",
    en: "IT equipment buyback in Longueuil",
  },
  "/rachat-materiel-informatique-mirabel": {
    fr: "Rachat de matériel informatique à Mirabel",
    en: "IT equipment buyback in Mirabel",
  },
  "/rachat-materiel-informatique-repentigny": {
    fr: "Rachat de matériel informatique à Repentigny",
    en: "IT equipment buyback in Repentigny",
  },
  "/rachat-materiel-informatique-saint-eustache": {
    fr: "Rachat de matériel informatique à Saint-Eustache",
    en: "IT equipment buyback in Saint-Eustache",
  },
  "/rachat-materiel-informatique-saint-jerome": {
    fr: "Rachat de matériel informatique à Saint-Jérôme",
    en: "IT equipment buyback in Saint-Jérôme",
  },
  "/rachat-materiel-informatique-saint-laurent": {
    fr: "Rachat de matériel informatique dans Saint-Laurent",
    en: "IT equipment buyback in Saint-Laurent",
  },
  "/rachat-materiel-informatique-sainte-therese": {
    fr: "Rachat de matériel informatique à Sainte-Thérèse",
    en: "IT equipment buyback in Sainte-Thérèse",
  },
  "/achat-de-lot-description": {
    fr: "Ce que nous rachetons",
    en: "What we buy",
  },
  "/prise-en-charge-complete": {
    fr: "Prise en charge complète",
    en: "Full-service pickup",
  },
};

/* ------------------------------------------------------------------ */
/* Services liés                                                        */
/* ------------------------------------------------------------------ */

/** Minuscules, sans accents ; tirets et ponctuation deviennent des espaces. */
function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mots-clés (cherchés en début de mot) → page de service, dans l'ordre d'affichage. */
const SERVICE_RULES: { path: string; keywords: string[] }[] = [
  {
    path: "/rachat-serveurs-et-stockage",
    keywords: ["serveur", "server", "centre de données", "data center", "stockage", "storage"],
  },
  {
    path: "/rachat-equipements-reseau-telecom",
    keywords: [
      "réseau", "network", "switch", "routeur", "router", "cisco",
      "pare-feu", "firewall", "télécom", "telecom", "téléphon",
    ],
  },
  {
    path: "/rachat-ordinateurs-portables-en-lot",
    keywords: ["portable", "laptop", "ordinateur", "computer", "poste", "écran", "moniteur", "monitor"],
  },
  { path: "/rachat-materiel-informatique-montreal", keywords: ["montréal", "montreal"] },
  { path: "/rachat-materiel-informatique-laval", keywords: ["laval"] },
  { path: "/rachat-materiel-informatique-terrebonne-mascouche", keywords: ["terrebonne", "mascouche"] },
  { path: "/rachat-materiel-informatique-rive-nord", keywords: ["rive-nord"] },
  // Pages par ville, dans l'ordre du pied de page. Saint-Laurent : jamais « saint-laurent »
  // seul (le fleuve revient dans des articles), seulement des expressions propres à l'arrondissement.
  { path: "/rachat-materiel-informatique-rive-sud", keywords: ["rive-sud"] },
  { path: "/rachat-materiel-informatique-blainville", keywords: ["blainville"] },
  { path: "/rachat-materiel-informatique-boisbriand", keywords: ["boisbriand"] },
  { path: "/rachat-materiel-informatique-brossard", keywords: ["brossard"] },
  { path: "/rachat-materiel-informatique-cote-saint-luc", keywords: ["côte-saint-luc"] },
  { path: "/rachat-materiel-informatique-dorval", keywords: ["dorval"] },
  { path: "/rachat-materiel-informatique-kirkland", keywords: ["kirkland"] },
  { path: "/rachat-materiel-informatique-lachine", keywords: ["lachine"] },
  { path: "/rachat-materiel-informatique-lasalle", keywords: ["lasalle"] },
  { path: "/rachat-materiel-informatique-longueuil", keywords: ["longueuil"] },
  { path: "/rachat-materiel-informatique-mirabel", keywords: ["mirabel"] },
  { path: "/rachat-materiel-informatique-repentigny", keywords: ["repentigny"] },
  { path: "/rachat-materiel-informatique-saint-eustache", keywords: ["saint-eustache"] },
  { path: "/rachat-materiel-informatique-saint-jerome", keywords: ["saint-jérôme"] },
  { path: "/rachat-materiel-informatique-saint-laurent", keywords: ["technoparc", "arrondissement de saint-laurent"] },
  { path: "/rachat-materiel-informatique-sainte-therese", keywords: ["sainte-thérèse"] },
];

/** Dernier recours, toujours en fin de liste. */
const FALLBACK_PATH = "/achat-de-lot-description";
/** Complément quand aucun mot-clé ne correspond (pour avoir au moins deux liens). */
const FILLER_PATH = "/prise-en-charge-complete";
const MAX_RELATED = 4;

export type RelatedLink = { href: string; label: string };

/** Chemin de la page dans la langue voulue, seulement si elle est au registre. */
function registeredPath(frPath: string, locale: Locale): string | null {
  const route = findRoute(frPath);
  if (!route) return null;
  const path: string | undefined = locale === "fr" ? route.fr : route.en;
  return path || null;
}

function serviceLink(locale: Locale, frPath: string): RelatedLink | null {
  const href = registeredPath(frPath, locale);
  const label = SERVICE_LABELS[frPath]?.[locale];
  return href && label ? { href, label } : null;
}

/**
 * 2 à 4 liens vers les pages de services, choisis par mots-clés du slug et du
 * titre ; /achat-de-lot-description ferme toujours la liste. Seules les pages
 * présentes dans le registre (lib/seo/routes.ts) sont proposées ; en anglais,
 * une page sans chemin anglais est sautée.
 */
export function relatedServices(locale: Locale, slug: string, title: string): RelatedLink[] {
  const text = ` ${normalizeText(`${slug} ${title}`)}`;
  const links = SERVICE_RULES.filter((rule) =>
    rule.keywords.some((k) => text.includes(` ${normalizeText(k)}`)),
  )
    .map((rule) => serviceLink(locale, rule.path))
    .filter((l): l is RelatedLink => l !== null)
    .slice(0, MAX_RELATED - 1);
  const fallback = serviceLink(locale, FALLBACK_PATH);
  if (links.length + (fallback ? 1 : 0) < 2) {
    const filler = serviceLink(locale, FILLER_PATH);
    if (filler) links.push(filler);
  }
  if (fallback) links.push(fallback);
  return links;
}

/** Page de référence (relatedPath) d'un article consolidé, dans la langue voulue. */
export function relatedPageLink(locale: Locale, frPath: string): RelatedLink | null {
  return serviceLink(locale, frPath);
}
