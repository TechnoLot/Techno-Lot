import LocalPage from "@/components/pages/local/LocalPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/rachat-materiel-informatique-montreal",
  title: "IT Equipment Buyback in Montreal",
  description:
    "Surplus laptops, servers or network gear in Montreal? Techno Lot buys business IT equipment in bulk: offer within 24 h, free pickup.",
});

export default function Page() {
  return <LocalPage id="montreal" locale="en" />;
}
