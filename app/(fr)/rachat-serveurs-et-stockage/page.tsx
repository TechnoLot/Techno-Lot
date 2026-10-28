import CategoryPage from "@/components/pages/category/CategoryPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/rachat-serveurs-et-stockage",
  title: "Rachat de serveurs usagés et de stockage",
  description:
    "Décommissionnement d'une salle de serveurs ou d'un centre de données ? Techno Lot rachète serveurs, baies de stockage et composants en lot.",
});

export default function Page() {
  return <CategoryPage id="serveurs" />;
}
