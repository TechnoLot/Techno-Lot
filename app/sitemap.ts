import type { MetadataRoute } from "next";
import { getListedBlogFeed } from "@/lib/posts";
import { localePath, locales } from "@/lib/i18n";
import { absoluteUrl, sitemapEntries } from "@/lib/seo/routes";

// Les articles Soro changent : le plan du site est régénéré au plus toutes les heures.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pages statiques : registre lib/seo/routes.ts (pages bilingues et pages en
  // français seulement). Pas de lastModified : aucune date de modification fiable.
  const pages = sitemapEntries();

  // Articles du blogue : seulement les articles indexables (voir lib/blog-seo.ts),
  // chacun à l'URL de sa langue (= sa canonical), daté de sa publication
  // (ou de sa mise à jour quand la source la donne).
  const feeds = await Promise.all(locales.map((locale) => getListedBlogFeed(locale)));
  const blogPosts = locales.flatMap((locale, i) =>
    feeds[i].posts.map((post) => ({
      url: absoluteUrl(localePath(locale, `/blog/${post.slug}`)),
      lastModified: new Date(post.updatedIsoDate ?? post.isoDate),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  );

  return [...pages, ...blogPosts];
}
