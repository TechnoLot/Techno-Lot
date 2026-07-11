import type { Metadata } from "next";
import RootShell from "@/components/RootShell";
import { site } from "@/lib/site";

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

export default function FrLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <RootShell locale="fr">{children}</RootShell>;
}
