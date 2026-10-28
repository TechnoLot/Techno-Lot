import LocalPage from "@/components/pages/local/LocalPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/rachat-materiel-informatique-laval",
  title: "Rachat de matériel informatique à Laval",
  description:
    "Votre entreprise de Laval remplace ses ordinateurs ou ferme un local ? Techno Lot rachète vos lots informatiques et électroniques. Offre en 24 h.",
});

export default function Page() {
  return <LocalPage id="laval" locale="fr" />;
}
