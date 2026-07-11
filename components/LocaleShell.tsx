import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import FloatingCall from "@/components/FloatingCall";
import SetDocumentLang from "@/components/SetDocumentLang";
import { site } from "@/lib/site";
import { getDict, type Locale } from "@/lib/i18n";

/**
 * Habillage commun d'une section linguistique : en-tête, pied de page,
 * bouton d'appel et JSON-LD localisés, plus l'attribut lang du document.
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
      <ScrollProgress />
      <Header locale={locale} />
      <main className="flex-1 pt-20">{children}</main>
      <Footer locale={locale} />
      <FloatingCall locale={locale} />
    </>
  );
}
