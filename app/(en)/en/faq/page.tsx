import type { Metadata } from "next";
import FaqPage from "@/components/pages/FaqPage";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description:
    "Find answers to the most common questions about Techno Lot's electronic and IT lot buyback services.",
  alternates: {
    canonical: "/en/faq",
    languages: { "fr-CA": "/faq", "en-CA": "/en/faq" },
  },
};

export default function Page() {
  return <FaqPage locale="en" />;
}
