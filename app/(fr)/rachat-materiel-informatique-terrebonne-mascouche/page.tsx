import LocalPage from "@/components/pages/local/LocalPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/rachat-materiel-informatique-terrebonne-mascouche",
  title: "Rachat de matériel informatique à Terrebonne et Mascouche",
  absoluteTitle: true,
  description:
    "Votre entreprise de Terrebonne ou de Mascouche renouvelle son parc ? Techno Lot rachète vos lots informatiques : offre en 24 h, ramassage sans frais.",
});

export default function Page() {
  return <LocalPage id="terrebonne-mascouche" locale="fr" />;
}
