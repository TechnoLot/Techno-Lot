import {
  BadgeCheck,
  Clock,
  Gift,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";
import CtaBanner from "@/components/CtaBanner";
import SubmissionForm from "@/components/SubmissionForm";
import MapEmbed from "@/components/MapEmbed";
import { site } from "@/lib/site";
import { getDict, type Locale } from "@/lib/i18n";

const icons = [BadgeCheck, Gift, Smartphone];
const infoIcons = [MapPin, Phone, Mail, Clock];

const content = {
  fr: {
    eyebrow: "Soumission",
    title: "Soumission",
    subtitle:
      "Pour une estimation sur mesure du rachat de votre matériel technologique, veuillez remplir ce formulaire !",
    labels: ["Adresse", "Téléphone", "Courriel", "Délai de réponse"],
    responseTime: "24 heures maximum",
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
    title: "Get a quote",
    subtitle:
      "For a customized estimate of your technology equipment buyback, please fill out this form!",
    labels: ["Address", "Phone", "Email", "Response time"],
    responseTime: "24 hours maximum",
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
  const form = getDict(locale).form;

  const coordonnees = [
    { label: t.labels[0], value: site.address.full, href: site.address.mapsUrl },
    { label: t.labels[1], value: site.phone, href: site.phoneHref },
    { label: t.labels[2], value: site.email, href: `mailto:${site.email}` },
    { label: t.labels[3], value: t.responseTime },
  ];

  return (
    <>
      <PageHero
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        image="/photos/bureau.jpg"
      />

      <section className="container-site pb-20">
        <div className="grid gap-10 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <SubmissionForm locale={locale} />
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-2">
            <div className="space-y-4">
              {coordonnees.map(({ label, value, href }, i) => {
                const Icon = infoIcons[i];
                return (
                  <div
                    key={label}
                    className="glass glass-hover flex items-start gap-4 p-5"
                  >
                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/30">
                      <Icon className="h-5 w-5 text-accent" aria-hidden />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                      {href ? (
                        <a
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel={
                            href.startsWith("http")
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className="font-medium text-white transition-colors hover:text-accent-bright"
                        >
                          {value}
                        </a>
                      ) : (
                        <p className="font-medium text-white">{value}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="glass flex items-start gap-3 p-5">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/30">
                  <ShieldCheck className="h-5 w-5 text-accent" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {form.paymentClauseTitle}
                  </p>
                  <div className="mt-1 space-y-2 text-sm text-slate-300">
                    {form.paymentClauseText.map((line, i) => (
                      <p key={i}>
                        {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={j} className="font-semibold text-white">
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <MapEmbed locale={locale} className="h-[320px]" />
            </div>
          </Reveal>
        </div>
      </section>
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
