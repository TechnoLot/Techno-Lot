import type { Metadata } from "next";
import AProposPage from "@/components/pages/AProposPage";

export const metadata: Metadata = {
  title: "About",
  description:
    "At Techno Lot, our passion for technology and our commitment to our clients set us apart. Discover the reference for equipment lot buyback in Québec.",
  alternates: {
    canonical: "/en/a-propos",
    languages: { "fr-CA": "/a-propos", "en-CA": "/en/a-propos" },
  },
};

export default function Page() {
  return <AProposPage locale="en" />;
}
