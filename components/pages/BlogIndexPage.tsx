import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { getPosts } from "@/lib/posts";
import { getDict, localePath, type Locale } from "@/lib/i18n";

const content = {
  fr: {
    eyebrow: "Blog",
    title: "Nos articles",
    subtitle:
      "Conseils, bonnes pratiques et actualités sur le rachat de matériel informatique et l'économie circulaire.",
  },
  en: {
    eyebrow: "Blog",
    title: "Our articles",
    subtitle:
      "Advice, best practices and news about IT equipment buyback and the circular economy.",
  },
};

export default function BlogIndexPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  const dict = getDict(locale);
  const posts = getPosts(locale);

  return (
    <>
      <PageHero
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        image="/photos/datacenter.jpg"
      />

      <section className="container-site pb-24">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.1} className="h-full">
              <Link
                href={localePath(locale, `/blog/${post.slug}`)}
                className="glass glass-hover group flex h-full flex-col overflow-hidden"
              >
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={post.cover}
                    alt={post.coverAlt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-night-950/85 via-night-950/25 to-transparent"
                    aria-hidden
                  />
                  <span className="absolute bottom-4 left-5 font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                    {dict.blog.category}
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
                    {dict.blog.readArticle}
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
