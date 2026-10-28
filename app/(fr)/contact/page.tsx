import ContactPage from "@/components/pages/ContactPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "fr",
  frPath: "/contact",
  title:
    "Contact — Anthony Després, président",
  description:
    "Contactez Anthony Després, président de Techno Lot, pour le rachat de votre matériel informatique. Réponse garantie en 24 heures.",
});

export default function Page() {
  return <ContactPage locale="fr" />;
}
