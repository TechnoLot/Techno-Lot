import type { Metadata } from "next";
import PriseEnChargePage from "@/components/pages/PriseEnChargePage";

export const metadata: Metadata = {
  title: "Prise en charge complète",
  description:
    "On s'occupe de tout ! De la validation de l'offre au transport sécurisé : emballage, chargement et acheminement de votre lot par l'équipe Techno Lot.",
  alternates: {
    canonical: "/prise-en-charge-complete",
    languages: {
      "fr-CA": "/prise-en-charge-complete",
      "en-CA": "/en/prise-en-charge-complete",
    },
  },
};

export default function Page() {
  return <PriseEnChargePage locale="fr" />;
}
