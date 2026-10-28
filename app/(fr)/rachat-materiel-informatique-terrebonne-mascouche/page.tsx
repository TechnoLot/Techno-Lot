import LocalPage from "@/components/pages/local/LocalPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/rachat-materiel-informatique-terrebonne-mascouche",
  title: "Rachat de matériel informatique à Terrebonne et Mascouche",
  absoluteTitle: true,
  description:
    "Techno Lot est établie à Mascouche, à quelques minutes de Terrebonne. Nous rachetons les lots informatiques des entreprises de la MRC Les Moulins.",
});

export default function Page() {
  return <LocalPage id="terrebonne-mascouche" locale="fr" />;
}
