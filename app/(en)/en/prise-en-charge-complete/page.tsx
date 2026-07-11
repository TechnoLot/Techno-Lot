import type { Metadata } from "next";
import PriseEnChargePage from "@/components/pages/PriseEnChargePage";

export const metadata: Metadata = {
  title: "Full-Service Pickup",
  description:
    "We take care of everything! From offer validation to secure transport: packing, loading and delivery of your lot by the Techno Lot team.",
  alternates: {
    canonical: "/en/prise-en-charge-complete",
    languages: {
      "fr-CA": "/prise-en-charge-complete",
      "en-CA": "/en/prise-en-charge-complete",
    },
  },
};

export default function Page() {
  return <PriseEnChargePage locale="en" />;
}
