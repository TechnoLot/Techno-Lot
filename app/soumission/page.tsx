import type { Metadata } from "next";
import { BadgeCheck, Gift, Smartphone } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";
import CtaBanner from "@/components/CtaBanner";

export const metadata: Metadata = {
  title: "Soumission — Rachat de matériel informatique et électronique",
  description:
    "Obtenez une estimation gratuite pour le rachat de votre matériel informatique et électronique, avec une réponse dans un délai de 24 heures. Unique au Québec.",
  alternates: { canonical: "/soumission" },
};

const blocs = [
  {
    icon: BadgeCheck,
    title: "Satisfaction garantie",
    text: "Grâce à notre connaissance approfondie des infrastructures technologiques, nous offrons une évaluation précise de vos équipements et un prix juste et compétitif, le tout avec un délai de réponse ultra rapide.",
  },
  {
    icon: Gift,
    title: "Estimation gratuite",
    text: "Notre estimation est gratuite et sans engagement. Remplissez le formulaire de soumission et laissez-nous vous faire une offre pour votre lot de matériel.",
  },
  {
    icon: Smartphone,
    title: "Rachat de matériel électronique",
    text: "Téléphones, tablettes, appareils audio et vidéo — confiez-nous votre équipement électronique et recevez une offre juste.",
  },
];

export default function SoumissionPage() {
  return (
    <>
      <PageHero
        eyebrow="Soumission"
        title="Soumission pour rachat de matériel informatique et électronique"
        subtitle="Nous sommes fiers d'être la seule entreprise dans le domaine au Québec à offrir ce service. Obtenez une estimation gratuite avec une réponse dans un délai de 24 heures."
        image="/photos/bureau.jpg"
      />

      <section className="container-site pb-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {blocs.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.12} className="h-full">
              <TiltCard className="h-full">
                <div className="glass glass-hover flex h-full flex-col p-8">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                    <Icon className="h-6 w-6 text-accent" aria-hidden />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-white">
                    {title}
                  </h2>
                  <p className="mt-3 leading-relaxed text-slate-300">{text}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <CtaBanner
        title="Obtenez une estimation gratuite dès aujourd'hui"
        text="Remplissez notre formulaire et recevez notre offre dans un délai de 24 heures."
      />
    </>
  );
}
