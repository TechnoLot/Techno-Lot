import { PageHero } from "@/components/site/PageHero";
import { PrimaryButtonLink } from "@/components/site/Button";
import { Reveal } from "@/components/site/Reveal";
import SubmissionForm from "@/components/SubmissionForm";
import MapEmbed from "@/components/MapEmbed";
import { Coordonnees } from "@/components/formulaire/Coordonnees";
import { site } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

const content = {
  fr: {
    title: "Parlons de votre lot",
    intro:
      "Une question, un lot à faire évaluer ou un projet de prise en charge ? Appelez-nous ou décrivez votre matériel : nous vous répondons dans un délai de 24 heures.",
    contactLabel: "Coordonnées et formulaire",
    mapTitle: "Où nous trouver",
    mapText:
      "Nous sommes situés à Mascouche, mais c'est nous qui nous déplaçons : le ramassage est gratuit partout au Québec. Notre équipe se rend sur place pour emballer, charger et transporter votre matériel.",
    directions: "Itinéraire",
  },
  en: {
    title: "Let's talk about your lot",
    intro:
      "A question, a lot to appraise or a full-service pickup project? Call us or describe your equipment: we get back to you within 24 hours.",
    contactLabel: "Contact details and form",
    mapTitle: "Where to find us",
    mapText:
      "We're based in Mascouche, but we're the ones who travel: pickup is free anywhere in Québec. Our team comes on site to pack, load and transport your equipment.",
    directions: "Directions",
  },
};

export default function ContactPage({ locale }: { locale: Locale }) {
  const t = content[locale];

  return (
    <>
      <PageHero title={t.title} intro={t.intro} size="compact" />

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

      <section data-theme="deep" aria-labelledby="contact-carte" className="tlf relative isolate overflow-hidden py-14 sm:py-20">
        <div aria-hidden="true" className="tlf-glow" />
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 sm:px-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <h2 id="contact-carte" className="font-display text-3xl font-bold leading-tight text-mist sm:text-4xl">
              {t.mapTitle}
            </h2>
            <p className="mt-5 font-display text-xl font-semibold leading-snug text-mist">
              {site.address.street}
              <br />
              {site.address.city}, {site.address.province} {site.address.postalCode}
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-moss">{t.mapText}</p>
            <PrimaryButtonLink href={site.address.mapsUrl} className="mt-7">
              {t.directions}
            </PrimaryButtonLink>
          </Reveal>
          <Reveal className="lg:col-span-7" delay={0.08}>
            <MapEmbed locale={locale} className="h-[320px] sm:h-[420px]" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
