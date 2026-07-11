import type { Metadata } from "next";
import SoumissionPage from "@/components/pages/SoumissionPage";

export const metadata: Metadata = {
  title: "Soumission — Rachat de matériel informatique et électronique",
  description:
    "Obtenez une estimation gratuite pour le rachat de votre matériel informatique et électronique, avec une réponse dans un délai de 24 heures. Unique au Québec.",
  alternates: {
    canonical: "/soumission",
    languages: { "fr-CA": "/soumission", "en-CA": "/en/soumission" },
  },
};

export default function Page() {
  return <SoumissionPage locale="fr" />;
}
