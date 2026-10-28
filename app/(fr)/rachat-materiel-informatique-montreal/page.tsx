import LocalPage from "@/components/pages/local/LocalPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/rachat-materiel-informatique-montreal",
  title: "Rachat de matériel informatique à Montréal",
  description:
    "Vous videz des bureaux ou renouvelez votre parc à Montréal ? Techno Lot rachète vos lots informatiques : offre en 24 h, ramassage sans frais.",
});

export default function Page() {
  return <LocalPage id="montreal" locale="fr" />;
}
