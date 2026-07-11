import type { Metadata } from "next";
import ContactPage from "@/components/pages/ContactPage";

export const metadata: Metadata = {
  title: "Contact — Soumission",
  description:
    "Pour une estimation sur mesure du rachat de votre matériel technologique, remplissez notre formulaire de soumission. Réponse garantie en 24 heures.",
  alternates: {
    canonical: "/contact",
    languages: { "fr-CA": "/contact", "en-CA": "/en/contact" },
  },
};

export default function Page() {
  return <ContactPage locale="fr" />;
}
