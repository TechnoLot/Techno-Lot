import type { Metadata } from "next";
import RootShell from "@/components/RootShell";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Techno Lot — Purchase of IT and Electronic Lots in Québec",
    template: "%s | Techno Lot",
  },
  description: site.descriptionEn,
  keywords: [
    "IT equipment buyback",
    "electronic lot purchase",
    "sell used IT equipment",
    "IT asset disposition Québec",
    "Techno Lot",
    "Mascouche",
  ],
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: site.name,
    title: "Techno Lot — Purchase of IT and Electronic Lots in Québec",
    description: site.descriptionEn,
    url: `${site.url}/en`,
    images: [{ url: "/logo.png", width: 1024, height: 614, alt: "Techno Lot" }],
  },
  alternates: {
    canonical: "/en",
    languages: { "fr-CA": "/", "en-CA": "/en" },
  },
};

export default function EnLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <RootShell locale="en">{children}</RootShell>;
}
