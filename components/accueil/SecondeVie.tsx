import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { Reveal } from "@/components/site/Reveal";
import { getChapitres } from "./contenu-chapitres";

/**
 * Chapitre vert profond « Chaque appareil mérite une seconde vie » : le texte d'abord
 * (titre à gauche, bénéfice pour le client à droite), puis une photo en bandeau de
 * hauteur limitée (portable sur la mousse, jeune pousse) qui ne prend pas toute la page.
 */
export function SecondeVie({ locale }: { locale: Locale }) {
  const { secondeVie } = getChapitres(locale);

  return (
    <section data-theme="deep" aria-labelledby="seconde-vie-titre" className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-x-10 gap-y-5 px-5 sm:px-8 lg:grid-cols-12 lg:items-end">
        <Reveal className="lg:col-span-7" y={20}>
          <h2
            id="seconde-vie-titre"
            className="font-display text-[clamp(2.1rem,4.4vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.02em] text-mist"
          >
            <span className="block">{secondeVie.lead}</span>
            <span className="block text-vivid">{secondeVie.accent}</span>
          </h2>
        </Reveal>
        <Reveal className="lg:col-span-5 lg:pb-1.5" y={20} delay={0.06}>
          <p className="max-w-xl text-base leading-relaxed text-moss sm:text-lg">{secondeVie.text}</p>
        </Reveal>

        <Reveal className="mt-5 sm:mt-7 lg:col-span-12" y={24} delay={0.1}>
          <div className="relative h-[clamp(210px,34vw,360px)] overflow-hidden rounded-[24px] bg-[#0b2a18] ring-1 ring-white/10">
            <Image
              src="/images/flux/seconde-vie-mousse.webp"
              alt={secondeVie.imageAlt}
              fill
              sizes="(min-width: 1152px) 1088px, calc(100vw - 2.5rem)"
              className="object-cover object-[50%_58%]"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
