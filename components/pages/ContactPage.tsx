import { Clock, Mail, MapPin, Phone } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import SubmissionForm from "@/components/SubmissionForm";
import MapEmbed from "@/components/MapEmbed";
import { site } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

const icons = [MapPin, Phone, Mail, Clock];

const content = {
  fr: {
    eyebrow: "Contact",
    title: "Soumission",
    subtitle:
      "Pour une estimation sur mesure du rachat de votre matériel technologique, veuillez remplir ce formulaire !",
    labels: ["Adresse", "Téléphone", "Courriel", "Délai de réponse"],
    responseTime: "24 heures maximum",
  },
  en: {
    eyebrow: "Contact",
    title: "Get a quote",
    subtitle:
      "For a customized estimate of your technology equipment buyback, please fill out this form!",
    labels: ["Address", "Phone", "Email", "Response time"],
    responseTime: "24 hours maximum",
  },
};

export default function ContactPage({ locale }: { locale: Locale }) {
  const t = content[locale];

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
            <SubmissionForm locale={locale} />
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
              <MapEmbed locale={locale} className="h-[320px]" />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
