import type { Metadata } from "next";
import AchatPage from "@/components/pages/AchatPage";

export const metadata: Metadata = {
  title: "What We Buy",
  description:
    "Computers, servers, network equipment, storage, telecommunications, office equipment, monitors… Techno Lot buys ALL types of electronic equipment in Québec.",
  alternates: {
    canonical: "/en/achat-de-lot-description",
    languages: {
      "fr-CA": "/achat-de-lot-description",
      "en-CA": "/en/achat-de-lot-description",
    },
  },
};

export default function Page() {
  return <AchatPage locale="en" />;
}
