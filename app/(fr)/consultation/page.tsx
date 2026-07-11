import type { Metadata } from "next";
import ConsultationPage from "@/components/pages/ConsultationPage";

export const metadata: Metadata = {
  title: "Estimation de votre lot",
  description:
    "Comment fonctionne l'estimation de votre lot chez Techno Lot : soumission avec photos et inventaire, offre par courriel en 24 heures, récupération sans frais.",
  alternates: {
    canonical: "/consultation",
    languages: { "fr-CA": "/consultation", "en-CA": "/en/consultation" },
  },
};

export default function Page() {
  return <ConsultationPage locale="fr" />;
}
