import BlogIndexPage from "@/components/pages/BlogIndexPage";
import { pageMetadata } from "@/lib/seo/metadata";

// Liste des articles Soro relue au plus toutes les heures
export const revalidate = 3600;

export const metadata = pageMetadata({
  locale: "en",
  frPath: "/blog",
  title:
    "Blog: Selling and Getting Value from Your IT Equipment",
  description:
    "Practical advice on selling your business IT equipment, erasing data securely and giving your equipment a second life.",
  absoluteTitle: true,
});

export default function Page() {
  return <BlogIndexPage locale="en" />;
}
