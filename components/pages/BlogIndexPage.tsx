import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Reveal } from "@/components/site/Reveal";
import { PrimaryButtonLink } from "@/components/site/Button";
import SoroBlogEmbed from "@/components/SoroBlogEmbed";
import PostImage from "@/components/blog/PostImage";
import LegacyPostRedirect from "@/components/blog/LegacyPostRedirect";
import { getBlogFeed, type PostSummary } from "@/lib/posts";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import "./blog.css";

const content = {
  fr: {
    title: "Le blog Techno Lot",
    intro:
      "Conseils, bonnes pratiques et réponses concrètes sur le rachat de matériel informatique, l'effacement des données et l'économie circulaire au Québec.",
    latest: "Derniers articles",
    archive: "Toutes les publications",
    count: (n: number) => `${n} article${n > 1 ? "s" : ""}`,
    widgetTitle: "Publications récentes",
    ctaTitle: "Un lot de matériel informatique à vendre ?",
    ctaText: "Décrivez votre lot : nous vous répondons avec une estimation gratuite dans un délai de 24 heures.",
    inFrench: "",
  },
  en: {
    title: "The Techno Lot blog",
    intro:
      "Advice, best practices and practical answers about IT equipment buyback, data erasure and the circular economy in Québec.",
    latest: "Recent articles",
    archive: "All posts",
    count: (n: number) => `${n} article${n > 1 ? "s" : ""}`,
    widgetTitle: "Recent posts",
    ctaTitle: "Have a lot of IT equipment to sell?",
    ctaText: "Describe your lot: we'll get back to you with a free estimate within 24 hours.",
    inFrench: "Most of our articles are written in French.",
  },
};

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function Meta({ post, className = "" }: { post: PostSummary; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-moss ${className}`}>
      <time dateTime={post.isoDate.slice(0, 10)}>{post.dateLabel}</time>
      {post.readingTime && (
        <>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-emerald" />
          <span>{post.readingTime}</span>
        </>
      )}
    </p>
  );
}

function monthKey(locale: Locale, iso: string) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function BlogIndexPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  const dict = getDict(locale);
  const { posts, soroOk } = await getBlogFeed(locale);
  const href = (p: PostSummary) => localePath(locale, `/blog/${p.slug}`);
  const lang = (p: PostSummary) => (p.lang !== locale ? p.lang : undefined);

  const [featured, ...rest] = posts;
  const lead = rest[0];
  const side = rest.slice(1, 3);
  const archive = rest.slice(3);

  const groups: { label: string; posts: PostSummary[] }[] = [];
  for (const p of archive) {
    const label = monthKey(locale, p.isoDate);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.posts.push(p);
    else groups.push({ label, posts: [p] });
  }

  return (
    <>
      <LegacyPostRedirect basePath={localePath(locale, "/blog")} />

      <PageHero
        title={t.title}
        intro={
          <>
            {t.intro}
            {t.inFrench && <span className="mt-2 block text-sm">{t.inFrench}</span>}
          </>
        }
      />

      {/* Chapitre bleu nuit : article à la une + mise en page éditoriale */}
      <section data-theme="night" className="relative isolate overflow-hidden py-16 sm:py-24">
        <div aria-hidden="true" className="blog-glow blog-glow--tl" />
        <div aria-hidden="true" className="blog-glow blog-glow--br" />
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          {featured && (
            <article className="group relative grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="hero-item lg:col-span-7" style={d(0.1)}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-surface">
                  <PostImage
                    src={featured.image}
                    alt={featured.imageAlt}
                    sizes="(min-width: 1024px) 640px, 100vw"
                    priority
                    className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </div>
              </div>
              <div className="lg:col-span-5">
                <h2
                  lang={lang(featured)}
                  className="hero-item font-display text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-mist sm:text-4xl lg:text-[2.6rem]"
                  style={d(0.2)}
                >
                  <Link href={href(featured)} className="blog-cover-link">
                    {featured.title}
                  </Link>
                </h2>
                <Meta post={featured} className="hero-item mt-4" />
                {featured.excerpt && (
                  <p lang={lang(featured)} className="hero-item mt-5 text-base leading-relaxed text-moss sm:text-lg" style={d(0.26)}>
                    {featured.excerpt}
                  </p>
                )}
                <div className="hero-item relative z-[1] mt-8" style={d(0.32)}>
                  <PrimaryButtonLink href={href(featured)} className="uppercase">
                    {dict.blog.readArticle}
                  </PrimaryButtonLink>
                </div>
              </div>
            </article>
          )}

          {lead && (
            <div className="mt-20 sm:mt-28">
              <Reveal>
                <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-mist sm:text-4xl">{t.latest}</h2>
              </Reveal>
              <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
                <Reveal className="lg:col-span-7">
                  <article className="group relative">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface">
                      <PostImage
                        src={lead.image}
                        alt={lead.imageAlt}
                        sizes="(min-width: 1024px) 620px, 100vw"
                        className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                    <Meta post={lead} className="mt-6" />
                    <h3 lang={lang(lead)} className="mt-3 font-display text-2xl font-bold leading-tight text-mist sm:text-3xl">
                      <Link href={href(lead)} className="blog-cover-link">
                        {lead.title}
                      </Link>
                    </h3>
                    {lead.excerpt && (
                      <p lang={lang(lead)} className="mt-4 max-w-2xl leading-relaxed text-moss">
                        {lead.excerpt}
                      </p>
                    )}
                  </article>
                </Reveal>

                <div className="flex flex-col gap-10 lg:col-span-5 lg:border-l lg:border-line lg:pl-12">
                  {side.map((p, i) => (
                    <Reveal key={p.slug} delay={0.08 * (i + 1)}>
                      <article className="group relative">
                        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-surface">
                          <PostImage
                            src={p.image}
                            alt={p.imageAlt}
                            sizes="(min-width: 1024px) 420px, 100vw"
                            className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                          />
                        </div>
                        <Meta post={p} className="mt-5" />
                        <h3 lang={lang(p)} className="mt-2 font-display text-xl font-bold leading-snug text-mist">
                          <Link href={href(p)} className="blog-cover-link">
                            {p.title}
                          </Link>
                        </h3>
                      </article>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Repli : Soro indisponible → widget officiel, habillé aux couleurs du site */}
          {!soroOk && (
            <div className="mt-20 border-t border-line pt-14 sm:mt-28">
              <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-mist sm:text-4xl">{t.widgetTitle}</h2>
              <div className="mt-10">
                <SoroBlogEmbed theme="dark" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Chapitre menthe : archive complète, regroupée par mois */}
      {groups.length > 0 && (
        <section data-theme="mint" className="relative py-16 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-mist sm:text-4xl">{t.archive}</h2>
              <p className="font-display text-sm font-semibold text-emerald">{t.count(posts.length)}</p>
            </Reveal>

            <div className="mt-12 space-y-14">
              {groups.map((g) => (
                <div key={g.label} className="grid gap-4 lg:grid-cols-12 lg:gap-12">
                  <h3 className="font-display text-lg font-bold capitalize text-mist lg:col-span-3 lg:pt-6">
                    <span className="lg:sticky lg:top-[calc(var(--site-header-h)+1.5rem)]">{g.label}</span>
                  </h3>
                  <ul className="border-t border-line-strong lg:col-span-9">
                    {g.posts.map((p) => (
                      <li key={p.slug} className="border-b border-line">
                        <Link href={href(p)} className="blog-row group">
                          <time dateTime={p.isoDate.slice(0, 10)} className="blog-row__date text-sm text-moss">
                            {p.dateLabel}
                          </time>
                          <span className="min-w-0">
                            <span lang={lang(p)} className="block font-display text-lg font-semibold leading-snug text-mist transition-colors group-hover:text-emerald sm:text-xl">
                              {p.title}
                            </span>
                            {p.excerpt && (
                              <span lang={lang(p)} className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-moss">
                                {p.excerpt}
                              </span>
                            )}
                          </span>
                          <ArrowUpRight
                            aria-hidden="true"
                            className="blog-row__arrow h-5 w-5 shrink-0 text-emerald transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} />
    </>
  );
}

