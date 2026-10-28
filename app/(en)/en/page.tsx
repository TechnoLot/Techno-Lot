import HomePage from "@/components/pages/HomePage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/",
  title:
    "Bulk IT Equipment Buyback in Quebec | Techno Lot",
  description:
    "Techno Lot buys IT and electronic equipment lots from Quebec businesses: offer within 24 hours, free pickup, fast and guaranteed payment.",
  absoluteTitle: true,
});

export default function Page() {
  return <HomePage locale="en" />;
}
