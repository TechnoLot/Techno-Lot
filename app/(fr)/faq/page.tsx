import type { Metadata } from "next";
import FaqPage from "@/components/pages/FaqPage";

export const metadata: Metadata = {
  title: "FAQ — Questions fréquentes",
  description:
    "Découvrez les réponses aux questions fréquemment posées sur les services de rachat de lots électroniques et informatiques de Techno Lot.",
  alternates: {
    canonical: "/faq",
    languages: { "fr-CA": "/faq", "en-CA": "/en/faq" },
  },
};

export default function Page() {
  return <FaqPage locale="fr" />;
}
