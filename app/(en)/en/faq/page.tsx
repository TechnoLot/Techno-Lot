import FaqPage from "@/components/pages/FaqPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/faq",
  title:
    "IT Equipment Buyback FAQ",
  description:
    "Offer within 24 hours, free pickup, two-step payment, data erasure: answers to common questions about selling your IT equipment.",
});

export default function Page() {
  return <FaqPage locale="en" />;
}
