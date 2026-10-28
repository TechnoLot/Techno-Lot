import CategoryPage from "@/components/pages/category/CategoryPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/rachat-equipements-reseau-telecom",
  title: "Rachat d'équipements réseau et télécom",
  description:
    "Switchs, routeurs, pare-feu, téléphones IP : Techno Lot rachète les équipements réseau et télécom des entreprises, en lot. Offre en 24 h.",
});

export default function Page() {
  return <CategoryPage id="reseau" />;
}
