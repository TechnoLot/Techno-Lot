import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, ClipboardList, Mail } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import Timeline from "@/components/Timeline";
import CtaBanner from "@/components/CtaBanner";

export const metadata: Metadata = {
  title: "Estimation de votre lot",
  description:
    "Comment fonctionne l'estimation de votre lot chez Techno Lot : soumission avec photos et inventaire, offre par courriel en 24 heures, récupération sans frais.",
  alternates: { canonical: "/consultation" },
};

const iconClass = "h-5 w-5 text-accent";

const etapes = [
  {
    icon: <ClipboardList className={iconClass} aria-hidden />,
    title: "Décrivez votre lot",
    text: "Contactez-nous en remplissant la soumission, décrivez le lot de matériel électronique concerné et joignez des photos et un inventaire complet (ex. document Excel).",
  },
  {
    icon: <Mail className={iconClass} aria-hidden />,
    title: "Recevez notre offre",
    text: "Vous recevez notre offre par courriel dans les 24 heures.",
  },
  {
    icon: <CalendarCheck className={iconClass} aria-hidden />,
    title: "Récupération sans frais",
    text: "Si vous êtes d'accord, nous prenons rendez-vous pour la récupération du lot sans aucuns frais.",
  },
];

export default function ConsultationPage() {
  return (
    <>
      <PageHero
        eyebrow="Comment ça marche"
        title="Estimation de votre lot"
        subtitle="Un processus simple, rapide et sans engagement, en trois étapes."
        image="/photos/clavier.jpg"
      />

      <section className="container-site pb-16">
        <div className="mx-auto max-w-2xl">
          <Timeline steps={etapes} />
        </div>
      </section>

      <section className="container-site pb-8">
        <Reveal className="mx-auto max-w-3xl">
          <div className="glass p-8 text-center">
            <h2 className="font-display text-xl font-semibold text-white">
              Pas le temps de procéder à un inventaire ?
            </h2>
            <p className="mt-4 leading-relaxed text-slate-300">
              Pour les volumes importants, nous pouvons envoyer un expert sur
              place pour estimer le lot. Il est aussi possible de convenir des
              modalités pratiques directement sur place.
            </p>
            <Link
              href="/achat-de-lot-description"
              className="group mt-6 inline-flex items-center gap-2 font-display text-sm font-semibold text-accent transition-colors hover:text-accent-bright"
            >
              Découvrez ce que nous rachetons
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>
        </Reveal>
      </section>

      <CtaBanner
        title="Prêt à faire estimer votre lot ?"
        text="Remplissez notre formulaire de soumission et recevez notre offre dans un délai de 24 heures."
      />
    </>
  );
}
