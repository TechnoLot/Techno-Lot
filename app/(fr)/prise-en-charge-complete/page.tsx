import PriseEnChargePage from "@/components/pages/PriseEnChargePage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/prise-en-charge-complete",
  title:
    "Ramassage de matériel informatique sans frais",
  description:
    "Emballage, chargement et transport : notre équipe récupère votre matériel informatique sans frais et sans minimum, partout au Québec.",
});

export default function Page() {
  return <PriseEnChargePage locale="fr" />;
}
