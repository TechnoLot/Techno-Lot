import {
  CalendarClock,
  CheckCircle2,
  HandCoins,
  MapPin,
  Package,
  Truck,
  Warehouse,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import Timeline from "@/components/Timeline";
import CtaBanner from "@/components/CtaBanner";
import { getDict, type Locale } from "@/lib/i18n";

const iconClass = "h-5 w-5 text-accent";

const stepIcons = [
  <CheckCircle2 key="i0" className={iconClass} aria-hidden />,
  <CalendarClock key="i1" className={iconClass} aria-hidden />,
  <MapPin key="i2" className={iconClass} aria-hidden />,
  <HandCoins key="i3" className={iconClass} aria-hidden />,
  <Package key="i4" className={iconClass} aria-hidden />,
  <Warehouse key="i5" className={iconClass} aria-hidden />,
  <Truck key="i6" className={iconClass} aria-hidden />,
];

const content = {
  fr: {
    eyebrow: "Notre processus",
    titleStart: "Prise en charge complète — ",
    titleAccent: "On s'occupe de tout !",
    subtitle:
      "Lorsque notre offre est acceptée, notre équipe se rend sur place pour emballer, charger et transporter le matériel. Voici comment ça se passe.",
    steps: [
      {
        title: "Validation de l'offre",
        text: "L'accord est confirmé par le client.",
      },
      {
        title: "Planification",
        text: "Coordination des dates et de la logistique.",
      },
      {
        title: "Visite sur site",
        text: "Déplacement de l'équipe à vos locaux.",
      },
      {
        title: "Paiement de la moitié sur place",
        text: (
          <div className="space-y-2">
            <p>
              La <strong className="font-semibold text-white">moitié</strong> du
              paiement sera émis lors du ramassage.
            </p>
            <p>
              Nous disposons ensuite d&apos;un{" "}
              <strong className="font-semibold text-white">
                maximum de 15 jours ouvrables
              </strong>{" "}
              pour inspecter le matériel afin de nous assurer de sa{" "}
              <strong className="font-semibold text-white">fonctionnalité</strong>{" "}
              et de sa{" "}
              <strong className="font-semibold text-white">
                condition esthétique
              </strong>
              .
            </p>
            <p>
              Le solde vous est versé après inspection,{" "}
              <strong className="font-semibold text-white">sans délai</strong> ;
              sinon, nous ajustons l&apos;offre en{" "}
              <strong className="font-semibold text-white">conséquence</strong>.
            </p>
          </div>
        ),
      },
      {
        title: "Emballage sécurisé",
        text: "Protection du matériel électronique.",
      },
      {
        title: "Chargement",
        text: "Manipulation et mise en sécurité dans les véhicules.",
      },
      {
        title: "Transport",
        text: "Acheminement sécurisé vers la destination.",
      },
    ],
    ctaTitle: "Laissez-nous nous occuper de votre lot",
    ctaText:
      "Obtenez une estimation gratuite avec une réponse dans un délai de 24 heures — ramassage inclus et paiement rapide et garanti.",
  },
  en: {
    eyebrow: "Our process",
    titleStart: "Full-service pickup — ",
    titleAccent: "We take care of everything!",
    subtitle:
      "Once our offer is accepted, our team comes on site to pack, load and transport the equipment. Here's how it works.",
    steps: [
      {
        title: "Offer validation",
        text: "The agreement is confirmed by the client.",
      },
      {
        title: "Planning",
        text: "Coordinating dates and logistics.",
      },
      {
        title: "On-site visit",
        text: "Our team travels to your premises.",
      },
      {
        title: "Half paid on site",
        text: (
          <div className="space-y-2">
            <p>
              <strong className="font-semibold text-white">Half</strong> of the
              payment is issued at pickup.
            </p>
            <p>
              We then have{" "}
              <strong className="font-semibold text-white">
                up to 15 business days
              </strong>{" "}
              to inspect the equipment to confirm its{" "}
              <strong className="font-semibold text-white">functionality</strong>{" "}
              and{" "}
              <strong className="font-semibold text-white">
                cosmetic condition
              </strong>
              .
            </p>
            <p>
              The balance is paid{" "}
              <strong className="font-semibold text-white">immediately</strong>{" "}
              after inspection; otherwise, we adjust the offer{" "}
              <strong className="font-semibold text-white">accordingly</strong>.
            </p>
          </div>
        ),
      },
      {
        title: "Secure packing",
        text: "Protecting the electronic equipment.",
      },
      {
        title: "Loading",
        text: "Handling and securing everything in the vehicles.",
      },
      {
        title: "Transport",
        text: "Secure delivery to the destination.",
      },
    ],
    ctaTitle: "Let us take care of your lot",
    ctaText:
      "Get a free estimate with a response within 24 hours — pickup included and fast, guaranteed payment.",
  },
};

export default function PriseEnChargePage({ locale }: { locale: Locale }) {
  const t = content[locale];
  const dict = getDict(locale);
  const steps = t.steps.map((step, i) => ({ ...step, icon: stepIcons[i] }));

  return (
    <>
      <PageHero
        eyebrow={t.eyebrow}
        title={
          <>
            {t.titleStart}
            <span className="text-gradient">{t.titleAccent}</span>
          </>
        }
        subtitle={t.subtitle}
        image="/photos/entrepot.jpg"
      />

      <section className="container-site pb-16">
        <div className="mx-auto max-w-2xl">
          <Timeline steps={steps} stepLabel={dict.timeline.step} />
        </div>
      </section>

      <CtaBanner locale={locale} title={t.ctaTitle} text={t.ctaText} />
    </>
  );
}
