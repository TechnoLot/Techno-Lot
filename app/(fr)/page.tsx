import type { Metadata } from "next";
import HomePage from "@/components/pages/HomePage";

export const metadata: Metadata = {
  title:
    "Techno Lot — Le spécialiste de l'achat de lots informatiques et électroniques au Québec",
  description:
    "Nous donnons une seconde vie à votre matériel high-tech usagé — et on vous paie pour ça. Réponse en 24 h, ramassage gratuit, paiement rapide et garanti. Unique au Québec.",
  alternates: {
    canonical: "/",
    languages: { "fr-CA": "/", "en-CA": "/en" },
  },
};

export default function Page() {
  return <HomePage locale="fr" />;
}
