import type { Metadata } from "next";
import AchatPage from "@/components/pages/AchatPage";

export const metadata: Metadata = {
  title: "Ce que nous rachetons",
  description:
    "Ordinateurs, serveurs, équipements réseau, stockage, télécommunication, bureautique, écrans… Techno Lot rachète TOUT type de matériel électronique au Québec.",
  alternates: {
    canonical: "/achat-de-lot-description",
    languages: {
      "fr-CA": "/achat-de-lot-description",
      "en-CA": "/en/achat-de-lot-description",
    },
  },
};

export default function Page() {
  return <AchatPage locale="fr" />;
}
