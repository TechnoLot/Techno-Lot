import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import Accordion from "@/components/Accordion";
import CtaBanner from "@/components/CtaBanner";

export const metadata: Metadata = {
  title: "FAQ — Questions fréquentes",
  description:
    "Découvrez les réponses aux questions fréquemment posées sur les services de rachat de lots électroniques et informatiques de Techno Lot.",
  alternates: { canonical: "/faq" },
};

const faq = [
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
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="FAQ"
        title="Questions fréquentes"
        subtitle="Bienvenue sur la page FAQ de Techno Lot, la seule entreprise dans le domaine de l'achat de lots au Québec. Découvrez les réponses aux questions fréquemment posées sur nos services de rachat."
        image="/photos/circuit.jpg"
      />

      <section className="container-site pb-8">
        <Reveal className="mx-auto max-w-3xl">
          <Accordion items={faq} />
        </Reveal>
      </section>

      <CtaBanner
        title="Besoin de plus d'informations ?"
        text="Notre équipe se fera un plaisir de répondre à toutes vos questions."
        buttonLabel="Contactez-nous"
        href="/contact"
      />
    </>
  );
}
