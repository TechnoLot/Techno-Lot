import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import MapEmbed from "@/components/MapEmbed";
import { site } from "@/lib/site";
import { getDict, localePath, type Locale } from "@/lib/i18n";

const icons = [MapPin, Phone, Mail, Clock];

const content = {
  fr: {
    eyebrow: "Contact",
    title: "Parlons de votre lot",
    subtitle:
      "Une question, un lot à faire évaluer ou un projet de prise en charge ? Contactez-nous directement, on vous répond rapidement.",
    personRole: "Président",
    personText:
      "Je m'occupe personnellement de chaque demande. Appelez-moi ou écrivez-moi : je vous réponds en moins de 24 heures.",
    callCta: "Appeler",
    emailCta: "Écrire un courriel",
    quoteTitle: "Vous avez déjà la liste de votre matériel ?",
    quoteText:
      "Remplissez notre formulaire de soumission pour recevoir une offre sur mesure.",
    quoteCta: "Faire une soumission",
    labels: ["Adresse", "Téléphone", "Courriel", "Délai de réponse"],
    responseTime: "24 heures maximum",
  },
  en: {
    eyebrow: "Contact",
    title: "Let's talk about your lot",
    subtitle:
      "A question, a lot to appraise or a full-service pickup project? Reach out directly and we'll get back to you quickly.",
    personRole: "President",
    personText:
      "I personally handle every request. Call or email me and I'll get back to you within 24 hours.",
    callCta: "Call",
    emailCta: "Send an email",
    quoteTitle: "Already have your equipment list?",
    quoteText:
      "Fill out our quote form to receive a customized offer.",
    quoteCta: "Get a quote",
    labels: ["Address", "Phone", "Email", "Response time"],
    responseTime: "24 hours maximum",
  },
};

export default function ContactPage({ locale }: { locale: Locale }) {
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
        image="/photos/serveurs.jpg"
      />

      <section className="container-site pb-20">
        <div className="grid gap-10 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="space-y-6">
              <div className="glass p-8">
                <div className="flex items-center gap-5">
                  <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent ring-1 ring-accent/30">
                    AD
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Anthony Després
                    </h2>
                    <p className="text-sm font-semibold uppercase tracking-wider text-accent">
                      {t.personRole} — {site.name}
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-slate-300">{t.personText}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={site.phoneHref} className="btn-primary">
                    <Phone className="h-4 w-4" aria-hidden />
                    {t.callCta} · {site.phone}
                  </a>
                  <a
                    href={`mailto:${site.email}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-accent-bright"
                  >
                    <Mail className="h-4 w-4" aria-hidden />
                    {t.emailCta}
                  </a>
                </div>
              </div>

              <div className="glass p-8">
                <h2 className="text-xl font-bold text-white">{t.quoteTitle}</h2>
                <p className="mt-2 text-slate-300">{t.quoteText}</p>
                <Link
                  href={localePath(locale, "/soumission")}
                  className="mt-5 inline-flex items-center gap-2 font-semibold text-accent-bright hover:text-white"
                >
                  {t.quoteCta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              <MapEmbed locale={locale} className="h-[320px]" />
            </div>
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-2">
            <div className="space-y-4">
              {coordonnees.map(({ label, value, href }, i) => {
                const Icon = icons[i];
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
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
