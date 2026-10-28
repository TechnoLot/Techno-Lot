import { PageHero } from "@/components/site/PageHero";
import { HeroCrumbs } from "@/components/seo/Breadcrumbs";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Reveal } from "@/components/site/Reveal";
import { Counter } from "@/components/site/Counter";
import { GhostButtonLink, PrimaryButtonLink } from "@/components/site/Button";
import { localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { B, Chapter, ChapterTitle } from "./services/Chapter";
import { DrawLine } from "./services/Parallax";
import { PinnedSteps } from "./services/PinnedSteps";
import { LoadingScene } from "./services/scenes";
import "./pages-services.css";

const content = {
  fr: {
    titleStart: "Prise en charge complète : ",
    titleAccent: "on s'occupe de tout !",
    intro:
      "Dès que notre offre est acceptée, notre équipe se rend sur place pour emballer, charger et transporter votre matériel. Vous n'avez rien à déplacer. Voici comment ça se passe.",
    heroCta: "Faire une soumission",
    heroAlt: "Camion de ramassage Techno Lot",
    heroCall: "Appeler",
    before: {
      title: "Avant le ramassage",
      intro: "Trois étapes simples, coordonnées avec vous, pour que la journée du ramassage se déroule sans surprise.",
      steps: [
        { title: "Validation de l'offre", text: "Vous confirmez l'accord : notre offre est acceptée, on passe à l'organisation." },
        { title: "Planification", text: "Nous coordonnons avec vous les dates et toute la logistique du ramassage." },
        { title: "Visite sur site", text: "Notre équipe se déplace directement à vos locaux, à la date convenue." },
      ],
    },
    pay: {
      title: "Paiement de la moitié sur place",
      lead: "payé dès le ramassage",
      days: "jours ouvrables, au maximum, pour l'inspection",
      lines: [
        <>
          La <B>moitié</B> du paiement est émise lors du ramassage.
        </>,
        <>
          Nous disposons ensuite d&apos;un <B>maximum de 15 jours ouvrables</B> pour inspecter le matériel et nous assurer de sa{" "}
          <B>fonctionnalité</B> et de sa <B>condition esthétique</B>.
        </>,
        <>
          Le solde vous est versé après l&apos;inspection, <B>sans délai</B> ; sinon, nous ajustons l&apos;offre en{" "}
          <B>conséquence</B>.
        </>,
      ],
    },
    onsite: {
      title: "Sur place, on s'occupe de tout",
      intro: "Faites défiler : votre matériel est emballé, chargé, puis transporté par notre équipe.",
      stage: "Le matériel est posé sur une palette, filmé, chargé dans le fourgon Techno Lot, puis transporté.",
      steps: [
        { title: "Emballage sécurisé", text: "Votre matériel électronique est protégé et emballé avec soin, directement dans vos locaux." },
        { title: "Chargement", text: "Nous manipulons le matériel et le mettons en sécurité dans nos véhicules." },
        { title: "Transport", text: "Le lot est acheminé de façon sécurisée jusqu'à sa destination." },
      ],
    },
    included: {
      title: "Ce qui est inclus, sans frais",
      items: [
        { value: 24, suffix: " h", label: "Réponse garantie à votre demande de soumission." },
        { word: "0 $", label: "Ramassage gratuit, partout au Québec." },
        { word: "Aucun", label: "minimum de quantité : petit ou gros lot, on se déplace." },
        { word: "Certificat", label: "de destruction des données remis sans frais." },
      ],
    },
    ctaTitle: "Laissez-nous nous occuper de votre lot",
    ctaText:
      "Obtenez une estimation gratuite avec une réponse dans un délai de 24 heures : ramassage inclus et paiement rapide et garanti.",
  },
  en: {
    titleStart: "Full-service pickup: ",
    titleAccent: "we take care of everything!",
    intro:
      "Once our offer is accepted, our team comes on site to pack, load and transport your equipment. You don't have to move a thing. Here's how it works.",
    heroCta: "Get a quote",
    heroAlt: "Techno Lot pickup truck",
    heroCall: "Call",
    before: {
      title: "Before pickup",
      intro: "Three simple steps, coordinated with you, so pickup day goes exactly as planned.",
      steps: [
        { title: "Offer validation", text: "You confirm the agreement: our offer is accepted and we move on to organizing." },
        { title: "Planning", text: "We coordinate the dates and all the pickup logistics with you." },
        { title: "On-site visit", text: "Our team travels directly to your premises on the agreed date." },
      ],
    },
    pay: {
      title: "Half paid on site",
      lead: "paid at pickup",
      days: "business days, at most, for inspection",
      lines: [
        <>
          <B>Half</B> of the payment is issued at pickup.
        </>,
        <>
          We then have <B>up to 15 business days</B> to inspect the equipment and confirm its <B>functionality</B> and{" "}
          <B>cosmetic condition</B>.
        </>,
        <>
          The balance is paid <B>immediately</B> after inspection; otherwise, we adjust the offer <B>accordingly</B>.
        </>,
      ],
    },
    onsite: {
      title: "On site, we handle everything",
      intro: "Keep scrolling: your equipment is packed, loaded and transported by our team.",
      stage: "The equipment is placed on a pallet, wrapped, loaded into the Techno Lot van, then transported.",
      steps: [
        { title: "Secure packing", text: "Your electronic equipment is protected and carefully packed, right at your premises." },
        { title: "Loading", text: "We handle the equipment and secure it in our vehicles." },
        { title: "Transport", text: "The lot is delivered securely to its destination." },
      ],
    },
    included: {
      title: "What's included, free of charge",
      items: [
        { value: 24, suffix: " h", label: "Guaranteed response to your quote request." },
        { word: "$0", label: "Free pickup, anywhere in Québec." },
        { word: "No", label: "minimum quantity: small or large lot, we come to you." },
        { word: "Certificate", label: "of data destruction, provided free of charge." },
      ],
    },
    ctaTitle: "Let us take care of your lot",
    ctaText: "Get a free estimate with a response within 24 hours: pickup included and fast, guaranteed payment.",
  },
};

export default function PriseEnChargePage({ locale }: { locale: Locale }) {
  const t = content[locale];
  const pct = locale === "fr" ? " %" : "%";

  return (
    <>
      <PageHero
        title={
          <>
            {t.titleStart}
            <span className="text-emerald">{t.titleAccent}</span>
          </>
        }
        intro={t.intro}
        image={{ kind: "object", src: "/images/camion/camion-techno-lot.webp", alt: t.heroAlt, width: 100 }}
        breadcrumbs={<HeroCrumbs locale={locale} name={locale === "en" ? "Full-service pickup" : "Prise en charge"} frPath="/prise-en-charge-complete" />}
      >
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <PrimaryButtonLink href={localePath(locale, "/soumission")}>{t.heroCta}</PrimaryButtonLink>
          <GhostButtonLink href={site.phoneHref}>
            {t.heroCall} {site.phone}
          </GhostButtonLink>
        </div>
      </PageHero>

      {/* 1. Lime : les trois étapes avant le ramassage, en frise */}
      <Chapter theme="lime" aria-labelledby="pec-avant">
        <div className="grid gap-10 lg:grid-cols-12">
          <ChapterTitle id="pec-avant" intro={t.before.intro} className="lg:col-span-7">
            {t.before.title}
          </ChapterTitle>
        </div>
        <ol className="relative mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          <DrawLine className="absolute left-0 right-0 top-[27px] hidden h-[2px] bg-ink/25 sm:block" />
          {t.before.steps.map((step, i) => (
            <li key={step.title} className="relative">
              <Reveal delay={0.1 + i * 0.09} y={24}>
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#0a0f1c] font-display text-lg font-bold text-[#8BE95F]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 font-display text-2xl font-bold leading-tight text-ink">{step.title}</h3>
                <p className="mt-2 max-w-xs text-base leading-relaxed text-moss">{step.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Chapter>

      {/* 2. Bleu nuit : le paiement, compteurs 50 % et 15 jours */}
      <Chapter theme="night" glow="both" aria-labelledby="pec-paiement">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <ChapterTitle id="pec-paiement" size="md">
              {t.pay.title}
            </ChapterTitle>
            <Reveal delay={0.1} className="mt-10 flex items-end gap-8">
              <div>
                <Counter
                  value={50}
                  suffix={pct}
                  plain
                  locale={locale}
                  className="block font-display text-[clamp(4.5rem,11vw,8rem)] font-bold leading-none tracking-[-0.04em] text-emerald"
                />
                <span className="mt-2 block text-sm font-semibold uppercase tracking-[0.12em] text-moss">{t.pay.lead}</span>
              </div>
            </Reveal>
          </div>
          <ol className="space-y-0 lg:col-span-7">
            {t.pay.lines.map((line, i) => (
              <li key={i}>
                <Reveal delay={0.08 + i * 0.08} className="flex gap-5 border-t border-line py-6">
                  <span className="mt-1 font-display text-sm font-bold tabular-nums text-emerald">{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-base leading-relaxed text-moss sm:text-lg">{line}</p>
                </Reveal>
              </li>
            ))}
            <li>
              <Reveal delay={0.32} className="flex items-baseline gap-4 border-t border-line pt-6">
                <Counter value={15} plain locale={locale} className="font-display text-5xl font-bold text-mist" />
                <span className="text-sm text-moss">{t.pay.days}</span>
              </Reveal>
            </li>
          </ol>
        </div>
      </Chapter>

      {/* 3. Menthe, épinglé : emballer → charger → transporter */}
      <PinnedSteps
        theme="mint"
        heading={t.onsite.title}
        intro={t.onsite.intro}
        steps={t.onsite.steps}
        scene={<LoadingScene />}
        stageLabel={t.onsite.stage}
        pinOnMobile
        aspect="aspect-[16/11]"
        lgAspect="lg:aspect-[16/11]"
      />

      {/* 4. Vert profond : ce qui est inclus */}
      <Chapter theme="deep" glow="right" aria-labelledby="pec-inclus">
        <ChapterTitle id="pec-inclus">{t.included.title}</ChapterTitle>
        <ul className="mt-14 grid gap-px overflow-hidden rounded-[28px] bg-line sm:grid-cols-2 lg:grid-cols-4">
          {t.included.items.map((item, i) => (
            <li key={item.label} className="bg-deep">
              <Reveal delay={i * 0.08} className="flex h-full flex-col p-7 sm:p-8">
                {"value" in item && typeof item.value === "number" ? (
                  <Counter
                    value={item.value}
                    suffix={item.suffix}
                    plain
                    locale={locale}
                    className="font-display text-5xl font-bold leading-none tracking-[-0.03em] text-emerald sm:text-6xl"
                  />
                ) : (
                  <span
                    className={`font-display font-bold leading-none tracking-[-0.03em] text-emerald ${
                      /\d/.test("word" in item ? item.word ?? "" : "") ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"
                    }`}
                  >
                    {"word" in item ? item.word : null}
                  </span>
                )}
                <p className="mt-5 text-base leading-relaxed text-moss">{item.label}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Chapter>

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} current="/prise-en-charge-complete" />
    </>
  );
}
