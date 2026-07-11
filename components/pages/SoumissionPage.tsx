import { BadgeCheck, Gift, Smartphone } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";
import CtaBanner from "@/components/CtaBanner";
import type { Locale } from "@/lib/i18n";

const icons = [BadgeCheck, Gift, Smartphone];

const content = {
  fr: {
    eyebrow: "Soumission",
    title: "Soumission pour rachat de matériel informatique et électronique",
    subtitle:
      "Nous sommes fiers d'être la seule entreprise dans le domaine au Québec à offrir ce service. Obtenez une estimation gratuite avec une réponse dans un délai de 24 heures.",
    blocs: [
      {
        title: "Satisfaction garantie",
        text: "Grâce à notre connaissance approfondie des infrastructures technologiques, nous offrons une évaluation précise de vos équipements et un prix juste et compétitif, le tout avec un délai de réponse ultra rapide.",
      },
      {
        title: "Estimation gratuite",
        text: "Notre estimation est gratuite et sans engagement. Remplissez le formulaire de soumission et laissez-nous vous faire une offre pour votre lot de matériel.",
      },
      {
        title: "Rachat de matériel électronique",
        text: "Téléphones, tablettes, appareils audio et vidéo — confiez-nous votre équipement électronique et recevez une offre juste.",
      },
    ],
    ctaTitle: "Obtenez une estimation gratuite dès aujourd'hui",
    ctaText:
      "Remplissez notre formulaire et recevez notre offre dans un délai de 24 heures.",
  },
  en: {
    eyebrow: "Quote",
    title: "Quote for IT and electronic equipment buyback",
    subtitle:
      "We are proud to be the only company in this field in Québec to offer this service. Get a free estimate with a response within 24 hours.",
    blocs: [
      {
        title: "Satisfaction guaranteed",
        text: "Thanks to our in-depth knowledge of technology infrastructures, we provide an accurate appraisal of your equipment and a fair, competitive price — all with an ultra-fast response time.",
      },
      {
        title: "Free estimate",
        text: "Our estimate is free and without obligation. Fill out the quote form and let us make you an offer for your equipment lot.",
      },
      {
        title: "Electronics buyback",
        text: "Phones, tablets, audio and video devices — entrust us with your electronic equipment and receive a fair offer.",
      },
    ],
    ctaTitle: "Get your free estimate today",
    ctaText: "Fill out our form and receive our offer within 24 hours.",
  },
};

export default function SoumissionPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  return (
    <>
      <PageHero
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        image="/photos/bureau.jpg"
      />

      <section className="container-site pb-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {t.blocs.map(({ title, text }, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={title} delay={i * 0.12} className="h-full">
                <TiltCard className="h-full">
                  <div className="glass glass-hover flex h-full flex-col p-8">
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                      <Icon className="h-6 w-6 text-accent" aria-hidden />
                    </div>
                    <h2 className="font-display text-xl font-semibold text-white">
                      {title}
                    </h2>
                    <p className="mt-3 leading-relaxed text-slate-300">{text}</p>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} />
    </>
  );
}
