import type { Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { absoluteUrl, counterpartPath } from "@/lib/seo/routes";

/**
 * Données structurées schema.org (JSON-LD), en fonctions pures.
 * Rendu : composant <JsonLd data={…} /> (components/seo/JsonLd.tsx).
 */

/** Identifiant stable de l'entreprise, repris par les autres blocs. */
export const ORG_ID = `${site.url}/#organization`;

/** Villes desservies mises en avant dans la fiche de l'entreprise. */
const SERVED_CITIES = [
  "Montréal",
  "Laval",
  "Terrebonne",
  "Mascouche",
  "Longueuil",
  "Blainville",
  "Boisbriand",
  "Sainte-Thérèse",
  "Mirabel",
  "Saint-Eustache",
  "Saint-Jérôme",
  "Repentigny",
];

const ORG_DESCRIPTION: Record<Locale, string> = {
  fr: "Techno Lot rachète les lots informatiques et électroniques des entreprises du Québec : offre en 24 h, ramassage gratuit, paiement rapide et garanti.",
  en: "Techno Lot buys IT and electronic equipment lots from Quebec businesses: offer within 24 hours, free pickup, fast and guaranteed payment.",
};

function city(name: string) {
  return { "@type": "City", name };
}

/** "514-944-3939" → "+1-514-944-3939". */
function internationalPhone(phone: string): string {
  return `+1-${phone.replace(/[^\d]/g, "").replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3")}`;
}

/**
 * Fiche LocalBusiness de Techno Lot. Pas de geo (aucune coordonnée exacte
 * trouvée pour l'adresse), pas de priceRange ni d'openingHours.
 */
export function organizationJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": ORG_ID,
    name: site.name,
    description: ORG_DESCRIPTION[locale],
    url: site.url,
    logo: `${site.url}/logo.png`,
    image: `${site.url}/logo.png`,
    telephone: internationalPhone(site.phone),
    email: site.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: "QC",
      postalCode: site.address.postalCode,
      addressCountry: "CA",
    },
    areaServed: [
      ...SERVED_CITIES.map(city),
      { "@type": "AdministrativeArea", name: "Québec" },
    ],
    sameAs: [site.facebook],
  };
}

/** Fil d'Ariane ; `path` est le chemin réel de chaque niveau (langue comprise). */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Service offert par Techno Lot. `path` peut être le chemin français ou
 * anglais : l'URL est celle de la page dans `locale`.
 */
export function serviceJsonLd({
  name,
  description,
  path,
  areaServed,
  regions = [],
  locale,
}: {
  name: string;
  description: string;
  path: string;
  /** Villes desservies (schema.org City). */
  areaServed: string[];
  /** Régions desservies (schema.org AdministrativeArea), ex. « Québec ». */
  regions?: string[];
  locale: Locale;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: absoluteUrl(counterpartPath(path, locale)),
    provider: { "@id": ORG_ID },
    areaServed: [
      ...areaServed.map(city),
      ...regions.map((name) => ({ "@type": "AdministrativeArea", name })),
    ],
  };
}

/** Page de questions fréquentes. */
export function faqJsonLd(qas: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qas.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
}
