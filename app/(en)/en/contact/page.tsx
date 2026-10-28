import type { Metadata } from "next";
import ContactPage from "@/components/pages/ContactPage";

export const metadata: Metadata = {
  title: "Contact — Anthony Després, President",
  description:
    "Contact Anthony Després, President of Techno Lot, about selling your IT equipment. Guaranteed response within 24 hours.",
  alternates: {
    canonical: "/en/contact",
    languages: { "fr-CA": "/contact", "en-CA": "/en/contact" },
  },
};

export default function Page() {
  return <ContactPage locale="en" />;
}
