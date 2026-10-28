import LocalPage from "@/components/pages/local/LocalPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/rachat-materiel-informatique-rive-nord",
  title: "Rachat de matériel informatique sur la Rive-Nord",
  description:
    "Blainville, Boisbriand, Sainte-Thérèse, Mirabel, Saint-Eustache, Saint-Jérôme, Repentigny : Techno Lot rachète les lots informatiques des entreprises.",
});

export default function Page() {
  return <LocalPage id="rive-nord" locale="fr" />;
}
