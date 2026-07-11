import Link from "next/link";
import { ArrowRight, CalendarCheck, ClipboardList, Mail } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import Timeline from "@/components/Timeline";
import CtaBanner from "@/components/CtaBanner";
import { getDict, localePath, type Locale } from "@/lib/i18n";

const iconClass = "h-5 w-5 text-accent";

const stepIcons = [
  <ClipboardList key="i0" className={iconClass} aria-hidden />,
  <Mail key="i1" className={iconClass} aria-hidden />,
  <CalendarCheck key="i2" className={iconClass} aria-hidden />,
];

const content = {
  fr: {
    eyebrow: "Comment ça marche",
    title: "Estimation de votre lot",
    subtitle: "Un processus simple, rapide et sans engagement, en trois étapes.",
    steps: [
      {
        title: "Décrivez votre lot",
        text: "Contactez-nous en remplissant la soumission, décrivez le lot de matériel électronique concerné et joignez des photos et un inventaire complet (ex. document Excel).",
      },
      {
        title: "Recevez notre offre",
        text: "Vous recevez notre offre par courriel dans les 24 heures.",
      },
      {
        title: "Récupération sans frais",
        text: "Si vous êtes d'accord, nous prenons rendez-vous pour la récupération du lot sans aucuns frais.",
      },
    ],
    boxTitle: "Pas le temps de procéder à un inventaire ?",
    boxText:
      "Pour les volumes importants, nous pouvons envoyer un expert sur place pour estimer le lot. Il est aussi possible de convenir des modalités pratiques directement sur place.",
    boxLink: "Découvrez ce que nous rachetons",
    ctaTitle: "Prêt à faire estimer votre lot ?",
    ctaText:
      "Remplissez notre formulaire de soumission et recevez notre offre dans un délai de 24 heures.",
  },
  en: {
    eyebrow: "How it works",
    title: "Get your lot appraised",
    subtitle: "A simple, fast, no-obligation process in three steps.",
    steps: [
      {
        title: "Describe your lot",
        text: "Contact us by filling out the quote form, describe the lot of electronic equipment and attach photos and a complete inventory (e.g. an Excel document).",
      },
      {
        title: "Receive our offer",
        text: "You receive our offer by email within 24 hours.",
      },
      {
        title: "Free pickup",
        text: "If you agree, we schedule an appointment to pick up the lot at no charge.",
      },
    ],
    boxTitle: "No time to build an inventory?",
    boxText:
      "For large volumes, we can send an expert on site to appraise the lot. Practical arrangements can also be agreed upon directly on site.",
    boxLink: "See what we buy",
    ctaTitle: "Ready to have your lot appraised?",
    ctaText: "Fill out our quote form and receive our offer within 24 hours.",
  },
};

export default function ConsultationPage({ locale }: { locale: Locale }) {
  const t = content[locale];
  const dict = getDict(locale);
  const steps = t.steps.map((step, i) => ({ ...step, icon: stepIcons[i] }));

  return (
    <>
      <PageHero
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        image="/photos/clavier.jpg"
      />

      <section className="container-site pb-16">
        <div className="mx-auto max-w-2xl">
          <Timeline steps={steps} stepLabel={dict.timeline.step} />
        </div>
      </section>

      <section className="container-site pb-8">
        <Reveal className="mx-auto max-w-3xl">
          <div className="glass p-8 text-center">
            <h2 className="font-display text-xl font-semibold text-white">
              {t.boxTitle}
            </h2>
            <p className="mt-4 leading-relaxed text-slate-300">{t.boxText}</p>
            <Link
              href={localePath(locale, "/achat-de-lot-description")}
              className="group mt-6 inline-flex items-center gap-2 font-display text-sm font-semibold text-accent transition-colors hover:text-accent-bright"
            >
              {t.boxLink}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>
        </Reveal>
      </section>

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} />
    </>
  );
}
