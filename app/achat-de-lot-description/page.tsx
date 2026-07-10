import type { Metadata } from "next";
import {
  HardDrive,
  Laptop,
  Monitor,
  Network,
  PackageOpen,
  PhoneCall,
  PiggyBank,
  Printer,
  RefreshCcw,
  Server,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";
import CtaBanner from "@/components/CtaBanner";

export const metadata: Metadata = {
  title: "Ce que nous rachetons",
  description:
    "Ordinateurs, serveurs, équipements réseau, stockage, télécommunication, bureautique, écrans… Techno Lot rachète TOUT type de matériel électronique au Québec.",
  alternates: { canonical: "/achat-de-lot-description" },
};

const categories = [
  {
    icon: Laptop,
    title: "Ordinateurs et portables",
    text: "Les postes de travail fixes et portables représentent une part importante des équipements rachetés. Même les machines plus anciennes peuvent être valorisées, que ce soit pour le reconditionnement ou le recyclage des composants.",
  },
  {
    icon: Server,
    title: "Serveurs",
    text: "Les serveurs sont souvent au cœur des infrastructures TI. Lorsqu'ils deviennent obsolètes ou que l'entreprise passe au nuage, leur revente permet de libérer de la place.",
  },
  {
    icon: Network,
    title: "Périphériques de réseau",
    text: "Routeurs, switchs, pare-feu et autres équipements réseau sont également pris en compte dans les processus de rachat. Ces équipements, bien qu'essentiels au fonctionnement d'une entreprise, peuvent rapidement devenir dépassés face aux nouvelles technologies.",
  },
  {
    icon: HardDrive,
    title: "Stockage",
    text: "Les dispositifs de stockage, tels que les disques durs, les baies de stockage ou les SSD, peuvent également faire l'objet d'un rachat, surtout s'ils contiennent des données sensibles qui doivent être effacées de manière sécurisée avant la vente.",
  },
  {
    icon: PhoneCall,
    title: "Équipements de télécommunication",
    text: "Téléphones d'entreprise, systèmes de visioconférence et autres outils de communication.",
  },
  {
    icon: Printer,
    title: "Matériel de bureautique",
    text: "Imprimantes, scanneurs, photocopieurs et autres équipements bureautiques.",
  },
  {
    icon: Monitor,
    title: "Écrans et moniteurs",
    text: "Les moniteurs, que ce soit pour des postes de travail ou des configurations multi-écrans, particulièrement lorsqu'il s'agit d'équipements de grande qualité ou de haute résolution.",
  },
];

const arguments_ = [
  {
    icon: PiggyBank,
    title: "Optimisation des coûts",
    text: "En revendant vos anciens équipements, vous récupérez une part non négligeable de l'investissement initial. Cet apport financier peut être réinjecté dans des projets d'innovation ou dans le renouvellement de votre infrastructure TI, réduisant ainsi les coûts globaux liés à l'acquisition de nouveaux matériels.",
  },
  {
    icon: RefreshCcw,
    title: "Gestion efficace du cycle de vie TI",
    text: "Plutôt que de conserver des équipements vieillissants qui ralentissent la productivité, vous pouvez les remplacer par des technologies plus modernes, plus rapides et plus adaptées à vos besoins actuels.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurisation des données",
    text: "Le rachat de matériel informatique par des prestataires spécialisés comprend souvent la gestion sécurisée de vos données sensibles. Ces entreprises offrent des services TI de suppression certifiée des données afin de garantir que vos informations ne tombent pas entre de mauvaises mains.",
  },
  {
    icon: TrendingUp,
    title: "Adaptation à l'évolution technologique",
    text: "Avec les avancées rapides en matière de technologie, garder du matériel obsolète peut freiner la croissance de votre entreprise. Le rachat de matériel informatique permet de vous adapter plus rapidement aux nouvelles tendances et aux innovations, garantissant ainsi une infrastructure TI à jour et performante.",
  },
];

export default function AchatDeLotPage() {
  return (
    <>
      <PageHero
        eyebrow="Nos catégories"
        title="Ce que nous rachetons"
        subtitle="Du poste de travail au centre de données : Techno Lot valorise tout votre matériel informatique et électronique."
        image="/photos/datacenter.jpg"
      />

      <section className="container-site pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 4) * 0.08} className="h-full">
              <TiltCard className="h-full">
                <div className="glass glass-hover flex h-full flex-col p-6">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                    <Icon className="h-5 w-5 text-accent" aria-hidden />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-white">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {text}
                  </p>
                </div>
              </TiltCard>
            </Reveal>
          ))}

          {/* Carte spéciale : tout le reste */}
          <Reveal delay={0.24} className="h-full">
            <TiltCard className="h-full">
              <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-accent/40 bg-accent/5 p-6 shadow-glow backdrop-blur-md">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/50">
                  <PackageOpen className="h-5 w-5 text-accent-bright" aria-hidden />
                </div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Votre lot n&apos;entre dans aucune catégorie ?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  Pas d&apos;inquiétude : nous rachetons{" "}
                  <strong className="text-accent-bright">TOUT</strong> type de
                  matériel électronique, alors nous serons en mesure de vous
                  faire une offre pour votre lot.
                </p>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      <section className="container-site pb-8">
        <Reveal>
          <span className="eyebrow">Les avantages</span>
          <h2 className="section-title">
            Pourquoi revendre son matériel informatique ?
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {arguments_.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 2) * 0.1} className="h-full">
              <div className="glass glass-hover flex h-full gap-5 p-7">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30">
                  <Icon className="h-5 w-5 text-accent" aria-hidden />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <CtaBanner
        title="Un lot à vendre ?"
        text="Obtenez une estimation gratuite avec une réponse dans un délai de 24 heures."
      />
    </>
  );
}
