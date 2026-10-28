import Image from "next/image";
import { PageHero } from "@/components/site/PageHero";
import { HeroCrumbs } from "@/components/seo/Breadcrumbs";
import { CtaBanner } from "@/components/site/CtaBanner";
import { Reveal } from "@/components/site/Reveal";
import { Counter } from "@/components/site/Counter";
import { InkButtonLink, PrimaryButtonLink } from "@/components/site/Button";
import { localePath, type Locale } from "@/lib/i18n";
import { B, Chapter, ChapterTitle } from "./services/Chapter";
import { Parallax } from "./services/Parallax";
import { PaymentFrame } from "./services/PaymentFrame";
import { PinnedSteps } from "./services/PinnedSteps";
import { ObjectFrame, OfferFrame } from "./services/scenes";
import "./pages-services.css";

const content = {
  fr: {
    title: "Estimation de votre lot",
    intro: "Un processus simple, rapide et sans engagement.",
    heroCta: "Faire une soumission",
    heroAlt: "Planchette d'inventaire posée sur un ordinateur portable",
    figures: [
      { value: 24, suffix: " h", label: "pour recevoir notre offre par courriel" },
      { word: "0 $", label: "de frais pour la récupération du lot" },
      { value: 50, suffix: " %", label: "du paiement émis dès le ramassage" },
    ],
    steps: {
      title: "Les étapes de l'estimation",
      intro: "De votre description à votre premier paiement, en quatre temps.",
      tags: ["Photos", "Inventaire Excel"],
      offerLabel: "Votre offre",
      offerBig: "24 h",
      offerCaption: "Notre offre arrive dans votre boîte courriel.",
      paySuffix: " %",
      payCaption: "au ramassage",
      payCaptionEnd: "après l'inspection",
      payNote: "Inspection : 15 jours ouvrables max.",
      items: [
        {
          title: "Décrivez votre lot",
          text: "Remplissez la soumission en décrivant le lot de matériel électronique concerné, et joignez des photos ainsi qu'un inventaire complet (ex. document Excel).",
        },
        { title: "Recevez notre offre", text: "Vous recevez notre offre par courriel dans les 24 heures." },
        {
          title: "Récupération sans frais",
          text: "Si l'offre vous convient, nous prenons rendez-vous pour la récupération du lot, sans aucuns frais.",
        },
        {
          title: "Paiement de la moitié sur place",
          text: (
            <div className="space-y-2">
              <p>
                La <B>moitié</B> du paiement est émise lors du ramassage.
              </p>
              <p>
                Nous disposons ensuite d&apos;un <B>maximum de 15 jours ouvrables</B> pour inspecter le matériel et nous assurer de
                sa <B>fonctionnalité</B> et de sa <B>condition esthétique</B>.
              </p>
              <p>
                Le solde vous est versé après l&apos;inspection, <B>sans délai</B> ; sinon, nous ajustons l&apos;offre en{" "}
                <B>conséquence</B>.
              </p>
            </div>
          ),
        },
      ],
    },
    box: {
      title: "Pas le temps de procéder à un inventaire ?",
      text: "Pour les volumes importants, nous pouvons envoyer un expert sur place pour estimer le lot. Il est aussi possible de convenir des modalités pratiques directement sur place.",
      link: "Découvrez ce que nous rachetons",
      alt: "Équipements réseau d'entreprise",
    },
    ctaTitle: "Prêt à faire estimer votre lot ?",
    ctaText: "Remplissez notre formulaire de soumission et recevez notre offre dans un délai de 24 heures.",
  },
  en: {
    title: "Get your lot appraised",
    intro: "A simple, fast, no-obligation process.",
    heroCta: "Get a quote",
    heroAlt: "Inventory clipboard on a laptop",
    figures: [
      { value: 24, suffix: " h", label: "to receive our offer by email" },
      { word: "$0", label: "in fees to pick up the lot" },
      { value: 50, suffix: "%", label: "of the payment issued at pickup" },
    ],
    steps: {
      title: "How the appraisal works",
      intro: "From your description to your first payment, in four steps.",
      tags: ["Photos", "Excel inventory"],
      offerLabel: "Your offer",
      offerBig: "24 h",
      offerCaption: "Our offer lands in your inbox.",
      paySuffix: "%",
      payCaption: "at pickup",
      payCaptionEnd: "after inspection",
      payNote: "Inspection: 15 business days max.",
      items: [
        {
          title: "Describe your lot",
          text: "Fill out the quote form describing the lot of electronic equipment, and attach photos and a complete inventory (e.g. an Excel document).",
        },
        { title: "Receive our offer", text: "You receive our offer by email within 24 hours." },
        { title: "Free pickup", text: "If the offer suits you, we schedule an appointment to pick up the lot at no charge." },
        {
          title: "Half paid on site",
          text: (
            <div className="space-y-2">
              <p>
                <B>Half</B> of the payment is issued at pickup.
              </p>
              <p>
                We then have <B>up to 15 business days</B> to inspect the equipment and confirm its <B>functionality</B> and{" "}
                <B>cosmetic condition</B>.
              </p>
              <p>
                The balance is paid <B>immediately</B> after inspection; otherwise, we adjust the offer <B>accordingly</B>.
              </p>
            </div>
          ),
        },
      ],
    },
    box: {
      title: "No time to build an inventory?",
      text: "For large volumes, we can send an expert on site to appraise the lot. Practical arrangements can also be agreed upon directly on site.",
      link: "See what we buy",
      alt: "Business network equipment",
    },
    ctaTitle: "Ready to have your lot appraised?",
    ctaText: "Fill out our quote form and receive our offer within 24 hours.",
  },
};

export default function ConsultationPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  const s = t.steps;

  return (
    <>
      <PageHero
        title={t.title}
        intro={t.intro}
        image={{ kind: "object", src: "/images/services/soumission.webp", alt: t.heroAlt, width: 88 }}
        breadcrumbs={<HeroCrumbs locale={locale} name={locale === "en" ? "Appraisal" : "Estimation"} frPath="/consultation" />}
      >
        <div className="mt-8">
          <PrimaryButtonLink href={localePath(locale, "/soumission")}>{t.heroCta}</PrimaryButtonLink>
        </div>
      </PageHero>

      {/* 1. Lime : trois chiffres clés, compteurs */}
      <section data-theme="lime" aria-label={t.title} className="relative overflow-clip py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <ul className="grid gap-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-ink/20">
            {t.figures.map((f, i) => (
              <li key={f.label} className="sm:px-8 sm:first:pl-0 sm:last:pr-0">
                <Reveal delay={i * 0.09}>
                  {"value" in f && typeof f.value === "number" ? (
                    <Counter
                      value={f.value}
                      suffix={f.suffix}
                      plain
                      locale={locale}
                      className="block font-display text-[clamp(3.5rem,7.5vw,6rem)] font-bold leading-none tracking-[-0.04em] text-ink"
                    />
                  ) : (
                    <span className="block font-display text-[clamp(3.5rem,7.5vw,6rem)] font-bold leading-none tracking-[-0.04em] text-ink">
                      {"word" in f ? f.word : null}
                    </span>
                  )}
                  <span className="mt-3 block max-w-[16rem] text-base leading-snug text-moss">{f.label}</span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2. Bleu nuit, épinglé : les quatre étapes de l'estimation */}
      <PinnedSteps
        theme="night"
        glow="both"
        heading={s.title}
        intro={s.intro}
        steps={s.items}
        frames={[
          <ObjectFrame key="a" src="/images/services/soumission.webp" w={827} h={408} width="66%" tags={s.tags} />,
          <OfferFrame key="b" label={s.offerLabel} big={s.offerBig} caption={s.offerCaption} />,
          <ObjectFrame key="c" src="/images/camion/camion-techno-lot.webp" w={1200} h={497} width="86%" />,
          <PaymentFrame key="d" suffix={s.paySuffix} captionStart={s.payCaption} captionEnd={s.payCaptionEnd} note={s.payNote} />,
        ]}
      />

      {/* 3. Menthe : pas le temps de faire l'inventaire */}
      <Chapter theme="mint" glow="right" aria-labelledby="estimation-inventaire">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-7">
            <ChapterTitle id="estimation-inventaire">{t.box.title}</ChapterTitle>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-moss sm:text-lg">{t.box.text}</p>
            </Reveal>
            <Reveal delay={0.18} className="mt-8">
              <InkButtonLink href={localePath(locale, "/achat-de-lot-description")}>{t.box.link}</InkButtonLink>
            </Reveal>
          </div>
          <Parallax amount={60} className="mx-auto w-full max-w-[360px] lg:col-span-5 lg:max-w-none">
            <Image
              src="/images/services/reseau.webp"
              alt={t.box.alt}
              width={1000}
              height={538}
              sizes="(max-width: 1024px) 360px, 440px"
              className="h-auto w-full drop-shadow-[0_30px_30px_rgba(14,58,32,0.25)]"
            />
          </Parallax>
        </div>
      </Chapter>

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} current="/consultation" />
    </>
  );
}
