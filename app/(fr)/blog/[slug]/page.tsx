import type { Metadata } from "next";
import BlogPostPage, { blogPostMetadata } from "@/components/pages/BlogPostPage";
import { getPosts } from "@/lib/posts";

type Props = { params: { slug: string } };

// Articles Soro relus au plus toutes les heures ; les nouveaux slugs sont rendus à la demande.
export const revalidate = 3600;

export function generateStaticParams() {
  return getPosts("fr").map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return blogPostMetadata("fr", params.slug);
}

export default function Page({ params }: Props) {
  return <BlogPostPage locale="fr" slug={params.slug} />;
}
