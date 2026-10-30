import type { Metadata } from "next";
import BlogPostPage, { blogPostMetadata } from "@/components/pages/BlogPostPage";
import { getPosts } from "@/lib/posts";

type Props = { params: Promise<{ slug: string }> };

// Articles Soro relus au plus toutes les heures ; les nouveaux slugs sont rendus à la demande.
export const revalidate = 3600;

export function generateStaticParams() {
  return getPosts("fr").map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return blogPostMetadata("fr", params.slug);
}

export default async function Page(props: Props) {
  const params = await props.params;
  return <BlogPostPage locale="fr" slug={params.slug} />;
}
