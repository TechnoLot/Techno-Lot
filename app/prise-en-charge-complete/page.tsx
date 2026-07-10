import type { Metadata } from "next";
import {
  CalendarClock,
  CheckCircle2,
  MapPin,
  Package,
  Truck,
  Warehouse,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import Timeline from "@/components/Timeline";
import CtaBanner from "@/components/CtaBanner";

export const metadata: Metadata = {
  title: "Prise en charge complète",
  description:
    "On s'occupe de tout ! De la validation de l'offre au transport sécurisé : emballage, chargement et acheminement de votre lot par l'équipe Techno Lot.",
  alternates: { canonical: "/prise-en-charge-complete" },
};

const iconClass = "h-5 w-5 text-accent";

const etapes = [
  {
    icon: <CheckCircle2 className={iconClass} aria-hidden />,
    title: "Validation de l'offre",
    text: "L'accord est confirmé par le client.",
  },
  {
    icon: <CalendarClock className={iconClass} aria-hidden />,
    title: "Planification",
    text: "Coordination des dates et de la logistique.",
  },
  {
    icon: <MapPin className={iconClass} aria-hidden />,
    title: "Visite sur site",
    text: "Déplacement de l'équipe à vos locaux.",
  },
  {
    icon: <Package className={iconClass} aria-hidden />,
    title: "Emballage sécurisé",
    text: "Protection du matériel électronique.",
  },
  {
    icon: <Warehouse className={iconClass} aria-hidden />,
    title: "Chargement",
    text: "Manipulation et mise en sécurité dans les véhicules.",
  },
  {
    icon: <Truck className={iconClass} aria-hidden />,
    title: "Transport",
    text: "Acheminement sécurisé vers la destination.",
  },
];

export default function PriseEnChargePage() {
  return (
    <>
      <PageHero
        eyebrow="Notre processus"
        title={
          <>
            Prise en charge complète —{" "}
            <span className="text-gradient">On s&apos;occupe de tout !</span>
          </>
        }
        subtitle="Lorsque notre offre est acceptée, notre équipe se rend sur place pour emballer, charger et transporter le matériel. Voici comment ça se passe."
      />

      <section className="container-site pb-16">
        <div className="mx-auto max-w-2xl">
          <Timeline steps={etapes} />
        </div>
      </section>

      <CtaBanner
        title="Laissez-nous nous occuper de votre lot"
        text="Obtenez une estimation gratuite avec une réponse dans un délai de 24 heures — ramassage inclus et paiement rapide et garanti."
      />
    </>
  );
}
