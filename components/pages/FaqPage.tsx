import { PageHero } from "@/components/site/PageHero";
import { CtaBanner } from "@/components/site/CtaBanner";
import { FaqRecherche } from "@/components/formulaire/FaqRecherche";
import { getFaq } from "@/components/formulaire/faq-contenu";
import type { Locale } from "@/lib/i18n";

const content = {
  fr: {
    title: "Questions fréquentes",
    intro:
      "Bienvenue sur la page FAQ de Techno Lot, la seule entreprise dans le domaine de l'achat de lots au Québec. Découvrez les réponses aux questions fréquemment posées sur nos services de rachat.",
    listLabel: "Questions et réponses",
    ctaTitle: "Besoin de plus d'informations ?",
    ctaText: "Notre équipe se fera un plaisir de répondre à toutes vos questions.",
    ctaButton: "Contactez-nous",
  },
  en: {
    title: "Frequently asked questions",
    intro:
      "Welcome to the FAQ page of Techno Lot, the only company in the lot purchasing business in Québec. Find answers to the most common questions about our buyback services.",
    listLabel: "Questions and answers",
    ctaTitle: "Need more information?",
    ctaText: "Our team will be happy to answer all your questions.",
    ctaButton: "Contact us",
  },
};

export default function FaqPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  const groups = getFaq(locale);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) =>
      g.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    ),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <PageHero title={t.title} intro={t.intro} size="compact" />

      <section data-theme="mint" aria-label={t.listLabel} className="relative py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <FaqRecherche groups={groups} locale={locale} />
        </div>
      </section>

      <CtaBanner
        locale={locale}
        title={t.ctaTitle}
        text={t.ctaText}
        buttonLabel={t.ctaButton}
        href="/contact"
        current="/faq"
      />
    </>
  );
}
