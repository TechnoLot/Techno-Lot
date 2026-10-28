import HomePage from "@/components/pages/HomePage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/",
  title:
    "Rachat de matériel informatique en lot au Québec | Techno Lot",
  description:
    "Techno Lot rachète les lots informatiques et électroniques des entreprises du Québec : offre en 24 h, ramassage gratuit, paiement rapide et garanti.",
  absoluteTitle: true,
});

export default function Page() {
  return <HomePage locale="fr" />;
}
