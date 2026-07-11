import type { Metadata } from "next";
import SoumissionPage from "@/components/pages/SoumissionPage";

export const metadata: Metadata = {
  title: "Quote — IT and Electronic Equipment Buyback",
  description:
    "Get a free estimate for the buyback of your IT and electronic equipment, with a response within 24 hours. One of a kind in Québec.",
  alternates: {
    canonical: "/en/soumission",
    languages: { "fr-CA": "/soumission", "en-CA": "/en/soumission" },
  },
};

export default function Page() {
  return <SoumissionPage locale="en" />;
}
