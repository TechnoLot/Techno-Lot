import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/posts";
import { site } from "@/lib/site";
import { localePath, locales } from "@/lib/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/a-propos",
    "/contact",
    "/blog",
    "/faq",
    "/soumission",
    "/consultation",
    "/achat-de-lot-description",
    "/prise-en-charge-complete",
  ];

  const pages = locales.flatMap((locale) =>
    paths.map((path) => {
      const localized = localePath(locale, path);
      return {
        url: `${site.url}${localized === "/" ? "" : localized}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: path === "/" ? 1 : 0.8,
      };
    }),
  );

  const blogPosts = locales.flatMap((locale) =>
    getPosts(locale).map((post) => ({
      url: `${site.url}${localePath(locale, `/blog/${post.slug}`)}`,
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  );

  return [...pages, ...blogPosts];
}
