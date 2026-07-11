import type { Metadata } from "next";
import AProposPage from "@/components/pages/AProposPage";

export const metadata: Metadata = {
  title: "À Propos",
  description:
    "Chez Techno Lot, notre passion pour la technologie et notre engagement envers nos clients nous démarquent. Découvrez la référence en matière de rachat de lots au Québec.",
  alternates: {
    canonical: "/a-propos",
    languages: { "fr-CA": "/a-propos", "en-CA": "/en/a-propos" },
  },
};

export default function Page() {
  return <AProposPage locale="fr" />;
}
