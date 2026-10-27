import type { ReactNode } from "react";
import MotionProvider from "@/components/MotionProvider";
import SetDocumentLang from "@/components/SetDocumentLang";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { site } from "@/lib/site";
import { getDict, type Locale } from "@/lib/i18n";
// Système de design du site public (thèmes de chapitres, boutons…) — limité à .site-root
import "@/app/site.css";

/**
 * Habillage commun d'une section linguistique : en-tête, pied de page et
 * JSON-LD localisés, défilement lissé, attribut lang.
 * `.site-root` porte les jetons de couleur de la marque, Inter / Chakra Petch
 * et les thèmes de chapitre (app/site.css) ; l'admin (même layout racine)
 * n'est pas concerné. `id="top"` sert au lien « Haut de page » du pied.
 */
export default function LocaleShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const t = getDict(locale);

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    description: locale === "fr" ? site.description : site.descriptionEn,
    url: site.url,
    telephone: "+1-514-944-3939",
    email: site.email,
    image: `${site.url}/logo.png`,
    logo: `${site.url}/logo.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.province,
      postalCode: site.address.postalCode,
      addressCountry: "CA",
    },
    areaServed: { "@type": "State", name: "Québec" },
    sameAs: [site.facebook],
    priceRange: "$$",
  };

  return (
    <>
      <SetDocumentLang lang={t.htmlLang} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessJsonLd),
        }}
      />
      <div id="top" className="site-root flex min-h-screen flex-1 flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-gradient-accent focus:px-5 focus:py-2.5 focus:font-display focus:font-semibold focus:text-ink"
        >
          {t.shell.skipToContent}
        </a>
        <MotionProvider>
          <SiteHeader locale={locale} />
          <main id="main" className="site-main flex-1">
            {children}
          </main>
          <SiteFooter locale={locale} />
        </MotionProvider>
        <SmoothScroll />
      </div>
    </>
  );
}
