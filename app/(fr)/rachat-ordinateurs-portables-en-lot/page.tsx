import CategoryPage from "@/components/pages/category/CategoryPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/rachat-ordinateurs-portables-en-lot",
  title: "Rachat d'ordinateurs portables en lot",
  description:
    "Portables, postes de travail, écrans : Techno Lot rachète le parc informatique des entreprises en lot, même partiellement fonctionnel. Offre en 24 h.",
});

export default function Page() {
  return <CategoryPage id="portables" />;
}
