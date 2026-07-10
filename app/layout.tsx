import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import FloatingCall from "@/components/FloatingCall";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default:
      "Techno Lot — Achat de lots informatiques et électroniques au Québec",
    template: "%s | Techno Lot",
  },
  description: site.description,
  keywords: [
    "achat de lots informatiques",
    "rachat matériel électronique",
    "rachat parc informatique",
    "lot électronique Québec",
    "Techno Lot",
    "Mascouche",
  ],
  openGraph: {
    type: "website",
    locale: "fr_CA",
    siteName: site.name,
    title:
      "Techno Lot — Achat de lots informatiques et électroniques au Québec",
    description: site.description,
    url: site.url,
    images: [{ url: "/logo.png", width: 1024, height: 614, alt: "Techno Lot" }],
  },
  alternates: { canonical: "/" },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: site.name,
  description: site.description,
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr-CA" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd),
          }}
        />
        <ScrollProgress />
        <Header />
        <main className="flex-1 pt-20">{children}</main>
        <Footer />
        <FloatingCall />
      </body>
    </html>
  );
}
