import FaqPage from "@/components/pages/FaqPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/faq",
  title:
    "FAQ sur le rachat de matériel informatique",
  description:
    "Offre en 24 h, ramassage gratuit, paiement en deux temps, effacement des données : vos questions sur le rachat de matériel informatique.",
});

export default function Page() {
  return <FaqPage locale="fr" />;
}
