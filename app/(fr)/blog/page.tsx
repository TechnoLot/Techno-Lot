import type { Metadata } from "next";
import BlogIndexPage from "@/components/pages/BlogIndexPage";

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
