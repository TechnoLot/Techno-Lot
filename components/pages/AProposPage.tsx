import Image from "next/image";
import { PageHero } from "@/components/site/PageHero";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Reveal } from "@/components/site/Reveal";
import { Counter } from "@/components/site/Counter";
import type { Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { B, Chapter, ChapterTitle } from "./services/Chapter";
import { DrawLine, Parallax } from "./services/Parallax";
import { PinnedSteps } from "./services/PinnedSteps";
import { ObjectFrame, PhotoFrame } from "./services/scenes";
import "./pages-services.css";

const content = {
  fr: {
    /** Suivi du nom de l'entreprise, en vert. */
    title: "À propos de",
    intro: "La référence en matière de rachat de lots au Québec.",
    logoAlt: "Logo de Techno Lot",
    passion: {
      title: "Une passion qui nous démarque",
      lead: "Notre passion pour la technologie et notre engagement envers nos clients nous démarquent.",
      text: (
        <>
          Notre entreprise, <B>unique au Québec</B>, est née d&apos;une vision : offrir aux entreprises des solutions de rachat de
          matériel électronique et informatique de tout genre. Grâce à notre expertise, à notre service personnalisé et à notre
          attention aux détails, nous sommes fiers d&apos;être devenus la référence en matière de rachat de lots au Québec.
        </>
      ),
      alt: "Écrans et ordinateurs portables d'entreprise",
    },
    mission: {
      title: "Notre mission",
      intro: "Donner une valeur à votre matériel, partout au Québec.",
      steps: [
        {
          title: "Vendez-nous vos équipements TI",
          text: (
            <>
              Le rachat de matériel électronique permet aux entreprises de{" "}
              <B>vendre à Techno Lot leurs équipements TI obsolètes ou inutilisés</B>. Ce processus valorise vos actifs
              informatiques et vos anciens équipements.
            </>
          ),
        },
        {
          title: "Récupérez votre investissement",
          text: (
            <>
              Serveurs, ordinateurs ou périphériques peuvent encore avoir une valeur résiduelle. Le rachat vous permet de{" "}
              <B>récupérer une partie de votre investissement initial</B> plutôt que de laisser ces actifs s&apos;accumuler et
              perdre toute valeur.
            </>
          ),
        },
        {
          title: "Partout au Québec, on se déplace",
          text: (
            <>
              Notre équipe se déplace <B>partout au Québec</B> pour ramasser votre matériel, <B>gratuitement</B> et sans minimum
              de quantité : vous n&apos;avez rien à transporter.
            </>
          ),
        },
      ],
      truckTags: ["Ramassage gratuit", "Partout au Québec"],
    },
    pay: {
      title: "Notre engagement de paiement",
      steps: [
        { big: 50, unit: " %", label: "Ramassage", text: <>La <B>moitié</B> du paiement est émise lors du ramassage.</> },
        {
          big: 15,
          unit: " j",
          label: "Inspection",
          text: (
            <>
              Nous disposons ensuite d&apos;un <B>maximum de 15 jours ouvrables</B> pour inspecter le matériel et nous assurer de sa{" "}
              <B>fonctionnalité</B> et de sa <B>condition esthétique</B>.
            </>
          ),
        },
        {
          label: "Solde",
          word: "Sans délai",
          text: (
            <>
              Le solde vous est versé après l&apos;inspection, <B>sans délai</B> ; sinon, nous ajustons l&apos;offre en{" "}
              <B>conséquence</B>.
            </>
          ),
        },
      ],
    },
    promises: {
      title: "Nos engagements",
      items: [
        { big: 24, unit: " h", title: "Réponse garantie", text: "Notre offre vous parvient dans les 24 heures suivant votre demande." },
        { word: "0 $", title: "Ramassage gratuit", text: "Partout au Québec, sans minimum de quantité." },
        { word: "Sur place", title: "On s'occupe de tout", text: "Notre équipe emballe, charge et transporte le matériel." },
        { word: "Certificat", title: "Données protégées", text: "Un certificat de destruction des données vous est remis sans frais." },
      ],
    },
    ctaTitle: "Besoin de nos services ?",
    ctaText:
      "Contactez-nous dès aujourd'hui pour en savoir plus sur nos offres d'achat de lots, de réparation d'appareils électroniques et de recyclage de matériel informatique.",
    ctaButton: "Contactez-nous",
  },
  en: {
    title: "About",
    intro: "The reference for equipment lot buyback in Québec.",
    logoAlt: "Techno Lot logo",
    passion: {
      title: "A passion that sets us apart",
      lead: "Our passion for technology and our commitment to our clients set us apart.",
      text: (
        <>
          Our company, <B>one of a kind in Québec</B>, started with a vision: providing businesses with buyback solutions for
          electronic and IT equipment of all kinds. Thanks to our expertise, personalized service and attention to detail, we
          are proud to have become the reference for lot buyback in Québec.
        </>
      ),
      alt: "Business monitors and laptops",
    },
    mission: {
      title: "Our mission",
      intro: "Giving your equipment value, anywhere in Québec.",
      steps: [
        {
          title: "Sell us your IT equipment",
          text: (
            <>
              Electronic equipment buyback allows businesses to <B>sell Techno Lot their obsolete or unused IT equipment</B>.
              This process turns your IT assets and old equipment into value.
            </>
          ),
        },
        {
          title: "Recover your investment",
          text: (
            <>
              Servers, computers or peripherals may still hold residual value. Buyback lets you{" "}
              <B>recover part of your initial investment</B> instead of letting these assets pile up and lose all value.
            </>
          ),
        },
        {
          title: "Anywhere in Québec, we come to you",
          text: (
            <>
              Our team travels <B>anywhere in Québec</B> to pick up your equipment, <B>free of charge</B> and with no minimum
              quantity: you don&apos;t have to move a thing.
            </>
          ),
        },
      ],
      truckTags: ["Free pickup", "Anywhere in Québec"],
    },
    pay: {
      title: "Our payment commitment",
      steps: [
        { big: 50, unit: "%", label: "Pickup", text: <><B>Half</B> of the payment is issued at pickup.</> },
        {
          big: 15,
          unit: " d",
          label: "Inspection",
          text: (
            <>
              We then have <B>up to 15 business days</B> to inspect the equipment and confirm its <B>functionality</B> and{" "}
              <B>cosmetic condition</B>.
            </>
          ),
        },
        {
          label: "Balance",
          word: "Right away",
          text: (
            <>
              The balance is paid <B>immediately</B> after inspection; otherwise, we adjust the offer <B>accordingly</B>.
            </>
          ),
        },
      ],
    },
    promises: {
      title: "Our commitments",
      items: [
        { big: 24, unit: " h", title: "Guaranteed response", text: "Our offer reaches you within 24 hours of your request." },
        { word: "$0", title: "Free pickup", text: "Anywhere in Québec, with no minimum quantity." },
        { word: "On site", title: "We handle everything", text: "Our team packs, loads and transports the equipment." },
        { word: "Certificate", title: "Protected data", text: "A certificate of data destruction is provided free of charge." },
      ],
    },
    ctaTitle: "Need our services?",
    ctaText:
      "Contact us today to learn more about our lot purchasing, electronic device repair and IT equipment recycling services.",
    ctaButton: "Contact us",
  },
};

type Big = { big?: number; unit?: string; word?: string };

function BigValue({ item, locale, className }: { item: Big; locale: Locale; className: string }) {
  if (typeof item.big === "number") {
    return <Counter value={item.big} suffix={item.unit} plain locale={locale} className={className} />;
  }
  return <span className={className}>{item.word}</span>;
}

export default function AProposPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  return (
    <>
      <PageHero
        title={
          <>
            {t.title} <span className="text-emerald">{site.name}</span>
          </>
        }
        intro={t.intro}
        image={{ kind: "logo", alt: t.logoAlt }}
      />

      {/* 1. Menthe : la passion, grand énoncé + palette en parallaxe */}
      <Chapter theme="mint" glow="right" aria-labelledby="apropos-passion">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-7">
            <ChapterTitle id="apropos-passion">{t.passion.title}</ChapterTitle>
            <Reveal delay={0.08}>
              <p className="mt-8 font-display text-[clamp(1.35rem,2.4vw,1.9rem)] font-semibold leading-snug tracking-[-0.01em] text-emerald">
                {t.passion.lead}
              </p>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-moss sm:text-lg">{t.passion.text}</p>
            </Reveal>
          </div>
          <Parallax amount={56} className="mx-auto w-full max-w-[340px] lg:col-span-5 lg:max-w-none">
            <Image
              src="/images/flux/seconde-vie.webp"
              alt={t.passion.alt}
              width={1200}
              height={843}
              sizes="(max-width: 1024px) 340px, 440px"
              className="h-auto w-full drop-shadow-[0_30px_30px_rgba(14,58,32,0.25)]"
            />
          </Parallax>
        </div>
      </Chapter>

      {/* 2. Bleu nuit, épinglé : la mission, de la valeur de votre matériel jusqu'au ramassage partout au Québec */}
      <PinnedSteps
        theme="night"
        glow="left"
        heading={t.mission.title}
        intro={t.mission.intro}
        steps={t.mission.steps}
        frames={[
          <PhotoFrame key="a" src="/accueil/rachat-postes.webp" />,
          <PhotoFrame key="b" src="/accueil/rachat-investissement.webp" position="50% 52%" />,
          <ObjectFrame key="c" src="/images/camion/camion-techno-lot.webp" w={1200} h={497} width="86%" tags={t.mission.truckTags} />,
        ]}
      />

      {/* 3. Lime : l'engagement de paiement en trois temps, compteurs */}
      <Chapter theme="lime" aria-labelledby="apropos-paiement">
        <ChapterTitle id="apropos-paiement">{t.pay.title}</ChapterTitle>
        <ol className="relative mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
          <DrawLine className="absolute left-0 right-0 top-0 hidden h-[2px] bg-ink/30 md:block" />
          {t.pay.steps.map((s, i) => (
            <li key={s.label} className="relative md:pt-8">
              <Reveal delay={0.1 + i * 0.09}>
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-moss">
                  {String(i + 1).padStart(2, "0")} · {s.label}
                </span>
                <BigValue
                  item={s}
                  locale={locale}
                  className="mt-3 block font-display text-[clamp(3.25rem,7vw,5rem)] font-bold leading-none tracking-[-0.04em] text-ink"
                />
                <p className="mt-5 max-w-sm text-base leading-relaxed text-moss">{s.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Chapter>

      {/* 4. Vert profond : nos engagements, en rangées */}
      <Chapter theme="deep" glow="right" aria-labelledby="apropos-engagements">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ChapterTitle id="apropos-engagements">{t.promises.title}</ChapterTitle>
            <Reveal delay={0.1}>
              <p className="mt-6 text-base leading-relaxed text-moss">
                <a href={site.phoneHref} className="font-semibold text-mist underline-offset-4 hover:text-emerald hover:underline">
                  {site.phone}
                </a>
                {" · "}
                <a href={`mailto:${site.email}`} className="font-semibold text-mist underline-offset-4 hover:text-emerald hover:underline">
                  {site.email}
                </a>
              </p>
            </Reveal>
          </div>
          <ul className="lg:col-span-8">
            {t.promises.items.map((p, i) => (
              <li key={p.title}>
                <Reveal delay={i * 0.07} className="grid items-baseline gap-2 border-t border-line py-7 sm:grid-cols-[13rem_1fr] sm:gap-8">
                  <BigValue
                    item={p}
                    locale={locale}
                    className="font-display text-4xl font-bold leading-none tracking-[-0.03em] text-emerald sm:text-[2.6rem]"
                  />
                  <div>
                    <h3 className="font-display text-xl font-bold text-mist">{p.title}</h3>
                    <p className="mt-1.5 text-base leading-relaxed text-moss">{p.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </Chapter>

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} buttonLabel={t.ctaButton} href="/contact" />
    </>
  );
}
