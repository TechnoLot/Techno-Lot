import Image from "next/image";
import { PageHero } from "@/components/site/PageHero";
import { HeroCrumbs } from "@/components/seo/Breadcrumbs";
import { PrimaryButtonLink } from "@/components/site/Button";
import { Reveal } from "@/components/site/Reveal";
import SubmissionForm from "@/components/SubmissionForm";
import { Coordonnees } from "@/components/formulaire/Coordonnees";
import { localePath, type Locale } from "@/lib/i18n";

const content = {
  fr: {
    title: "Parlons de votre lot",
    intro:
      "Une question, un lot à faire évaluer ou un projet de prise en charge ? Appelez-nous ou décrivez votre matériel : nous vous répondons dans un délai de 24 heures.",
    contactLabel: "Coordonnées et formulaire",
    travelTitle: "On se déplace chez vous",
    travelText:
      "Pas besoin de vous déplacer : notre équipe se rend sur place, partout au Québec, pour emballer, charger et transporter votre matériel, gratuitement.",
    travelCta: "Faire une soumission",
    truckAlt: "Camion de ramassage Techno Lot",
  },
  en: {
    title: "Let's talk about your lot",
    intro:
      "A question, a lot to appraise or a full-service pickup project? Call us or describe your equipment: we get back to you within 24 hours.",
    contactLabel: "Contact details and form",
    travelTitle: "We come to you",
    travelText:
      "No need to travel: our team comes on site, anywhere in Québec, to pack, load and transport your equipment, free of charge.",
    travelCta: "Get a quote",
    truckAlt: "Techno Lot pickup truck",
  },
};

export default function ContactPage({ locale }: { locale: Locale }) {
  const t = content[locale];

  return (
    <>
      <PageHero
        title={t.title}
        intro={t.intro}
        size="compact"
        breadcrumbs={<HeroCrumbs locale={locale} name={locale === "en" ? "Contact" : "Contact"} frPath="/contact" />}
      />

      <section data-theme="mint" aria-label={t.contactLabel} className="tlf relative py-12 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
          {/* Visibles dès le chargement : entrées en CSS (rien de caché sans JS). */}
          <div className="tlf-rise lg:col-span-5" style={{ ["--d" as string]: "0.1s" }}>
            <div className="tlf-sticky">
              <Coordonnees locale={locale} />
            </div>
          </div>
          <div className="tlf-rise lg:col-span-7" style={{ ["--d" as string]: "0.2s" }}>
            <SubmissionForm locale={locale} />
          </div>
        </div>
      </section>

      {/* Vert profond : c'est nous qui nous déplaçons (aucun comptoir à visiter) */}
      <section data-theme="deep" aria-labelledby="contact-deplacement" className="tlf relative isolate overflow-hidden py-14 sm:py-20">
        <div aria-hidden="true" className="tlf-glow" />
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 sm:px-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <h2 id="contact-deplacement" className="font-display text-3xl font-bold leading-tight text-mist sm:text-4xl">
              {t.travelTitle}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-moss sm:text-lg">{t.travelText}</p>
            <PrimaryButtonLink href={localePath(locale, "/soumission")} className="mt-7">
              {t.travelCta}
            </PrimaryButtonLink>
          </Reveal>
          <Reveal className="lg:col-span-7" delay={0.08}>
            <div className="relative mx-auto w-full max-w-[560px]">
              <div
                aria-hidden="true"
                className="absolute inset-x-[6%] bottom-0 top-[8%] rounded-full bg-[radial-gradient(closest-side,rgba(107,214,59,0.24),transparent)]"
              />
              <Image
                src="/images/camion/camion-techno-lot.webp"
                alt={t.truckAlt}
                width={1200}
                height={497}
                sizes="(max-width: 1024px) 90vw, 560px"
                className="relative h-auto w-full drop-shadow-[0_24px_24px_rgba(0,0,0,0.4)]"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
