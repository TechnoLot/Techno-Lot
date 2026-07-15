import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Award,
  BadgeDollarSign,
  Clock,
  FileText,
  Recycle,
  Truck,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import Counter from "@/components/Counter";
import Marquee from "@/components/Marquee";
import Hero from "@/components/Hero";
import SpotlightCard from "@/components/SpotlightCard";
import OrbitVisual from "@/components/OrbitVisual";
import SubmissionForm from "@/components/SubmissionForm";
import MapEmbed from "@/components/MapEmbed";
import { site } from "@/lib/site";
import { getDict, localePath, type Locale } from "@/lib/i18n";

const serviceExtras = [
  { icon: Recycle, photo: "/photos/serveurs.jpg", href: "/consultation" },
  { icon: FileText, photo: "/photos/bureau.jpg", href: "/achat-de-lot-description" },
  { icon: Truck, photo: "/photos/entrepot.jpg", href: "/prise-en-charge-complete" },
];

const trustIcons = [Clock, Truck, BadgeDollarSign, Award];

export default function HomePage({ locale }: { locale: Locale }) {
  const t = getDict(locale);

  const trustStats = [
    <Counter key="t0" to={24} suffix=" h" className="text-gradient" />,
    <Counter key="t1" to={100} suffix=" %" className="text-gradient" />,
    <span key="t2" className="text-gradient">
      {t.home.trustPaid}
    </span>,
    <Counter key="t3" to={1} prefix="N° " className="text-gradient" />,
  ];

  return (
    <>
      {/* ===== Hero ===== */}
      <Hero locale={locale} />

      {/* ===== Marquee des catégories ===== */}
      <Marquee locale={locale} />

      {/* ===== Bandeau de confiance ===== */}
      <section className="container-site py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.trust.map((label, i) => {
            const Icon = trustIcons[i];
            return (
              <Reveal key={i} delay={i * 0.1}>
                <div className="glass glass-hover flex h-full flex-col items-center gap-2 p-6 text-center">
                  <Icon className="h-6 w-6 text-accent" aria-hidden />
                  <div className="font-display text-3xl font-bold">
                    {trustStats[i]}
                  </div>
                  <p className="text-sm text-slate-400">{label}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===== Notre service clé en main ===== */}
      <section className="container-site scroll-mt-24 py-16" id="services">
        <Reveal>
          <span className="eyebrow">{t.home.servicesEyebrow}</span>
          <h2 className="section-title">{t.home.servicesTitle}</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {t.home.services.map(({ photoAlt, title, text, cta }, i) => {
            const { icon: Icon, photo, href } = serviceExtras[i];
            const target = localePath(locale, href);
            return (
              <Reveal key={href} delay={i * 0.12} className="h-full">
                <SpotlightCard className="h-full">
                  <div className="glass glass-hover flex h-full flex-col overflow-hidden">
                    <div className="relative h-44 overflow-hidden">
                      <Image
                        src={photo}
                        alt={photoAlt}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 90vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/35 to-transparent"
                        aria-hidden
                      />
                      <div className="absolute bottom-4 left-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-night-950/70 ring-1 ring-accent/40 backdrop-blur-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                        <Icon className="h-6 w-6 text-accent" aria-hidden />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-8 pt-6">
                      <h3 className="font-display text-xl font-semibold text-white">
                        {title}
                      </h3>
                      <p className="mt-3 flex-1 leading-relaxed text-slate-300">
                        {text}
                      </p>
                      <Link
                        href={target}
                        className="group mt-6 inline-flex items-center gap-2 font-display text-sm font-semibold text-accent transition-colors hover:text-accent-bright"
                      >
                        {cta}
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                          aria-hidden
                        />
                      </Link>
                    </div>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===== Qui sommes-nous ===== */}
      <section className="relative overflow-hidden py-20">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow">{t.home.whoEyebrow}</span>
            <h2 className="section-title">{t.home.whoTitle}</h2>
            <p className="mt-6 leading-relaxed text-slate-300">{t.home.whoP1}</p>
            <p className="mt-4 leading-relaxed text-slate-300">{t.home.whoP2}</p>
            <Link
              href={localePath(locale, "/a-propos")}
              className="btn-secondary mt-8"
            >
              {t.home.whoCta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
          <Reveal delay={0.15}>
            <OrbitVisual locale={locale} />
          </Reveal>
        </div>
      </section>

      {/* ===== Notre mission ===== */}
      <section className="relative overflow-hidden py-24 sm:py-28">
        <Image
          src="/photos/circuit.jpg"
          alt=""
          fill
          quality={50}
          sizes="100vw"
          className="object-cover opacity-[0.18]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-night-900 via-night-900/70 to-night-900"
          aria-hidden
        />
        <div className="container-site relative text-center">
          <Reveal>
            <span className="eyebrow">{t.home.missionEyebrow}</span>
            <h2 className="mx-auto max-w-3xl font-display text-3xl font-bold text-white sm:text-4xl">
              {t.home.missionTitleStart}{" "}
              <span className="text-gradient">{t.home.missionTitleAccent}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              {t.home.missionText}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href={localePath(locale, "/contact")} className="btn-primary">
                {t.home.missionCta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a href={site.phoneHref} className="btn-secondary">
                {site.phone}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Formulaire + Localisation ===== */}
      <section className="container-site py-20" id="soumission">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow">{t.home.formEyebrow}</span>
            <h2 className="section-title">{t.home.formTitle}</h2>
            <p className="mt-4 text-slate-300">{t.home.formText}</p>
            <div className="mt-8">
              <SubmissionForm locale={locale} />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <span className="eyebrow">{t.home.locationEyebrow}</span>
            <h2 className="section-title">{t.home.locationTitle}</h2>
            <p className="mt-4 text-slate-300">
              {site.address.full} —{" "}
              <a
                href={site.phoneHref}
                className="font-semibold text-accent hover:text-accent-bright"
              >
                {site.phone}
              </a>
            </p>
            <MapEmbed
              locale={locale}
              className="mt-8 h-[420px] lg:h-[calc(100%-8.5rem)]"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
