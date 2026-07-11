import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostPage from "@/components/pages/BlogPostPage";
import { getPost, getPosts } from "@/lib/posts";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return getPosts("fr").map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPost("fr", params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
      languages: {
        "fr-CA": `/blog/${post.slug}`,
        "en-CA": `/en/blog/${post.slug}`,
      },
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
    },
  };
}

export default function Page({ params }: Props) {
  const post = getPost("fr", params.slug);
  if (!post) notFound();
  return <BlogPostPage locale="fr" post={post} />;
}
