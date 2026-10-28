import BlogIndexPage from "@/components/pages/BlogIndexPage";
import { pageMetadata } from "@/lib/seo/metadata";

// Liste des articles Soro relue au plus toutes les heures
export const revalidate = 3600;

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/blog",
  title:
    "Blogue : vendre et valoriser son matériel informatique",
  description:
    "Conseils pratiques pour vendre le matériel informatique de votre entreprise, effacer vos données en sécurité et donner une seconde vie à vos équipements.",
  absoluteTitle: true,
});

export default function Page() {
  return <BlogIndexPage locale="fr" />;
}
