import AchatPage from "@/components/pages/AchatPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/achat-de-lot-description",
  title:
    "Ce que nous rachetons : informatique et électronique en lot",
  description:
    "Ordinateurs, serveurs, réseau, stockage, télécom, écrans : tout le matériel que Techno Lot rachète aux entreprises, même partiellement fonctionnel.",
  absoluteTitle: true,
});

export default function Page() {
  return <AchatPage locale="fr" />;
}
