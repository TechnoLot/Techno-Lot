import type { Metadata } from "next";
import ContactPage from "@/components/pages/ContactPage";

export const metadata: Metadata = {
  title: "Contact — Get a Quote",
  description:
    "For a customized estimate of your technology equipment buyback, fill out our quote form. Guaranteed response within 24 hours.",
  alternates: {
    canonical: "/en/contact",
    languages: { "fr-CA": "/contact", "en-CA": "/en/contact" },
  },
};

export default function Page() {
  return <ContactPage locale="en" />;
}
