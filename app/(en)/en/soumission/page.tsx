import SoumissionPage from "@/components/pages/SoumissionPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/soumission",
  title:
    "Quote — IT and Electronic Equipment Buyback",
  description:
    "Get a free estimate for the buyback of your IT and electronic equipment, with a response within 24 hours. One of a kind in Québec.",
});

export default function Page() {
  return <SoumissionPage locale="en" />;
}
