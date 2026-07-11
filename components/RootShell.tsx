import type { ReactNode } from "react";
import { Chakra_Petch, Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import FloatingCall from "@/components/FloatingCall";
import { site } from "@/lib/site";
import { getDict, type Locale } from "@/lib/i18n";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/**
 * Enveloppe <html>/<body> commune aux deux layouts racine (fr et en) :
 * polices, en-tête, pied de page, bouton d'appel et JSON-LD localisés.
 */
export default function RootShell({
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
    <html lang={t.htmlLang} className={`${inter.variable} ${chakraPetch.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
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
      </body>
    </html>
  );
}
