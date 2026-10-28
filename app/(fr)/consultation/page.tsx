import ConsultationPage from "@/components/pages/ConsultationPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/consultation",
  title:
    "Estimation de votre lot informatique en 24 h",
  description:
    "Décrivez votre lot, photos et inventaire à l'appui : Techno Lot vous fait une offre en 24 h, puis ramasse le matériel sans frais, partout au Québec.",
});

export default function Page() {
  return <ConsultationPage locale="fr" />;
}
