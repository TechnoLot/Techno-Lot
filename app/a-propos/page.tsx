import type { Metadata } from "next";
import { Handshake, PiggyBank, Sparkles } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import CtaBanner from "@/components/CtaBanner";

export const metadata: Metadata = {
  title: "À Propos",
  description:
    "Chez Techno Lot, notre passion pour la technologie et notre engagement envers nos clients nous démarquent. Découvrez la référence en matière de rachat de lots au Québec.",
  alternates: { canonical: "/a-propos" },
};

export default function AProposPage() {
  return (
    <>
      <PageHero
        eyebrow="Notre histoire"
        title="À Propos de Techno Lot"
        subtitle="La référence en matière de rachat de lots au Québec."
        image="/photos/equipe.jpg"
      />

      <section className="container-site pb-8">
        <div className="mx-auto max-w-3xl space-y-10">
          <Reveal>
            <div className="glass glass-hover p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                <Sparkles className="h-6 w-6 text-accent" aria-hidden />
              </div>
              <h2 className="font-display text-xl font-semibold text-white">
                Une passion qui nous démarque
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                Chez Techno Lot, notre passion pour la technologie et notre
                engagement envers nos clients nous démarquent de la
                concurrence. Notre entreprise, unique au Québec, a commencé
                avec la vision de fournir des solutions de rachat de matériel
                électronique et informatique de tout genre pour les
                entreprises. Grâce à notre expertise, notre service
                personnalisé et notre attention aux détails, nous sommes fiers
                de devenir la référence en matière de rachat de lots au Québec.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="glass glass-hover p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                <Handshake className="h-6 w-6 text-accent" aria-hidden />
              </div>
              <h2 className="font-display text-xl font-semibold text-white">
                Vendez-nous vos équipements TI
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                Le rachat de matériel électronique permet aux entreprises de{" "}
                <strong className="text-white">
                  vendre à Techno Lot leurs équipements TI obsolètes ou
                  inutilisés
                </strong>
                . Ce processus valorise vos actifs informatiques et vos anciens
                équipements.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="glass glass-hover p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                <PiggyBank className="h-6 w-6 text-accent" aria-hidden />
              </div>
              <h2 className="font-display text-xl font-semibold text-white">
                Récupérez votre investissement
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                Qu&apos;il s&apos;agisse de serveurs, d&apos;ordinateurs ou de
                périphériques, ils peuvent encore avoir une valeur résiduelle.
                Le rachat vous permet de{" "}
                <strong className="text-white">
                  récupérer une partie de votre investissement initial
                </strong>{" "}
                plutôt que de laisser ces actifs s&apos;accumuler et perdre
                toute valeur.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBanner
        title="Besoin de nos services ?"
        text="Contactez-nous dès aujourd'hui pour en savoir plus sur nos offres d'achat de lots, de réparation d'appareils électroniques et de recyclage de matériel informatique."
        buttonLabel="Contactez-nous"
        href="/contact"
      />
    </>
  );
}
