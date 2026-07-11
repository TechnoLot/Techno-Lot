import type { Metadata } from "next";
import ConsultationPage from "@/components/pages/ConsultationPage";

export const metadata: Metadata = {
  title: "Lot Appraisal",
  description:
    "How lot appraisal works at Techno Lot: quote with photos and inventory, offer by email within 24 hours, free pickup.",
  alternates: {
    canonical: "/en/consultation",
    languages: { "fr-CA": "/consultation", "en-CA": "/en/consultation" },
  },
};

export default function Page() {
  return <ConsultationPage locale="en" />;
}
