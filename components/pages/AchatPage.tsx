import {
  HardDrive,
  Laptop,
  Monitor,
  Network,
  PackageOpen,
  PhoneCall,
  PiggyBank,
  Printer,
  RefreshCcw,
  Server,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";
import CtaBanner from "@/components/CtaBanner";
import type { Locale } from "@/lib/i18n";

const categoryIcons = [
  Laptop,
  Server,
  Network,
  HardDrive,
  PhoneCall,
  Printer,
  Monitor,
];

const argumentIcons = [PiggyBank, RefreshCcw, ShieldCheck, TrendingUp];

const content = {
  fr: {
    eyebrow: "Nos catégories",
    title: "Ce que nous rachetons",
    subtitle:
      "Du poste de travail au centre de données : Techno Lot valorise tout votre matériel informatique et électronique.",
    categories: [
      {
        title: "Ordinateurs et portables",
        text: "Les postes de travail fixes et portables représentent une part importante des équipements rachetés. Même les machines plus anciennes peuvent être valorisées, que ce soit pour le reconditionnement ou le recyclage des composants.",
      },
      {
        title: "Serveurs",
        text: "Les serveurs sont souvent au cœur des infrastructures TI. Lorsqu'ils deviennent obsolètes ou que l'entreprise passe au nuage, leur revente permet de libérer de la place.",
      },
      {
        title: "Périphériques de réseau",
        text: "Routeurs, switchs, pare-feu et autres équipements réseau sont également pris en compte dans les processus de rachat. Ces équipements, bien qu'essentiels au fonctionnement d'une entreprise, peuvent rapidement devenir dépassés face aux nouvelles technologies.",
      },
      {
        title: "Stockage",
        text: "Les dispositifs de stockage, tels que les disques durs, les baies de stockage ou les SSD, peuvent également faire l'objet d'un rachat, surtout s'ils contiennent des données sensibles qui doivent être effacées de manière sécurisée avant la vente.",
      },
      {
        title: "Équipements de télécommunication",
        text: "Téléphones d'entreprise, systèmes de visioconférence et autres outils de communication.",
      },
      {
        title: "Matériel de bureautique",
        text: "Imprimantes, scanneurs, photocopieurs et autres équipements bureautiques.",
      },
      {
        title: "Écrans et moniteurs",
        text: "Les moniteurs, que ce soit pour des postes de travail ou des configurations multi-écrans, particulièrement lorsqu'il s'agit d'équipements de grande qualité ou de haute résolution.",
      },
    ],
    specialTitle: "Votre lot n'entre dans aucune catégorie ?",
    specialText: (
      <>
        Pas d&apos;inquiétude : nous rachetons{" "}
        <strong className="text-accent-bright">TOUT</strong> type de matériel
        électronique, alors nous serons en mesure de vous faire une offre pour
        votre lot.
      </>
    ),
    benefitsEyebrow: "Les avantages",
    benefitsTitle: "Pourquoi revendre son matériel informatique ?",
    benefits: [
      {
        title: "Optimisation des coûts",
        text: "En revendant vos anciens équipements, vous récupérez une part non négligeable de l'investissement initial. Cet apport financier peut être réinjecté dans des projets d'innovation ou dans le renouvellement de votre infrastructure TI, réduisant ainsi les coûts globaux liés à l'acquisition de nouveaux matériels.",
      },
      {
        title: "Gestion efficace du cycle de vie TI",
        text: "Plutôt que de conserver des équipements vieillissants qui ralentissent la productivité, vous pouvez les remplacer par des technologies plus modernes, plus rapides et plus adaptées à vos besoins actuels.",
      },
      {
        title: "Sécurisation des données",
        text: "Le rachat de matériel informatique par des prestataires spécialisés comprend souvent la gestion sécurisée de vos données sensibles. Ces entreprises offrent des services TI de suppression certifiée des données afin de garantir que vos informations ne tombent pas entre de mauvaises mains.",
      },
      {
        title: "Adaptation à l'évolution technologique",
        text: "Avec les avancées rapides en matière de technologie, garder du matériel obsolète peut freiner la croissance de votre entreprise. Le rachat de matériel informatique permet de vous adapter plus rapidement aux nouvelles tendances et aux innovations, garantissant ainsi une infrastructure TI à jour et performante.",
      },
    ],
    ctaTitle: "Un lot à vendre ?",
    ctaText: "Obtenez une estimation gratuite avec une réponse dans un délai de 24 heures.",
  },
  en: {
    eyebrow: "Our categories",
    title: "What we buy",
    subtitle:
      "From workstations to data centres: Techno Lot values all your IT and electronic equipment.",
    categories: [
      {
        title: "Computers and laptops",
        text: "Desktop and laptop workstations account for a large share of the equipment we buy back. Even older machines can be valued, whether for refurbishing or component recycling.",
      },
      {
        title: "Servers",
        text: "Servers are often at the heart of IT infrastructures. When they become obsolete or the company moves to the cloud, reselling them frees up space.",
      },
      {
        title: "Network equipment",
        text: "Routers, switches, firewalls and other network equipment are also included in buyback processes. Although essential to a company's operations, this equipment can quickly become outdated in the face of new technologies.",
      },
      {
        title: "Storage",
        text: "Storage devices such as hard drives, storage arrays and SSDs can also be bought back, especially when they contain sensitive data that must be securely erased before sale.",
      },
      {
        title: "Telecommunications equipment",
        text: "Business phones, videoconferencing systems and other communication tools.",
      },
      {
        title: "Office equipment",
        text: "Printers, scanners, photocopiers and other office equipment.",
      },
      {
        title: "Screens and monitors",
        text: "Monitors, whether for workstations or multi-screen setups, particularly high-quality or high-resolution equipment.",
      },
    ],
    specialTitle: "Your lot doesn't fit any category?",
    specialText: (
      <>
        No worries: we buy <strong className="text-accent-bright">ALL</strong>{" "}
        types of electronic equipment, so we will be able to make you an offer
        for your lot.
      </>
    ),
    benefitsEyebrow: "The benefits",
    benefitsTitle: "Why resell your IT equipment?",
    benefits: [
      {
        title: "Cost optimization",
        text: "By reselling your old equipment, you recover a significant part of your initial investment. This financial contribution can be reinvested in innovation projects or in renewing your IT infrastructure, reducing the overall costs of acquiring new equipment.",
      },
      {
        title: "Effective IT life-cycle management",
        text: "Rather than keeping aging equipment that slows productivity, you can replace it with more modern, faster technology better suited to your current needs.",
      },
      {
        title: "Data security",
        text: "IT equipment buyback by specialized providers often includes secure handling of your sensitive data. These companies offer certified data-erasure services to ensure your information doesn't fall into the wrong hands.",
      },
      {
        title: "Keeping pace with technology",
        text: "With rapid technological advances, holding on to obsolete equipment can hinder your company's growth. IT equipment buyback lets you adapt faster to new trends and innovations, ensuring an up-to-date, high-performing IT infrastructure.",
      },
    ],
    ctaTitle: "A lot to sell?",
    ctaText: "Get a free estimate with a response within 24 hours.",
  },
};

export default function AchatPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  return (
    <>
      <PageHero
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        image="/photos/datacenter.jpg"
      />

      <section className="container-site pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.categories.map(({ title, text }, i) => {
            const Icon = categoryIcons[i];
            return (
              <Reveal key={title} delay={(i % 4) * 0.08} className="h-full">
                <TiltCard className="h-full">
                  <div className="glass glass-hover flex h-full flex-col p-6">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                      <Icon className="h-5 w-5 text-accent" aria-hidden />
                    </div>
                    <h2 className="font-display text-lg font-semibold text-white">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {text}
                    </p>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}

          {/* Carte spéciale : tout le reste */}
          <Reveal delay={0.24} className="h-full">
            <TiltCard className="h-full">
              <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-accent/40 bg-accent/5 p-6 shadow-glow backdrop-blur-md">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/50">
                  <PackageOpen className="h-5 w-5 text-accent-bright" aria-hidden />
                </div>
                <h2 className="font-display text-lg font-semibold text-white">
                  {t.specialTitle}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  {t.specialText}
                </p>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      <section className="container-site pb-8">
        <Reveal>
          <span className="eyebrow">{t.benefitsEyebrow}</span>
          <h2 className="section-title">{t.benefitsTitle}</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {t.benefits.map(({ title, text }, i) => {
            const Icon = argumentIcons[i];
            return (
              <Reveal key={title} delay={(i % 2) * 0.1} className="h-full">
                <div className="glass glass-hover flex h-full gap-5 p-7">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                    <Icon className="h-5 w-5 text-accent" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {text}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} />
    </>
  );
}
