import type { Metadata } from "next";
import BlogIndexPage from "@/components/pages/BlogIndexPage";

// Liste des articles Soro relue au plus toutes les heures
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Conseils et actualités de Techno Lot sur le rachat de matériel informatique et électronique, l'économie circulaire et la gestion du cycle de vie TI.",
  alternates: {
    canonical: "/blog",
    languages: { "fr-CA": "/blog", "en-CA": "/en/blog" },
  },
};

export default function Page() {
  return <BlogIndexPage locale="fr" />;
}
