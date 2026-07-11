import type { Metadata } from "next";
import BlogIndexPage from "@/components/pages/BlogIndexPage";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Advice and news from Techno Lot about IT and electronic equipment buyback, the circular economy and IT life-cycle management.",
  alternates: {
    canonical: "/en/blog",
    languages: { "fr-CA": "/blog", "en-CA": "/en/blog" },
  },
};

export default function Page() {
  return <BlogIndexPage locale="en" />;
}
