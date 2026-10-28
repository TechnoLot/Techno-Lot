import SoumissionPage from "@/components/pages/SoumissionPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/soumission",
  title:
    "Soumission — Rachat de matériel informatique et électronique",
  description:
    "Obtenez une estimation gratuite pour le rachat de votre matériel informatique et électronique, avec une réponse dans un délai de 24 heures. Unique au Québec.",
});

export default function Page() {
  return <SoumissionPage locale="fr" />;
}
