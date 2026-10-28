import AProposPage from "@/components/pages/AProposPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/a-propos",
  title:
    "À propos de Techno Lot, acheteur de lots informatiques",
  description:
    "Établie à Mascouche, Techno Lot rachète le matériel informatique des entreprises du Québec : offre en 24 h, ramassage sans frais, données protégées.",
  absoluteTitle: true,
});

export default function Page() {
  return <AProposPage locale="fr" />;
}
