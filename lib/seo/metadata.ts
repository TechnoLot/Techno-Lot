import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { alternatesFor } from "@/lib/seo/routes";

type PageMetadataInput = {
  locale: Locale;
  /** Chemin français de la page (clé du registre lib/seo/routes.ts). */
  frPath: string;
  title: string;
  description: string;
  /**
   * true : le titre est rendu tel quel, sans le gabarit « %s | Techno Lot »
   * des layouts.
   */
  absoluteTitle?: boolean;
};

/**
 * Métadonnées d'une page publique : titre, description, canonical/hreflang,
 * Open Graph et Twitter. metadataBase vient du layout racine.
 */
export function pageMetadata({
  locale,
  frPath,
  title,
  description,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  const alternates = alternatesFor(frPath, locale);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates,
    openGraph: {
      type: "website",
      url: alternates.canonical,
      title,
      description,
      siteName: site.name,
      locale: locale === "fr" ? "fr_CA" : "en_CA",
      images: [{ url: "/logo.png", width: 1024, height: 614, alt: site.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
