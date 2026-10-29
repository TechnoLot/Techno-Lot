import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Reveal } from "@/components/site/Reveal";
import { Accordion } from "@/components/site/Accordion";
import { GhostButtonLink, PrimaryButtonLink } from "@/components/site/Button";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { CATEGORY_FALLBACK, CATEGORY_PAGES, getLocalPage, type LocalPageId } from "@/lib/seo/local-pages";
import { counterpartPath, findRoute } from "@/lib/seo/routes";
import { faqJsonLd, serviceJsonLd } from "@/lib/seo/schema";
import { B, Chapter, ChapterTitle } from "../services/Chapter";
import "../pages-services.css";

/** Page du registre (chemin français) disponible dans `locale`, sinon undefined. */
function registeredPath(frPath: string, locale: Locale): string | undefined {
  const route = findRoute(frPath);
  if (!route || route.fr !== frPath) return undefined;
  if (locale === "en" && !route.en) return undefined;
  return counterpartPath(frPath, locale);
}

/**
 * Gabarit des pages locales (« rachat de matériel informatique à <ville> »),
 * composant serveur. Contenu : lib/seo/local-pages.ts. Le héros n'a aucune
 * révélation au défilement (LCP) ; les Reveal ne commencent qu'en dessous.
 */
export default function LocalPage({ id, locale }: { id: LocalPageId; locale: Locale }) {
  const t = getLocalPage(id, locale);
  const pagePath = counterpartPath(t.frPath, locale);
  const homePath = localePath(locale, "/");

  const nearby = t.nearby.items
    .map((item) => ({ ...item, href: registeredPath(item.frPath, locale) }))
    .filter((item): item is typeof item & { href: string } => Boolean(item.href));

  return (
    <>
      <JsonLd
        data={[
          serviceJsonLd({
            name: t.service.name,
            description: t.service.description,
            path: t.frPath,
            areaServed: [t.city],
            locale,
          }),
          faqJsonLd(t.faq.items),
        ]}
      />

      <PageHero
        size="compact"
        title={t.hero.title}
        intro={t.hero.intro}
        image={{ kind: "object", src: "/images/palette/obj-pile-portables.webp", natural: { width: 546, height: 298 }, width: 86, alt: t.hero.imageAlt }}
        breadcrumbs={
          <Breadcrumbs
            locale={locale}
            items={[
              { name: t.breadcrumbHome, path: homePath },
              { name: t.city, path: pagePath },
            ]}
          />
        }
      >
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <PrimaryButtonLink href={localePath(locale, "/soumission")}>{t.hero.cta}</PrimaryButtonLink>
          <GhostButtonLink href={site.phoneHref}>
            {t.hero.call} {site.phone}
          </GhostButtonLink>
        </div>
      </PageHero>

      {/* 1. Blanc : ce que nous rachetons, chaque famille mène à sa page */}
      <Chapter theme="light" aria-labelledby="local-categories">
        <ChapterTitle id="local-categories" intro={t.categories.intro}>
          {t.categories.title}
        </ChapterTitle>
        <ul className="mt-14 grid gap-x-12 sm:grid-cols-2">
          {t.categories.items.map((c, i) => {
            const href = registeredPath(CATEGORY_PAGES[c.key], locale) ?? localePath(locale, CATEGORY_FALLBACK);
            return (
              <li key={c.key}>
                <Reveal delay={(i % 2) * 0.07} className="border-t border-line-strong py-7">
                  <h3 className="font-display text-xl font-bold leading-snug text-mist sm:text-2xl">
                    <Link
                      href={href}
                      className="group inline-flex items-center gap-2 underline-offset-4 hover:underline focus-visible:underline"
                    >
                      {c.title}
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                    </Link>
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-moss">{c.text}</p>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Chapter>

      {/* 2. Bleu nuit : les quatre avantages */}
      <Chapter theme="night" glow="both" aria-labelledby="local-avantages">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <ChapterTitle id="local-avantages" size="md">
              {t.advantages.title}
            </ChapterTitle>
          </div>
          <ol className="lg:col-span-7">
            {t.advantages.items.map((a, i) => (
              <li key={a.title}>
                <Reveal delay={0.08 + i * 0.08} className="flex gap-5 border-t border-line py-6">
                  <span className="mt-1 font-display text-sm font-bold tabular-nums text-emerald">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold leading-snug text-mist">{a.title}</h3>
                    <p className="mt-2 text-base leading-relaxed text-moss sm:text-lg">{a.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </Chapter>

      {/* 3. Vert profond : la ville */}
      <Chapter theme="deep" glow="right" aria-labelledby="local-ville">
        <ChapterTitle id="local-ville">{t.local.title}</ChapterTitle>
        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            {t.local.paragraphs.map((p, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <p className="text-base leading-relaxed text-moss sm:text-lg">{p}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.12} className="lg:col-span-5">
            <h3 className="font-display text-xl font-bold leading-snug text-mist">{t.local.areasTitle}</h3>
            {t.local.areas.map((area) => (
              <p key={area.label} className="mt-4 text-[15px] leading-relaxed text-moss">
                <B>
                  {area.label}
                  {locale === "fr" ? " :" : ":"}
                </B>{" "}
                {area.list}
              </p>
            ))}
          </Reveal>
        </div>
      </Chapter>

      {/* 4. Lime : les quatre étapes */}
      <Chapter theme="lime" aria-labelledby="local-etapes">
        <ChapterTitle id="local-etapes">{t.steps.title}</ChapterTitle>
        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {t.steps.items.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={0.1 + i * 0.09} y={24}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0a0f1c] font-display text-lg font-bold text-[#8BE95F]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 font-display text-2xl font-bold leading-tight text-ink">{step.title}</h3>
                <p className="mt-2 max-w-xs text-base leading-relaxed text-moss">{step.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Chapter>

      {/* 5. Blanc : FAQ locale */}
      <Chapter theme="light" aria-labelledby="local-faq">
        <ChapterTitle id="local-faq">{t.faq.title}</ChapterTitle>
        <Reveal delay={0.08} className="mt-12">
          <Accordion items={t.faq.items.map((qa) => ({ q: qa.question, a: qa.answer }))} />
        </Reveal>
      </Chapter>

      {/* 6. Bleu nuit : autres pages locales (masqué s'il n'y en a aucune) */}
      {nearby.length > 0 && (
        <Chapter theme="night" glow="left" aria-labelledby="local-ailleurs">
          <ChapterTitle id="local-ailleurs" size="md">
            {t.nearby.title}
          </ChapterTitle>
          <ul className="mt-10 flex flex-wrap gap-3">
            {nearby.map((item) => (
              <li key={item.frPath}>
                <GhostButtonLink href={item.href} withArrow>
                  {item.label}
                </GhostButtonLink>
              </li>
            ))}
          </ul>
        </Chapter>
      )}

      <CtaBanner locale={locale} title={t.cta.title} text={t.cta.text} current={t.frPath} />
    </>
  );
}
