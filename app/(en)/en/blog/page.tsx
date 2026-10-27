import type { Metadata } from "next";
import BlogIndexPage from "@/components/pages/BlogIndexPage";

// Liste des articles Soro relue au plus toutes les heures
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Advice and news from Techno Lot about IT and electronic equipment buyback, the circular economy and IT life-cycle management.",
  alternates: {
    canonical: "/en/blog",
    languages: { "fr-CA": "/blog", "en-CA": "/en/blog" },
  },
};

export default function Page() {
  return <BlogIndexPage locale="en" />;
}
