import AProposPage from "@/components/pages/AProposPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/a-propos",
  title:
    "About Techno Lot, Buyer of IT Equipment Lots",
  description:
    "Based in Mascouche, Techno Lot buys IT equipment from businesses across Quebec: offer within 24 hours, free pickup, protected data.",
  absoluteTitle: true,
});

export default function Page() {
  return <AProposPage locale="en" />;
}
