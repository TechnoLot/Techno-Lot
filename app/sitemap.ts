import type { MetadataRoute } from "next";
import { getBlogFeed, getPosts } from "@/lib/posts";
import { site } from "@/lib/site";
import { localePath, locales } from "@/lib/i18n";
import { absoluteUrl, seoRoutes } from "@/lib/seo/routes";

// Les articles Soro changent : le plan du site est régénéré au plus toutes les heures.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pages statiques : registre lib/seo/routes.ts, dans les deux langues.
  // Pas de lastModified : aucune date de modification fiable pour ces pages.
  const pages = seoRoutes.flatMap((route) =>
    locales.map((locale) => ({
      url: absoluteUrl(route[locale]),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
  );

  const blogPosts = locales.flatMap((locale) =>
    getPosts(locale).map((post) => ({
      url: `${site.url}${localePath(locale, `/blog/${post.slug}`)}`,
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  );

  // Articles publiés sur Soro : rédigés en français, leur version /en a pour
  // URL canonique la version française, seule listée ici.
  const { posts } = await getBlogFeed("fr");
  const soroPosts = posts
    .filter((post) => post.source === "soro")
    .map((post) => ({
      url: `${site.url}${localePath("fr", `/blog/${post.slug}`)}`,
      lastModified: new Date(post.isoDate),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    }));

  return [...pages, ...blogPosts, ...soroPosts];
}
