import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { posts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Conseils et actualités de Techno Lot sur le rachat de matériel informatique et électronique, l'économie circulaire et la gestion du cycle de vie TI.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Nos articles"
        subtitle="Conseils, bonnes pratiques et actualités sur le rachat de matériel informatique et l'économie circulaire."
      />

      <section className="container-site pb-24">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.1} className="h-full">
              <Link
                href={`/blog/${post.slug}`}
                className="glass glass-hover group flex h-full flex-col overflow-hidden"
              >
                <div
                  className="relative h-44 w-full"
                  style={{
                    background:
                      "radial-gradient(circle at 25% 30%, rgba(94,203,51,0.35), transparent 60%), radial-gradient(circle at 80% 75%, rgba(34,211,238,0.3), transparent 55%), #0F1628",
                  }}
                  aria-hidden
                >
                  <span className="absolute bottom-4 left-5 font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                    Écologie &amp; TI
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-accent" aria-hidden />
                      {post.dateLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-accent" aria-hidden />
                      {post.readingTime}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-xl font-semibold text-white transition-colors group-hover:text-accent-bright">
                    {post.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
                    {post.excerpt}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 font-display text-sm font-semibold text-accent">
                    Lire l&apos;article
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
