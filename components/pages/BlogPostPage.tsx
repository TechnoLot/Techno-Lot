import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Reveal } from "@/components/site/Reveal";
import PostImage from "@/components/blog/PostImage";
import ReadingProgress from "@/components/blog/ReadingProgress";
import ShareButtons from "@/components/blog/ShareButtons";
import {
  getBlogFeed,
  getPost,
  getSoroArticle,
  readingTimeLabel,
  slugifyHeading,
  type ArticleHeading,
  type Post,
  type PostSummary,
} from "@/lib/posts";
import { site } from "@/lib/site";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import "./blog.css";

const content = {
  fr: {
    toc: "Dans cet article",
    share: "Partager",
    copy: "Copier le lien",
    copied: "Lien copié",
    email: "Envoyer par courriel",
    progress: "Progression de la lecture",
    next: "Article suivant",
    allPosts: "Tous les articles",
    ctaTitle: "Prêt à valoriser votre matériel TI ?",
    ctaText: "Obtenez une estimation gratuite de votre lot avec une réponse dans un délai de 24 heures.",
    frenchOnly: "",
  },
  en: {
    toc: "In this article",
    share: "Share",
    copy: "Copy link",
    copied: "Link copied",
    email: "Send by email",
    progress: "Reading progress",
    next: "Next article",
    allPosts: "All articles",
    ctaTitle: "Ready to get value from your IT equipment?",
    ctaText: "Get a free estimate for your lot with a response within 24 hours.",
    frenchOnly: "This article is only available in French.",
  },
};

export type BlogArticle = {
  summary: PostSummary;
  readingTime: string;
  headings: ArticleHeading[];
  local?: Post;
  html?: string;
};

/** Article local (lib/posts.ts) ou Soro, prêt à afficher ; null s'il n'existe pas. */
export async function loadArticle(locale: Locale, slug: string): Promise<BlogArticle | null> {
  const local = getPost(locale, slug);
  if (local) {
    return {
      summary: {
        slug: local.slug,
        title: local.title,
        excerpt: local.excerpt,
        isoDate: local.date,
        dateLabel: local.dateLabel,
        image: local.cover,
        imageAlt: local.coverAlt,
        readingTime: local.readingTime,
        source: "local",
        lang: locale,
      },
      readingTime: local.readingTime,
      headings: local.sections
        .filter((s) => s.heading && s.level !== 3)
        .map((s) => ({ id: slugifyHeading(s.heading!), text: s.heading! })),
      local,
    };
  }
  const soro = await getSoroArticle(locale, slug);
  if (!soro) return null;
  return {
    summary: soro.summary,
    readingTime: readingTimeLabel(locale, soro.minutes),
    headings: soro.headings,
    html: soro.html,
  };
}

/** Métadonnées d'un article (routes /blog/[slug] et /en/blog/[slug]). */
export async function blogPostMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const article = await loadArticle(locale, slug);
  if (!article) return {};
  const { summary } = article;
  const fr = `/blog/${summary.slug}`;
  const en = `/en/blog/${summary.slug}`;
  // Articles Soro : rédigés en français seulement → la version /en pointe vers l'URL française
  const frenchOnly = summary.source === "soro";
  return {
    title: summary.title,
    description: summary.excerpt,
    alternates: frenchOnly
      ? { canonical: fr, languages: { "fr-CA": fr } }
      : { canonical: locale === "fr" ? fr : en, languages: { "fr-CA": fr, "en-CA": en } },
    openGraph: {
      type: "article",
      title: summary.title,
      description: summary.excerpt,
      publishedTime: summary.isoDate,
      ...(summary.image ? { images: [summary.image] } : {}),
    },
  };
}

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function LocalBody({ post }: { post: Post }) {
  return (
    <>
      {post.sections.map((section, i) => (
        <section key={i}>
          {section.heading &&
            (section.level === 3 ? (
              <h3>{section.heading}</h3>
            ) : (
              <h2 id={slugifyHeading(section.heading)}>{section.heading}</h2>
            ))}
          {section.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
          {section.list && (
            <ul>
              {section.list.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong> : {item.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}

export default async function BlogPostPage({ locale, slug }: { locale: Locale; slug: string }) {
  const article = await loadArticle(locale, slug);
  if (!article) notFound();

  const t = content[locale];
  const dict = getDict(locale);
  const { summary } = article;
  const contentLang = summary.lang !== locale ? summary.lang : undefined;
  const path = localePath(locale, `/blog/${summary.slug}`);
  const url = `${site.url}${path}`;

  const { posts } = await getBlogFeed(locale);
  const idx = posts.findIndex((p) => p.slug === summary.slug);
  const candidate = idx >= 0 ? posts[idx + 1] ?? posts[0] : posts[0];
  const next = candidate && candidate.slug !== summary.slug ? candidate : null;

  const shareLabels = { title: t.share, copy: t.copy, copied: t.copied, email: t.email };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: summary.title,
    description: summary.excerpt,
    datePublished: summary.isoDate,
    inLanguage: summary.lang === "fr" ? "fr-CA" : "en-CA",
    ...(summary.image ? { image: summary.image.startsWith("/") ? `${site.url}${summary.image}` : summary.image } : {}),
    author: { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    mainEntityOfPage: url,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <ReadingProgress targetId="article-body" label={t.progress} />

      {/* En-tête : chapitre bleu nuit (lueurs vertes) */}
      <header
        data-under-header=""
        data-theme="night"
        className="relative isolate overflow-hidden pb-36 pt-32 sm:pb-48 sm:pt-40"
      >
        <div aria-hidden="true" className="blog-glow blog-glow--tl" />
        <div aria-hidden="true" className="blog-glow blog-glow--br" />
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Link
            href={localePath(locale, "/blog")}
            className="hero-item inline-flex items-center gap-2 text-sm font-medium text-moss transition-colors hover:text-emerald"
            style={d(0)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {dict.blog.backToBlog}
          </Link>
          <h1
            lang={contentLang}
            className="hero-item mt-8 max-w-4xl font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-mist sm:text-5xl lg:text-6xl"
            style={d(0.06)}
          >
            {summary.title}
          </h1>
          <p className="hero-item mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-moss sm:text-base" style={d(0.14)}>
            <span>
              {dict.blog.publishedOn} <time dateTime={summary.isoDate.slice(0, 10)}>{summary.dateLabel}</time>
            </span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-emerald" />
            <span>{article.readingTime}</span>
            {t.frenchOnly && contentLang && (
              <>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-emerald" />
                <span>{t.frenchOnly}</span>
              </>
            )}
          </p>
        </div>
      </header>

      {/* Corps : chapitre clair, image qui chevauche l'en-tête */}
      <div data-theme="light" className="relative pb-16 sm:pb-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div
            className="hero-item relative -mt-24 aspect-[16/9] overflow-hidden rounded-3xl bg-surface sm:-mt-36 lg:aspect-[21/9]"
            style={d(0.2)}
          >
            <PostImage src={summary.image} alt={summary.imageAlt} sizes="(min-width: 1152px) 1088px, 100vw" priority />
          </div>

          <div className="mt-12 grid gap-12 sm:mt-16 lg:grid-cols-12">
            <aside className="hidden lg:col-span-3 lg:block">
              <div className="sticky top-[calc(var(--site-header-h)+2rem)] space-y-10">
                {article.headings.length > 1 && (
                  <nav aria-label={t.toc}>
                    <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-moss">{t.toc}</p>
                    <ol className="mt-4 space-y-3 border-l border-line">
                      {article.headings.map((h) => (
                        <li key={h.id}>
                          <a href={`#${h.id}`} lang={contentLang} className="blog-toc-link">
                            {h.text}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                )}
                <ShareButtons url={url} title={summary.title} labels={shareLabels} />
              </div>
            </aside>

            <div className="lg:col-span-8 lg:col-start-5">
              <article id="article-body" lang={contentLang} className="blog-prose">
                {article.local ? (
                  <LocalBody post={article.local} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: article.html ?? "" }} />
                )}
              </article>

              <div className="mt-14 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-8">
                <ShareButtons url={url} title={summary.title} labels={shareLabels} />
                <Link
                  href={localePath(locale, "/blog")}
                  className="inline-flex items-center gap-2 font-display text-sm font-semibold text-emerald hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {t.allPosts}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Article suivant : chapitre vert profond */}
      {next && (
        <section data-theme="deep" className="relative isolate overflow-hidden py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <Reveal>
              <article className="group relative grid items-center gap-8 md:grid-cols-12 md:gap-12">
                <div className="md:col-span-7 md:order-2">
                  <p className="font-display text-sm font-semibold text-emerald">{t.next}</p>
                  <h2
                    lang={next.lang !== locale ? next.lang : undefined}
                    className="mt-3 font-display text-2xl font-bold leading-tight text-mist sm:text-3xl lg:text-4xl"
                  >
                    <Link href={localePath(locale, `/blog/${next.slug}`)} className="blog-cover-link">
                      {next.title}
                    </Link>
                  </h2>
                  <p className="mt-4 text-sm text-moss">{next.dateLabel}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-emerald">
                    {dict.blog.readArticle}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
                <div className="md:col-span-5 md:order-1">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface">
                    <PostImage
                      src={next.image}
                      alt=""
                      sizes="(min-width: 768px) 440px, 100vw"
                      className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  </div>
                </div>
              </article>
            </Reveal>
          </div>
        </section>
      )}

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} />
    </>
  );
}
