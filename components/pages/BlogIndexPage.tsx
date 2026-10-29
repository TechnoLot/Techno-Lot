import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { HeroCrumbs } from "@/components/seo/Breadcrumbs";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Reveal } from "@/components/site/Reveal";
import { PrimaryButtonLink } from "@/components/site/Button";
import SoroBlogEmbed from "@/components/SoroBlogEmbed";
import PostImage from "@/components/blog/PostImage";
import LegacyPostRedirect from "@/components/blog/LegacyPostRedirect";
import { getListedBlogFeed, type PostSummary } from "@/lib/posts";
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
    pageOf: (n: number, total: number) => `Page ${n} sur ${total}`,
    paginationLabel: "Pages du blog",
    pageLabel: (n: number) => `Page ${n}`,
    prev: "Page précédente",
    next: "Page suivante",
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
    pageOf: (n: number, total: number) => `Page ${n} of ${total}`,
    paginationLabel: "Blog pages",
    pageLabel: (n: number) => `Page ${n}`,
    prev: "Previous page",
    next: "Next page",
    widgetTitle: "Recent posts",
    ctaTitle: "Have a lot of IT equipment to sell?",
    ctaText: "Describe your lot: we'll get back to you with a free estimate within 24 hours.",
    inFrench: "",
  },
};

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/** Articles par page : la page 1 compte aussi ses quatre articles mis en avant. */
export const BLOG_PAR_PAGE = 10;
const MIS_EN_AVANT = 4;

/** Nombre de pages du blog pour un nombre total d'articles. */
export function nombrePagesBlog(total: number): number {
  return total <= BLOG_PAR_PAGE ? 1 : 1 + Math.ceil((total - BLOG_PAR_PAGE) / BLOG_PAR_PAGE);
}

/** Chemin (non localisé) d'une page du blog : /blog, puis /blog/page/2, /blog/page/3… */
const cheminPage = (n: number) => (n <= 1 ? "/blog" : `/blog/page/${n}`);

/** Numéros à afficher : tous jusqu'à 7 pages, sinon première, dernière et voisines (null = « … »). */
function pagesVisibles(page: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const garde = [1, total, page - 1, page, page + 1]
    .filter((n, i, all) => n >= 1 && n <= total && all.indexOf(n) === i)
    .sort((a, b) => a - b);
  const out: (number | null)[] = [];
  garde.forEach((n, i) => {
    if (i > 0 && n - garde[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

const BTN_PAGE =
  "inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2.5 font-display text-sm font-semibold text-mist transition-colors hover:border-ink hover:bg-ink hover:text-white";

function Pagination({ locale, page, total }: { locale: Locale; page: number; total: number }) {
  const t = content[locale];
  const href = (n: number) => localePath(locale, cheminPage(n));
  return (
    <nav aria-label={t.paginationLabel} className="mt-14 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-line-strong pt-8">
      <div className="justify-self-start">
        {page > 1 && (
          <Link href={href(page - 1)} rel="prev" aria-label={t.prev} className={BTN_PAGE}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.prev}</span>
          </Link>
        )}
      </div>
      <p className="font-display text-sm font-semibold text-moss sm:hidden">{t.pageOf(page, total)}</p>
      <ol className="hidden items-center gap-1.5 sm:flex">
        {pagesVisibles(page, total).map((n, i) =>
          n === null ? (
            <li key={`e${i}`} aria-hidden="true" className="px-1 text-moss">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                aria-label={t.pageLabel(n)}
                aria-current={n === page ? "page" : undefined}
                className={`grid h-10 min-w-10 place-items-center rounded-full px-3 font-display text-sm font-semibold tabular-nums transition-colors ${
                  n === page ? "bg-ink text-white" : "text-mist hover:bg-white"
                }`}
              >
                {n}
              </Link>
            </li>
          ),
        )}
      </ol>
      <div className="justify-self-end">
        {page < total && (
          <Link href={href(page + 1)} rel="next" aria-label={t.next} className={BTN_PAGE}>
            <span className="hidden sm:inline">{t.next}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </nav>
  );
}

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

/**
 * Index du blog, paginé : 10 articles par page. La page 1 met quatre articles en avant
 * (à la une, puis les derniers) et liste les six suivants ; les pages 2 et plus
 * (/blog/page/2…) listent dix articles, regroupés par mois.
 */
export default async function BlogIndexPage({ locale, page = 1 }: { locale: Locale; page?: number }) {
  const t = content[locale];
  const dict = getDict(locale);
  // Articles de cette langue seulement, sans les articles consolidés
  const { posts, soroOk } = await getListedBlogFeed(locale);
  const href = (p: PostSummary) => localePath(locale, `/blog/${p.slug}`);
  const lang = (p: PostSummary) => (p.lang !== locale ? p.lang : undefined);

  const totalPages = nombrePagesBlog(posts.length);
  if (page > totalPages) notFound();
  const premiere = page === 1;

  const [featured, ...rest] = premiere ? posts : [];
  const lead = rest[0];
  const side = rest.slice(1, 3);
  const debut = premiere ? MIS_EN_AVANT : BLOG_PAR_PAGE * (page - 1);
  const archive = posts.slice(debut, BLOG_PAR_PAGE * page);

  const groups: { label: string; posts: PostSummary[] }[] = [];
  for (const p of archive) {
    const label = monthKey(locale, p.isoDate);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.posts.push(p);
    else groups.push({ label, posts: [p] });
  }

  return (
    <>
      {premiere && <LegacyPostRedirect basePath={localePath(locale, "/blog")} />}

      <PageHero
        title={t.title}
        size={premiere ? "default" : "compact"}
        breadcrumbs={<HeroCrumbs locale={locale} name={locale === "en" ? "Blog" : "Blogue"} frPath="/blog" />}
        intro={
          <>
            {t.intro}
            {t.inFrench && <span className="mt-2 block text-sm">{t.inFrench}</span>}
          </>
        }
      />

      {/* Chapitre bleu nuit (page 1 seulement) : article à la une + mise en page éditoriale */}
      {premiere && (
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
                      sizes="(min-width: 1024px) 640px, (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2.5rem)"
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
                          sizes="(min-width: 1024px) 620px, (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2.5rem)"
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
                              sizes="(min-width: 1024px) 380px, (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2.5rem)"
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
      )}

      {/* Chapitre menthe : publications de la page, regroupées par mois, puis la pagination */}
      {groups.length > 0 && (
        <section data-theme="mint" className="relative py-16 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-mist sm:text-4xl">{t.archive}</h2>
              <p className="font-display text-sm font-semibold text-emerald">
                {premiere ? t.count(posts.length) : t.pageOf(page, totalPages)}
              </p>
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

            {totalPages > 1 && <Pagination locale={locale} page={page} total={totalPages} />}
          </div>
        </section>
      )}

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} current={premiere ? "/blog" : undefined} />
    </>
  );
}

