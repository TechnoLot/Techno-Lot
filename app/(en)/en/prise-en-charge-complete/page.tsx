import PriseEnChargePage from "@/components/pages/PriseEnChargePage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/prise-en-charge-complete",
  title:
    "Free IT Equipment Pickup",
  description:
    "Packing, loading and transport: our team picks up your IT equipment at no cost and with no minimum, anywhere in Quebec.",
});

export default function Page() {
  return <PriseEnChargePage locale="en" />;
}
