import PolitiqueConfidentialitePage from "@/components/pages/PolitiqueConfidentialitePage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/politique-de-confidentialite",
  title: "Politique de confidentialité",
  description:
    "Comment Techno Lot recueille, utilise et protège vos renseignements personnels (Loi 25) : formulaire de soumission, suivi publicitaire, conservation et vos droits.",
});

export default function Page() {
  return <PolitiqueConfidentialitePage locale="fr" />;
}
