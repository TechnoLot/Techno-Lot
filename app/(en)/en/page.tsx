import type { Metadata } from "next";
import HomePage from "@/components/pages/HomePage";

export const metadata: Metadata = {
  title:
    "Techno Lot — The Specialist in Purchasing IT and Electronic Lots in Québec",
  description:
    "We give your used high-tech equipment a second life — and we pay you for it. Response within 24 hours, free pickup, fast and guaranteed payment. One of a kind in Québec.",
  alternates: {
    canonical: "/en",
    languages: { "fr-CA": "/", "en-CA": "/en" },
  },
};

export default function Page() {
  return <HomePage locale="en" />;
}
