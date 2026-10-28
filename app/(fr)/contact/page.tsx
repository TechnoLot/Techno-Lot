import type { Metadata } from "next";
import ContactPage from "@/components/pages/ContactPage";

export const metadata: Metadata = {
  title: "Contact — Anthony Després, président",
  description:
    "Contactez Anthony Després, président de Techno Lot, pour le rachat de votre matériel informatique. Réponse garantie en 24 heures.",
  alternates: {
    canonical: "/contact",
    languages: { "fr-CA": "/contact", "en-CA": "/en/contact" },
  },
};

export default function Page() {
  return <ContactPage locale="fr" />;
}
