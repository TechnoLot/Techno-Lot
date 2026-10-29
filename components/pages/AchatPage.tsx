import Image from "next/image";
import MotionProvider from "@/components/MotionProvider";
import { PageHero } from "@/components/site/PageHero";
import { HeroCrumbs } from "@/components/seo/Breadcrumbs";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Reveal } from "@/components/site/Reveal";
import { Marquee } from "@/components/site/Marquee";
import { InkButtonLink, PrimaryButtonLink } from "@/components/site/Button";
import { localePath, type Locale } from "@/lib/i18n";
import { findRoute } from "@/lib/seo/routes";
import { Chapter } from "./services/Chapter";
import { CategoryRail, type RailItem } from "./services/CategoryRail";
import { Parallax } from "./services/Parallax";
import "./pages-services.css";

const images = [
  "/accueil/rachat-portables.webp",
  "/accueil/rachat-serveurs.webp",
  "/accueil/rachat-reseau.webp",
  "/accueil/rachat-stockage.webp",
  "/images/pages/rachat-telecom.webp",
  "/images/pages/rachat-bureautique.webp",
  "/accueil/rachat-ecrans.webp",
];

/**
 * Page dédiée de chaque catégorie (même ordre que `images`), en français
 * seulement : ordinateurs et écrans → portables, serveurs et stockage →
 * serveurs, réseau et télécom → réseau ; rien pour la bureautique.
 */
const categoryPages: (string | null)[] = [
  "/rachat-ordinateurs-portables-en-lot",
  "/rachat-serveurs-et-stockage",
  "/rachat-equipements-reseau-telecom",
  "/rachat-serveurs-et-stockage",
  "/rachat-equipements-reseau-telecom",
  null,
  "/rachat-ordinateurs-portables-en-lot",
];

const content = {
  fr: {
    title: "Ce que nous rachetons",
    intro:
      "Du poste de travail au centre de données : Techno Lot valorise tout votre matériel informatique et électronique, quelle que soit la taille du lot.",
    heroCta: "Faire une soumission",
    heroAlt: "Pile d'ordinateurs portables usagés",
    ribbon: "Matériel que nous rachetons",
    railTitle: "Nos catégories de matériel",
    railIntro: "Faites défiler pour parcourir chaque famille d'équipements.",
    railLabel: "Catégories de matériel racheté",
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
        text: "Routeurs, commutateurs (switchs), pare-feu et autres équipements réseau font aussi partie du rachat. Essentiels au fonctionnement d'une entreprise, ils peuvent vite être dépassés par les nouvelles technologies.",
      },
      {
        title: "Stockage",
        text: "Disques durs, baies de stockage ou SSD peuvent aussi être rachetés, surtout s'ils contiennent des données sensibles qui doivent être effacées de manière sécurisée avant la vente.",
      },
      {
        title: "Équipements de télécommunication",
        text: "Téléphones d'entreprise, systèmes de visioconférence et autres outils de communication.",
      },
      {
        title: "Matériel de bureautique",
        text: "Imprimantes, numériseurs, photocopieurs et autres équipements de bureau.",
      },
      {
        title: "Écrans et moniteurs",
        text: "Les moniteurs de postes de travail ou de configurations multi-écrans, en particulier les équipements de grande qualité ou à haute résolution.",
      },
    ],
    special: {
      word: "TOUT",
      title: "Votre lot n'entre dans aucune catégorie ?",
      text: (
        <>
          Pas d&apos;inquiétude : nous rachetons <strong className="font-semibold text-mist">TOUT</strong> type de matériel
          électronique. Nous serons en mesure de vous faire une offre pour votre lot.
        </>
      ),
    },
    benefitsTitle: "Pourquoi revendre son matériel informatique ?",
    benefitsAlt: "Écrans et ordinateurs portables d'entreprise",
    benefits: [
      {
        title: "Optimisation des coûts",
        text: "En revendant vos anciens équipements, vous récupérez une part non négligeable de l'investissement initial. Cet apport peut être réinjecté dans des projets d'innovation ou dans le renouvellement de votre infrastructure TI, ce qui réduit les coûts globaux liés à l'achat de nouveau matériel.",
      },
      {
        title: "Gestion efficace du cycle de vie TI",
        text: "Plutôt que de conserver des équipements vieillissants qui ralentissent la productivité, vous pouvez les remplacer par des technologies plus modernes, plus rapides et mieux adaptées à vos besoins actuels.",
      },
      {
        title: "Sécurisation des données",
        text: "Le rachat de matériel informatique par des prestataires spécialisés comprend souvent la gestion sécurisée de vos données sensibles. Ces entreprises offrent une suppression certifiée des données afin que vos informations ne tombent pas entre de mauvaises mains.",
      },
      {
        title: "Adaptation à l'évolution technologique",
        text: "Avec des avancées technologiques rapides, garder du matériel obsolète peut freiner la croissance de votre entreprise. Le rachat vous permet de vous adapter plus vite aux nouvelles tendances et innovations, pour une infrastructure TI à jour et performante.",
      },
    ],
    ctaTitle: "Un lot à vendre ?",
    ctaText: "Obtenez une estimation gratuite avec une réponse dans un délai de 24 heures.",
  },
  en: {
    title: "What we buy",
    intro:
      "From workstations to data centres: Techno Lot puts a value on all your IT and electronic equipment, whatever the size of the lot.",
    heroCta: "Get a quote",
    heroAlt: "Stack of used laptops",
    ribbon: "Equipment we buy",
    railTitle: "Equipment categories",
    railIntro: "Keep scrolling to browse each family of equipment.",
    railLabel: "Categories of equipment we buy",
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
        text: "Routers, switches, firewalls and other network equipment are also part of the buyback. Although essential to a company's operations, this equipment can quickly become outdated by new technologies.",
      },
      {
        title: "Storage",
        text: "Hard drives, storage arrays and SSDs can also be bought back, especially when they contain sensitive data that must be securely erased before sale.",
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
        text: "Monitors for workstations or multi-screen setups, particularly high-quality or high-resolution equipment.",
      },
    ],
    special: {
      word: "ALL",
      title: "Your lot doesn't fit any category?",
      text: (
        <>
          No worries: we buy <strong className="font-semibold text-mist">ALL</strong> types of electronic equipment, so we
          will be able to make you an offer for your lot.
        </>
      ),
    },
    benefitsTitle: "Why resell your IT equipment?",
    benefitsAlt: "Business monitors and laptops",
    benefits: [
      {
        title: "Cost optimization",
        text: "By reselling your old equipment, you recover a significant part of your initial investment. That money can be reinvested in innovation projects or in renewing your IT infrastructure, reducing the overall cost of acquiring new equipment.",
      },
      {
        title: "Effective IT life-cycle management",
        text: "Rather than keeping aging equipment that slows productivity, you can replace it with more modern, faster technology better suited to your current needs.",
      },
      {
        title: "Data security",
        text: "IT equipment buyback by specialized providers often includes secure handling of your sensitive data. These companies offer certified data erasure so your information doesn't fall into the wrong hands.",
      },
      {
        title: "Keeping pace with technology",
        text: "With rapid technological advances, holding on to obsolete equipment can hinder your company's growth. Buyback lets you adapt faster to new trends and innovations, for an up-to-date, high-performing IT infrastructure.",
      },
    ],
    ctaTitle: "A lot to sell?",
    ctaText: "Get a free estimate with a response within 24 hours.",
  },
};

export default function AchatPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  const items: RailItem[] = t.categories.map((c, i) => {
    const href = locale === "fr" ? categoryPages[i] : null;
    const link = href && findRoute(href)?.fr === href ? { href, label: "En savoir plus" } : undefined;
    return { ...c, image: images[i], link };
  });

  // Moteur framer-motion (LazyMotion) monté ici seulement : seuls les gabarits à composants m.* le chargent
  return (
    <MotionProvider>
      <PageHero
        title={t.title}
        intro={t.intro}
        image={{ kind: "object", src: "/images/palette/obj-pile-portables.webp", alt: t.heroAlt, width: 86 }}
        breadcrumbs={<HeroCrumbs locale={locale} name={locale === "en" ? "What we buy" : "Ce que nous rachetons"} frPath="/achat-de-lot-description" />}
      >
        <div className="mt-8">
          <PrimaryButtonLink href={localePath(locale, "/soumission")}>{t.heroCta}</PrimaryButtonLink>
        </div>
      </PageHero>

      {/* 1. Lime : ruban des catégories qui défile avec la page */}
      <section data-theme="lime" aria-label={t.ribbon} className="relative overflow-clip py-7 sm:py-9">
        <Marquee label={t.ribbon} speed={44}>
          {t.categories.map((c) => (
            <span key={c.title} className="flex items-center gap-8 pr-8 font-display text-2xl font-bold tracking-[-0.01em] text-ink sm:text-4xl">
              {c.title}
              <span aria-hidden="true" className="h-3 w-3 rotate-45 bg-ink" />
            </span>
          ))}
        </Marquee>
      </section>

      {/* 2. Vert profond, épinglé : les catégories défilent avec leurs objets */}
      <CategoryRail
        theme="deep"
        heading={t.railTitle}
        intro={t.railIntro}
        items={items}
        label={t.railLabel}
        special={{
          ...t.special,
          action: <InkButtonLink href={localePath(locale, "/soumission")}>{t.heroCta}</InkButtonLink>,
        }}
      />

      {/* 3. Menthe : titre et image collés à gauche, avantages qui défilent à droite */}
      <Chapter theme="mint" glow="right" aria-labelledby="achat-avantages">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[calc(var(--site-header-h,96px)+32px)]">
              <Reveal>
                <h2
                  id="achat-avantages"
                  className="font-display text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.025em] text-mist"
                >
                  {t.benefitsTitle}
                </h2>
              </Reveal>
              <Parallax amount={36} className="mt-10 hidden lg:block">
                <Image
                  src="/images/flux/seconde-vie.webp"
                  alt={t.benefitsAlt}
                  width={1200}
                  height={843}
                  sizes="420px"
                  className="h-auto w-full drop-shadow-[0_30px_30px_rgba(14,58,32,0.22)]"
                />
              </Parallax>
            </div>
          </div>
          <ol className="lg:col-span-7">
            {t.benefits.map((b, i) => (
              <li key={b.title}>
                <Reveal delay={i * 0.07} className="grid gap-3 border-t border-line-strong py-9 sm:grid-cols-[5rem_1fr] sm:gap-6">
                  <span className="font-display text-4xl font-bold leading-none tracking-[-0.03em] text-emerald sm:text-5xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold leading-snug text-mist sm:text-2xl">{b.title}</h3>
                    <p className="mt-3 text-base leading-relaxed text-moss">{b.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </Chapter>

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} current="/achat-de-lot-description" />
    </MotionProvider>
  );
}
