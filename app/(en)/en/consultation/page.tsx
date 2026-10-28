import ConsultationPage from "@/components/pages/ConsultationPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/consultation",
  title:
    "IT Lot Appraisal Within 24 Hours",
  description:
    "Describe your lot with photos and an inventory: Techno Lot makes you an offer within 24 hours, then picks up the equipment at no cost, anywhere in Quebec.",
});

export default function Page() {
  return <ConsultationPage locale="en" />;
}
