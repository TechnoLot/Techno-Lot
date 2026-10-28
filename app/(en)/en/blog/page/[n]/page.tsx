import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogIndexPage, { nombrePagesBlog } from "@/components/pages/BlogIndexPage";
import { getBlogFeed } from "@/lib/posts";

type Props = { params: { n: string } };

// Liste des articles Soro relue au plus toutes les heures ; les nouvelles pages sont rendues à la demande.
export const revalidate = 3600;

/** Numéro de page valide (2 et plus), sinon NaN. */
const numero = (n: string) => (/^[1-9][0-9]{0,3}$/.test(n) ? Number(n) : NaN);

export async function generateStaticParams() {
  const { posts } = await getBlogFeed("en");
  const total = nombrePagesBlog(posts.length);
  return Array.from({ length: Math.max(0, total - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: `Blog, page ${params.n}`,
    description:
      "All Techno Lot articles about IT and electronic equipment buyback, the circular economy and IT life-cycle management.",
    alternates: { canonical: `/en/blog/page/${params.n}` },
  };
}

export default function Page({ params }: Props) {
  const n = numero(params.n);
  if (!(n >= 2)) notFound();
  return <BlogIndexPage locale="en" page={n} />;
}
