import { Handshake, PiggyBank, ShieldCheck, Sparkles } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import CtaBanner from "@/components/CtaBanner";
import { localePath, type Locale } from "@/lib/i18n";

const icons = [Sparkles, Handshake, PiggyBank, ShieldCheck];

const content = {
  fr: {
    eyebrow: "Notre histoire",
    title: "À Propos de Techno Lot",
    subtitle: "La référence en matière de rachat de lots au Québec.",
    cards: [
      {
        title: "Une passion qui nous démarque",
        text: (
          <>
            Chez Techno Lot, notre passion pour la technologie et notre
            engagement envers nos clients nous démarquent de la concurrence.
            Notre entreprise, unique au Québec, a commencé avec la vision de
            fournir des solutions de rachat de matériel électronique et
            informatique de tout genre pour les entreprises. Grâce à notre
            expertise, notre service personnalisé et notre attention aux
            détails, nous sommes fiers de devenir la référence en matière de
            rachat de lots au Québec.
          </>
        ),
      },
      {
        title: "Vendez-nous vos équipements TI",
        text: (
          <>
            Le rachat de matériel électronique permet aux entreprises de{" "}
            <strong className="text-white">
              vendre à Techno Lot leurs équipements TI obsolètes ou inutilisés
            </strong>
            . Ce processus valorise vos actifs informatiques et vos anciens
            équipements.
          </>
        ),
      },
      {
        title: "Récupérez votre investissement",
        text: (
          <>
            Qu&apos;il s&apos;agisse de serveurs, d&apos;ordinateurs ou de
            périphériques, ils peuvent encore avoir une valeur résiduelle. Le
            rachat vous permet de{" "}
            <strong className="text-white">
              récupérer une partie de votre investissement initial
            </strong>{" "}
            plutôt que de laisser ces actifs s&apos;accumuler et perdre toute
            valeur.
          </>
        ),
      },
      {
        title: "Notre engagement de paiement",
        text: (
          <>
            <span className="block">
              La <strong className="text-white">moitié</strong> du paiement sera
              émis lors du ramassage.
            </span>
            <span className="mt-3 block">
              Nous disposons ensuite d&apos;un{" "}
              <strong className="text-white">
                maximum de 15 jours ouvrables
              </strong>{" "}
              pour inspecter le matériel afin de nous assurer de sa{" "}
              <strong className="text-white">fonctionnalité</strong> et de sa{" "}
              <strong className="text-white">condition esthétique</strong>.
            </span>
            <span className="mt-3 block">
              Le solde vous est versé après inspection,{" "}
              <strong className="text-white">sans délai</strong> ; sinon, nous
              ajustons l&apos;offre en{" "}
              <strong className="text-white">conséquence</strong>.
            </span>
          </>
        ),
      },
    ],
    ctaTitle: "Besoin de nos services ?",
    ctaText:
      "Contactez-nous dès aujourd'hui pour en savoir plus sur nos offres d'achat de lots, de réparation d'appareils électroniques et de recyclage de matériel informatique.",
    ctaButton: "Contactez-nous",
  },
  en: {
    eyebrow: "Our story",
    title: "About Techno Lot",
    subtitle: "The reference for equipment lot buyback in Québec.",
    cards: [
      {
        title: "A passion that sets us apart",
        text: (
          <>
            At Techno Lot, our passion for technology and our commitment to our
            clients set us apart from the competition. Our company, one of a
            kind in Québec, started with the vision of providing buyback
            solutions for electronic and IT equipment of all kinds for
            businesses. Thanks to our expertise, personalized service and
            attention to detail, we are proud to have become the reference for
            lot buyback in Québec.
          </>
        ),
      },
      {
        title: "Sell us your IT equipment",
        text: (
          <>
            Electronic equipment buyback allows businesses to{" "}
            <strong className="text-white">
              sell Techno Lot their obsolete or unused IT equipment
            </strong>
            . This process turns your IT assets and old equipment into value.
          </>
        ),
      },
      {
        title: "Recover your investment",
        text: (
          <>
            Whether servers, computers or peripherals, they may still hold
            residual value. Buyback lets you{" "}
            <strong className="text-white">
              recover part of your initial investment
            </strong>{" "}
            instead of letting these assets pile up and lose all value.
          </>
        ),
      },
      {
        title: "Our payment commitment",
        text: (
          <>
            <span className="block">
              <strong className="text-white">Half</strong> of the payment is
              issued at pickup.
            </span>
            <span className="mt-3 block">
              We then have{" "}
              <strong className="text-white">up to 15 business days</strong> to
              inspect the equipment to confirm its{" "}
              <strong className="text-white">functionality</strong> and{" "}
              <strong className="text-white">cosmetic condition</strong>.
            </span>
            <span className="mt-3 block">
              The balance is paid{" "}
              <strong className="text-white">immediately</strong> after
              inspection; otherwise, we adjust the offer{" "}
              <strong className="text-white">accordingly</strong>.
            </span>
          </>
        ),
      },
    ],
    ctaTitle: "Need our services?",
    ctaText:
      "Contact us today to learn more about our lot purchasing, electronic device repair and IT equipment recycling services.",
    ctaButton: "Contact us",
  },
};

export default function AProposPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  return (
    <>
      <PageHero
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        image="/photos/equipe.jpg"
      />

      <section className="container-site pb-8">
        <div className="mx-auto max-w-3xl space-y-10">
          {t.cards.map((card, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={card.title}>
                <div className="glass glass-hover p-8">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                    <Icon className="h-6 w-6 text-accent" aria-hidden />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-white">
                    {card.title}
                  </h2>
                  <p className="mt-4 leading-relaxed text-slate-300">
                    {card.text}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <CtaBanner
        locale={locale}
        title={t.ctaTitle}
        text={t.ctaText}
        buttonLabel={t.ctaButton}
        href={localePath(locale, "/contact")}
      />
    </>
  );
}
