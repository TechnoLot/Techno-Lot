import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import Accordion from "@/components/Accordion";
import CtaBanner from "@/components/CtaBanner";
import type { Locale } from "@/lib/i18n";

const content = {
  fr: {
    eyebrow: "FAQ",
    title: "Questions fréquentes",
    subtitle:
      "Bienvenue sur la page FAQ de Techno Lot, la seule entreprise dans le domaine de l'achat de lots au Québec. Découvrez les réponses aux questions fréquemment posées sur nos services de rachat.",
    faq: [
      {
        question: "Quels types de produits achetez-vous ?",
        answer:
          "Nous rachetons tout matériel électronique, qu'il soit neuf, usagé et même partiellement fonctionnel.",
      },
      {
        question: "Quelle est la particularité de Techno Lot ?",
        answer:
          "Nous sommes la seule entreprise dans le domaine de l'achat de lots électroniques au Québec.",
      },
      {
        question: "Est-ce que vous venez récupérer le matériel ?",
        answer:
          "Oui, dans notre offre de rachat, le ramassage de votre lot est inclus.",
      },
      {
        question: "Quel est le délai de paiement lorsque vous achetez un lot ?",
        answer:
          "Nous vous payons rapidement : le paiement est garanti et effectué dès la validation finale de votre lot.",
      },
      {
        question: "Où êtes-vous situés ?",
        answer: "Nous sommes situés à Mascouche, Québec, Canada.",
      },
      {
        question: "Comment puis-je vous contacter ?",
        answer:
          "Par téléphone au 514-944-3939 ou par courriel à info@technolot.ca.",
      },
    ],
    ctaTitle: "Besoin de plus d'informations ?",
    ctaText: "Notre équipe se fera un plaisir de répondre à toutes vos questions.",
    ctaButton: "Contactez-nous",
  },
  en: {
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    subtitle:
      "Welcome to the FAQ page of Techno Lot, the only company in the lot purchasing business in Québec. Find answers to the most common questions about our buyback services.",
    faq: [
      {
        question: "What types of products do you buy?",
        answer:
          "We buy all electronic equipment, whether new, used or even partially functional.",
      },
      {
        question: "What makes Techno Lot unique?",
        answer:
          "We are the only company in the electronic lot purchasing business in Québec.",
      },
      {
        question: "Do you pick up the equipment?",
        answer: "Yes — pickup of your lot is included in our buyback offer.",
      },
      {
        question: "How quickly do you pay when you buy a lot?",
        answer:
          "We pay you quickly: payment is guaranteed and issued as soon as your lot passes final validation.",
      },
      {
        question: "Where are you located?",
        answer: "We are located in Mascouche, Québec, Canada.",
      },
      {
        question: "How can I reach you?",
        answer:
          "By phone at 514-944-3939 or by email at info@technolot.ca.",
      },
    ],
    ctaTitle: "Need more information?",
    ctaText: "Our team will be happy to answer all your questions.",
    ctaButton: "Contact us",
  },
};

export default function FaqPage({ locale }: { locale: Locale }) {
  const t = content[locale];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        image="/photos/circuit.jpg"
      />

      <section className="container-site pb-8">
        <Reveal className="mx-auto max-w-3xl">
          <Accordion items={t.faq} />
        </Reveal>
      </section>

      <CtaBanner
        locale={locale}
        title={t.ctaTitle}
        text={t.ctaText}
        buttonLabel={t.ctaButton}
      />
    </>
  );
}
