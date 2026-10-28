import PolitiqueConfidentialitePage from "@/components/pages/PolitiqueConfidentialitePage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/politique-de-confidentialite",
  title: "Privacy Policy",
  description:
    "How Techno Lot collects, uses and protects your personal information (Québec Law 25): quote form, ad tracking, retention and your rights.",
});

export default function Page() {
  return <PolitiqueConfidentialitePage locale="en" />;
}
