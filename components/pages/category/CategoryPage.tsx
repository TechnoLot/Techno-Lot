import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Reveal } from "@/components/site/Reveal";
import { Accordion } from "@/components/site/Accordion";
import { GhostButtonLink, PrimaryButtonLink } from "@/components/site/Button";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { site } from "@/lib/site";
import {
  CATEGORY_ADVANTAGES,
  CATEGORY_BREADCRUMB,
  CATEGORY_NEARBY,
  CATEGORY_PAGE_IDS,
  categoryPages,
  type CategoryPageId,
} from "@/lib/seo/category-pages";
import { findRoute } from "@/lib/seo/routes";
import { faqJsonLd, serviceJsonLd } from "@/lib/seo/schema";
import { Chapter, ChapterTitle } from "../services/Chapter";
import "../pages-services.css";

/** true si le chemin français est inscrit au registre (page publiée). */
function isRegistered(frPath: string): boolean {
  return findRoute(frPath)?.fr === frPath;
}

/**
 * Gabarit des pages catégories (« rachat de <famille de matériel> en lot »),
 * composant serveur, en français seulement. Contenu : lib/seo/category-pages.ts.
 * Le héros n'a aucune révélation au défilement (LCP) ; les Reveal ne
 * commencent qu'en dessous.
 */
export default function CategoryPage({ id }: { id: CategoryPageId }) {
  const t = categoryPages[id];

  const localLinks = CATEGORY_NEARBY.localItems.filter((item) => isRegistered(item.frPath));
  const otherCategories = CATEGORY_PAGE_IDS.filter((other) => other !== id)
    .map((other) => categoryPages[other])
    .filter((page) => isRegistered(page.frPath));

  return (
    <>
      <JsonLd
        data={[
          serviceJsonLd({
            name: t.service.name,
            description: t.service.description,
            path: t.frPath,
            areaServed: [],
            regions: ["Québec"],
            locale: "fr",
          }),
          faqJsonLd(t.faq.items),
        ]}
      />

      <PageHero
        size="compact"
        title={t.hero.title}
        intro={t.hero.intro}
        image={{ kind: "object", src: t.hero.image.src, width: t.hero.image.width, alt: t.hero.image.alt }}
        breadcrumbs={
          <Breadcrumbs
            locale="fr"
            items={[
              { name: CATEGORY_BREADCRUMB.home, path: "/" },
              CATEGORY_BREADCRUMB.parent,
              { name: t.label, path: t.frPath },
            ]}
          />
        }
      >
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <PrimaryButtonLink href="/soumission">Obtenir une offre</PrimaryButtonLink>
          <GhostButtonLink href={site.phoneHref}>Appeler {site.phone}</GhostButtonLink>
        </div>
      </PageHero>

      {/* 1. Blanc : ce que nous rachetons dans cette catégorie */}
      <Chapter theme="light" aria-labelledby="cat-materiel">
        <ChapterTitle id="cat-materiel" intro={t.items.intro}>
          {t.items.title}
        </ChapterTitle>
        <ul className="mt-14 grid gap-x-12 sm:grid-cols-2">
          {t.items.items.map((item, i) => (
            <li key={item.title}>
              <Reveal delay={(i % 2) * 0.07} className="border-t border-line-strong py-7">
                <h3 className="font-display text-xl font-bold leading-snug text-mist sm:text-2xl">
                  {item.linkFrPath && isRegistered(item.linkFrPath) ? (
                    <Link
                      href={item.linkFrPath}
                      className="group inline-flex items-center gap-2 underline-offset-4 hover:underline focus-visible:underline"
                    >
                      {item.title}
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                    </Link>
                  ) : (
                    item.title
                  )}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-moss">{item.text}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Chapter>

      {/* 2. Vert profond : ce qui influence l'offre */}
      <Chapter theme="deep" glow="right" aria-labelledby="cat-facteurs">
        <ChapterTitle id="cat-facteurs" intro={t.factors.intro}>
          {t.factors.title}
        </ChapterTitle>
        <ul className="mt-12 grid gap-x-12 sm:grid-cols-2">
          {t.factors.items.map((f, i) => (
            <li key={f.title}>
              <Reveal delay={(i % 2) * 0.07} className="border-t border-line py-6">
                <h3 className="font-display text-xl font-bold leading-snug text-mist">{f.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-moss">{f.text}</p>
              </Reveal>
            </li>
          ))}
        </ul>
        <Reveal delay={0.1} className="mt-10 max-w-2xl">
          <p className="text-base font-semibold leading-relaxed text-mist sm:text-lg">{t.factors.note}</p>
        </Reveal>
      </Chapter>

      {/* 3. Lime : préparer le lot */}
      <Chapter theme="lime" aria-labelledby="cat-preparer">
        <ChapterTitle id="cat-preparer" intro={t.prepare.intro}>
          {t.prepare.title}
        </ChapterTitle>
        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {t.prepare.items.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={0.1 + (i % 3) * 0.09} y={24}>
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

      {/* 4. Bleu nuit : les quatre avantages */}
      <Chapter theme="night" glow="both" aria-labelledby="cat-avantages">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <ChapterTitle id="cat-avantages" size="md">
              {CATEGORY_ADVANTAGES.title}
            </ChapterTitle>
          </div>
          <ol className="lg:col-span-7">
            {CATEGORY_ADVANTAGES.items.map((a, i) => (
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

      {/* 5. Blanc : FAQ */}
      <Chapter theme="light" aria-labelledby="cat-faq">
        <ChapterTitle id="cat-faq">{t.faq.title}</ChapterTitle>
        <Reveal delay={0.08} className="mt-12">
          <Accordion items={t.faq.items.map((qa) => ({ q: qa.question, a: qa.answer }))} />
        </Reveal>
      </Chapter>

      {/* 6. Bleu nuit : pages locales (si publiées) et autres catégories */}
      {(localLinks.length > 0 || otherCategories.length > 0) && (
        <Chapter theme="night" glow="left" aria-labelledby="cat-ailleurs">
          <ChapterTitle id="cat-ailleurs" size="md" intro={CATEGORY_NEARBY.intro}>
            {CATEGORY_NEARBY.title}
          </ChapterTitle>
          {localLinks.length > 0 && (
            <>
              <h3 className="mt-10 font-display text-lg font-bold text-mist">{CATEGORY_NEARBY.localTitle}</h3>
              <ul className="mt-4 flex flex-wrap gap-3">
                {localLinks.map((item) => (
                  <li key={item.frPath}>
                    <GhostButtonLink href={item.frPath} withArrow>
                      {item.label}
                    </GhostButtonLink>
                  </li>
                ))}
              </ul>
            </>
          )}
          {otherCategories.length > 0 && (
            <>
              <h3 className="mt-10 font-display text-lg font-bold text-mist">{CATEGORY_NEARBY.categoriesTitle}</h3>
              <ul className="mt-4 flex flex-wrap gap-3">
                {otherCategories.map((page) => (
                  <li key={page.frPath}>
                    <GhostButtonLink href={page.frPath} withArrow>
                      {page.label}
                    </GhostButtonLink>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Chapter>
      )}

      <CtaBanner locale="fr" title={t.cta.title} text={t.cta.text} current={t.frPath} />
    </>
  );
}
