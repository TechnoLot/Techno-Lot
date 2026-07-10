import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeDollarSign,
  Clock,
  FileText,
  Leaf,
  Recycle,
  Truck,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import Counter from "@/components/Counter";
import Marquee from "@/components/Marquee";
import TiltCard from "@/components/TiltCard";
import HeroBackground from "@/components/HeroBackground";
import SubmissionForm from "@/components/SubmissionForm";
import MapEmbed from "@/components/MapEmbed";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title:
    "Techno Lot — Le spécialiste de l'achat de lots informatiques et électroniques au Québec",
  description:
    "Nous donnons une seconde vie à votre matériel high-tech usagé — et on vous paie pour ça. Réponse en 24 h, ramassage gratuit, paiement avant notre départ. Unique au Québec.",
  alternates: { canonical: "/" },
};

const services = [
  {
    icon: Recycle,
    title: "Rachat de lots électroniques",
    text: "Spécialiste de la reprise des produits informatiques et électroniques. Techno Lot offre une seconde vie au matériel high-tech usagé.",
    href: "/consultation",
    cta: "Faire une demande",
  },
  {
    icon: FileText,
    title: "Soumission personnalisée",
    text: "Pour obtenir une soumission de reprise de votre parc informatique ou de tout lot d'équipement électronique neuf ou usagé.",
    href: "/achat-de-lot-description",
    cta: "En savoir davantage",
  },
  {
    icon: Truck,
    title: "Prise en charge complète",
    text: "Lorsque notre offre est acceptée, notre équipe se rend sur place pour emballer, charger et transporter le matériel.",
    href: "/prise-en-charge-complete",
    cta: "Processus d'achat de votre lot",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <HeroBackground />
        <div className="container-site relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center py-24 text-center">
          <Reveal>
            <span className="eyebrow">Unique au Québec</span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Techno Lot — Le spécialiste de{" "}
              <span className="text-gradient">
                l&apos;achat de lots informatiques et électroniques
              </span>{" "}
              au Québec.
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
              Nous donnons une seconde vie à votre matériel high-tech usagé —
              et on vous paie pour ça.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Link href="/contact" className="btn-primary">
                Faire une soumission
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/consultation" className="btn-secondary">
                Comment ça marche
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Marquee des catégories ===== */}
      <Marquee />

      {/* ===== Bandeau de confiance ===== */}
      <section className="container-site py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Clock,
              stat: <Counter to={24} suffix=" h" className="text-gradient" />,
              label: "Réponse garantie en 24 heures",
            },
            {
              icon: Truck,
              stat: <Counter to={100} suffix=" %" className="text-gradient" />,
              label: "Ramassage gratuit inclus",
            },
            {
              icon: BadgeDollarSign,
              stat: <span className="text-gradient">Payé</span>,
              label: "Paiement avant notre départ",
            },
            {
              icon: Award,
              stat: (
                <>
                  <Counter to={1} prefix="N° " className="text-gradient" />
                </>
              ),
              label: "Unique au Québec",
            },
          ].map(({ icon: Icon, stat, label }, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="glass glass-hover flex h-full flex-col items-center gap-2 p-6 text-center">
                <Icon className="h-6 w-6 text-accent" aria-hidden />
                <div className="font-display text-3xl font-bold">{stat}</div>
                <p className="text-sm text-slate-400">{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Notre service clé en main ===== */}
      <section className="container-site py-16">
        <Reveal>
          <span className="eyebrow">Ce que nous faisons</span>
          <h2 className="section-title">Notre service clé en main</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {services.map(({ icon: Icon, title, text, href, cta }, i) => (
            <Reveal key={href} delay={i * 0.12} className="h-full">
              <TiltCard className="h-full">
                <div className="glass glass-hover flex h-full flex-col p-8">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                    <Icon className="h-6 w-6 text-accent" aria-hidden />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white">
                    {title}
                  </h3>
                  <p className="mt-3 flex-1 leading-relaxed text-slate-300">
                    {text}
                  </p>
                  <Link
                    href={href}
                    className="group mt-6 inline-flex items-center gap-2 font-display text-sm font-semibold text-accent transition-colors hover:text-accent-bright"
                  >
                    {cta}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </Link>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Qui sommes-nous ===== */}
      <section className="relative overflow-hidden py-20">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow">Qui sommes-nous ?</span>
            <h2 className="section-title">
              La durabilité au cœur de votre gestion de matériel électronique
            </h2>
            <p className="mt-6 leading-relaxed text-slate-300">
              Techno Lot est une entreprise unique au Québec, spécialisée dans
              le rachat de lots de produits électroniques et informatiques.
              Nous travaillons main dans la main avec vous pour allonger les
              cycles de vie de vos équipements afin d&apos;intégrer la
              durabilité dans votre gestion de matériel électronique.
            </p>
            <p className="mt-4 leading-relaxed text-slate-300">
              Nous prenons notre responsabilité dans la lutte climatique en
              sensibilisant nos partenaires et clients et en œuvrant activement
              à développer des solutions numériques plus vertes, durables et
              moins gourmandes en énergie et en ressources naturelles.
            </p>
            <Link href="/a-propos" className="btn-secondary mt-8">
              En savoir plus sur nous
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="glass relative flex aspect-square items-center justify-center overflow-hidden p-8">
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(94,203,51,0.18), transparent 55%), radial-gradient(circle at 75% 70%, rgba(34,211,238,0.14), transparent 55%)",
                }}
                aria-hidden
              />
              <Leaf
                className="relative h-40 w-40 text-accent/80"
                strokeWidth={1}
                aria-hidden
              />
              <div className="absolute bottom-8 left-8 right-8 text-center">
                <p className="font-display text-lg font-semibold text-white">
                  Économie circulaire
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Prolonger la vie du matériel, réduire les déchets
                  électroniques.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Formulaire + Localisation ===== */}
      <section className="container-site py-20" id="soumission">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow">Soumission</span>
            <h2 className="section-title">Obtenez votre estimation gratuite</h2>
            <p className="mt-4 text-slate-300">
              Pour une estimation sur mesure du rachat de votre matériel
              technologique, remplissez ce formulaire. Réponse en 24 heures.
            </p>
            <div className="mt-8">
              <SubmissionForm />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <span className="eyebrow">Localisation</span>
            <h2 className="section-title">Venez nous voir</h2>
            <p className="mt-4 text-slate-300">
              {site.address.full} —{" "}
              <a
                href={site.phoneHref}
                className="font-semibold text-accent hover:text-accent-bright"
              >
                {site.phone}
              </a>
            </p>
            <MapEmbed className="mt-8 h-[420px] lg:h-[calc(100%-8.5rem)]" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
