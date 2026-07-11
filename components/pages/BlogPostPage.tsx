import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import Reveal from "@/components/Reveal";
import CtaBanner from "@/components/CtaBanner";
import type { Post } from "@/lib/posts";
import { site } from "@/lib/site";
import { getDict, localePath, type Locale } from "@/lib/i18n";

const content = {
  fr: {
    ctaTitle: "Prêt à valoriser votre matériel TI ?",
    ctaText:
      "Obtenez une estimation gratuite de votre lot avec une réponse dans un délai de 24 heures.",
  },
  en: {
    ctaTitle: "Ready to get value from your IT equipment?",
    ctaText:
      "Get a free estimate for your lot with a response within 24 hours.",
  },
};

export default function BlogPostPage({
  locale,
  post,
}: {
  locale: Locale;
  post: Post;
}) {
  const t = content[locale];
  const dict = getDict(locale);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    inLanguage: dict.htmlLang,
    author: { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    mainEntityOfPage: `${site.url}${localePath(locale, `/blog/${post.slug}`)}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="container-site py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <Link
              href={localePath(locale, "/blog")}
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-accent-bright"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {dict.blog.backToBlog}
            </Link>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
              {post.title}
            </h1>
            <div className="mt-5 flex items-center gap-5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent" aria-hidden />
                {dict.blog.publishedOn} {post.dateLabel}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" aria-hidden />
                {post.readingTime}
              </span>
            </div>
            <div className="mt-8 h-px w-full bg-gradient-to-r from-accent/50 via-white/10 to-transparent" />
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative mt-10 aspect-[21/9] overflow-hidden rounded-2xl border border-white/10">
              <Image
                src={post.cover}
                alt={post.coverAlt}
                fill
                priority
                sizes="(min-width: 768px) 720px, 100vw"
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-night-950/45 via-transparent to-transparent"
                aria-hidden
              />
            </div>
          </Reveal>

          <div className="mt-10 space-y-10">
            {post.sections.map((section, i) => (
              <Reveal key={i} y={24}>
                <section>
                  {section.heading &&
                    (section.level === 3 ? (
                      <h3 className="font-display text-xl font-semibold text-white">
                        {section.heading}
                      </h3>
                    ) : (
                      <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                        <span className="text-gradient">{section.heading}</span>
                      </h2>
                    ))}
                  {section.paragraphs?.map((p, j) => (
                    <p key={j} className="mt-4 leading-relaxed text-slate-300">
                      {p}
                    </p>
                  ))}
                  {section.list && (
                    <ul className="mt-6 space-y-4">
                      {section.list.map((item) => (
                        <li key={item.title} className="glass p-5">
                          <p className="font-display font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">
                            {item.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      </article>

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} />
    </>
  );
}
