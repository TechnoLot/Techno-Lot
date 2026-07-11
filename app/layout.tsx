import type { Metadata } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

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
  alternates: {
    canonical: "/",
    languages: { "fr-CA": "/", "en-CA": "/en" },
  },
};

/**
 * Layout racine unique : la langue du document est fr-CA par défaut et
 * corrigée côté client sur /en (voir SetDocumentLang dans LocaleShell).
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr-CA" className={`${inter.variable} ${chakraPetch.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">{children}</body>
    </html>
  );
}
