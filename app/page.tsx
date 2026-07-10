import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title:
    "Techno Lot — Le spécialiste de l'achat de lots informatiques et électroniques au Québec",
  description:
    "Nous donnons une seconde vie à votre matériel high-tech usagé — et on vous paie pour ça. Réponse en 24 h, ramassage gratuit, paiement rapide et garanti. Unique au Québec.",
  alternates: { canonical: "/" },
};

const services = [
  {
    icon: Recycle,
    photo: "/photos/serveurs.jpg",
    photoAlt: "Baies de serveurs avec câblage réseau et voyants verts",
    title: "Rachat de lots électroniques",
    text: "Spécialiste de la reprise des produits informatiques et électroniques. Techno Lot offre une seconde vie au matériel high-tech usagé.",
    href: "/consultation",
    cta: "Faire une demande",
  },
  {
    icon: FileText,
    photo: "/photos/bureau.jpg",
    photoAlt: "Table de travail couverte d'ordinateurs portables et d'appareils électroniques",
    title: "Soumission personnalisée",
    text: "Pour obtenir une soumission de reprise de votre parc informatique ou de tout lot d'équipement électronique neuf ou usagé.",
    href: "/achat-de-lot-description",
    cta: "En savoir davantage",
  },
  {
    icon: Truck,
    photo: "/photos/entrepot.jpg",
    photoAlt: "Allée d'un entrepôt logistique remplie de palettes",
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
      <Hero />

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
              label: "Paiement rapide et garanti",
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
      <section className="container-site scroll-mt-24 py-16" id="services">
        <Reveal>
          <span className="eyebrow">Ce que nous faisons</span>
          <h2 className="section-title">Notre service clé en main</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {services.map(
            ({ icon: Icon, photo, photoAlt, title, text, href, cta }, i) => (
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
                  </div>
                </SpotlightCard>
              </Reveal>
            ),
          )}
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
            <OrbitVisual />
          </Reveal>
        </div>
      </section>

      {/* ===== Notre mission ===== */}
      <section className="relative overflow-hidden py-24 sm:py-28">
        <Image
          src="/photos/circuit.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.18]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-night-900 via-night-900/70 to-night-900"
          aria-hidden
        />
        <div className="container-site relative text-center">
          <Reveal>
            <span className="eyebrow">Notre mission</span>
            <h2 className="mx-auto max-w-3xl font-display text-3xl font-bold text-white sm:text-4xl">
              Chaque appareil mérite{" "}
              <span className="text-gradient">une seconde vie</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              Revendre votre matériel plutôt que le jeter, c&apos;est réduire
              les déchets électroniques, préserver les ressources naturelles —
              et récupérer de la valeur.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contact" className="btn-primary">
                Faire une soumission
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
