import ContactPage from "@/components/pages/ContactPage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/contact",
  title:
    "Contact — Anthony Després, President",
  description:
    "Contact Anthony Després, President of Techno Lot, about selling your IT equipment. Guaranteed response within 24 hours.",
});

export default function Page() {
  return <ContactPage locale="en" />;
}
