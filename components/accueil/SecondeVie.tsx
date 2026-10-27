import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { Reveal } from "@/components/site/Reveal";
import { Parallaxe } from "./chapitres-parallaxe";
import { getChapitres } from "./contenu-chapitres";
import "./chapitres.css";

/**
 * Chapitre vert profond « Chaque appareil mérite une seconde vie » : la phrase
 * en très grand collée en bas à gauche (deux lignes à toutes les largeurs), le
 * paragraphe de mission en haut à droite, et les appareils posés sur la couleur
 * qui dérivent lentement au défilement. Pas de bouton.
 */
export function SecondeVie({ locale }: { locale: Locale }) {
  const { secondeVie } = getChapitres(locale);

  return (
    <section
      data-theme="deep"
      aria-labelledby="seconde-vie-titre"
      className="relative overflow-hidden py-20 sm:py-28 lg:py-32"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-y-12 px-5 sm:px-8 lg:min-h-[84vh] lg:grid-cols-12 lg:grid-rows-[auto_1fr_auto] lg:gap-x-6 lg:gap-y-14">
        <Reveal className="order-3 self-end lg:order-none lg:col-span-12 lg:row-start-3" y={24} delay={0.12}>
          <h2 id="seconde-vie-titre" className="tl-sv-titre font-display font-bold text-mist">
            <span className="block">{secondeVie.lead}</span>
            <span className="block text-vivid">{secondeVie.accent}</span>
          </h2>
        </Reveal>

        <Reveal className="order-1 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-start-1" y={20}>
          <p className="text-lg leading-relaxed text-moss sm:text-xl sm:leading-relaxed">{secondeVie.text}</p>
        </Reveal>

        <Reveal
          className="order-2 lg:order-none lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center"
          y={28}
          delay={0.06}
        >
          <Parallaxe className="relative mx-auto w-full max-w-[640px] lg:mx-0">
            {/* Halo vert sous les appareils noirs : sans lui, ils se fondent dans le vert profond. */}
            <div
              aria-hidden="true"
              className="absolute inset-[-12%] bg-[radial-gradient(closest-side,rgba(107,214,59,0.28),transparent)]"
            />
            <Image
              src="/images/flux/seconde-vie.webp"
              alt={secondeVie.imageAlt}
              width={1200}
              height={843}
              sizes="(min-width: 1024px) 600px, 90vw"
              className="relative z-[1] h-auto w-full"
            />
            <div aria-hidden="true" className="tl-ch-ombre absolute inset-x-[6%] -bottom-4 h-10" />
          </Parallaxe>
        </Reveal>
      </div>
    </section>
  );
}
