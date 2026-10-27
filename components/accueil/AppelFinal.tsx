import Image from "next/image";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { PrimaryButtonLink } from "@/components/site/Button";
import { Magnetic } from "@/components/site/Magnetic";
import { Reveal } from "@/components/site/Reveal";
import { getChapitres } from "./contenu-chapitres";
import "./chapitres.css";

/**
 * Appel final, chapitre blanc : une rangée de trois tuiles de même rayon. Au
 * centre la tuile lime (titre, ramassage gratuit, bouton, téléphone) ; à gauche
 * une tuile bleu nuit et à droite une tuile menthe avec la palette chargée qui
 * flotte, toutes deux étroites et coupées par les bords de l'écran.
 * Mobile : la tuile lime pleine largeur, puis les deux autres en paire.
 */
export function AppelFinal({ locale }: { locale: Locale }) {
  const { appelFinal } = getChapitres(locale);
  const { shell } = getDict(locale);

  return (
    <section data-theme="light" aria-labelledby="appel-final-titre" className="tl-af relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-5 sm:gap-5 sm:px-8 lg:grid-cols-12 lg:gap-6">
        <Reveal className="col-span-2 lg:col-span-8 lg:col-start-3 lg:row-start-1" y={28}>
          <div
            data-theme="lime"
            className="flex min-h-[340px] flex-col justify-between gap-10 rounded-[20px] bg-vivid p-7 text-ink sm:min-h-[360px] sm:p-10 lg:p-12"
          >
            <div>
              <h2
                id="appel-final-titre"
                className="font-display text-[clamp(2.1rem,4.4vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.01em]"
              >
                {appelFinal.title}
              </h2>
              <p className="mt-3 text-lg font-medium text-ink/75 sm:text-xl">{appelFinal.subtitle}</p>
            </div>
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
              <Magnetic strength={0.25}>
                <PrimaryButtonLink href={localePath(locale, "/soumission")} className="sm:whitespace-nowrap">
                  {appelFinal.button}
                </PrimaryButtonLink>
              </Magnetic>
              <a
                href={site.phoneHref}
                className="font-display text-base font-semibold text-ink underline decoration-ink/30 decoration-2 underline-offset-[6px] transition-colors hover:decoration-ink sm:whitespace-nowrap"
              >
                {appelFinal.orCall} {site.phone}
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal
          className="tl-af-cote tl-af-cote--gauche col-span-1 h-44 sm:h-56 lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:h-auto"
          y={28}
          delay={0.08}
        >
          <div className="tl-af-tuile tl-ch-glow overflow-hidden bg-night-900">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(rgba(139,233,95,0.22)_1px,transparent_1.5px)] [background-size:18px_18px] [mask-image:linear-gradient(to_top,black,transparent_85%)]"
            />
            {/* Texte calé à droite : sur grand écran, la tuile déborde du bord gauche de l'écran. */}
            <p className="absolute bottom-5 right-5 text-right sm:bottom-7 sm:right-7">
              <span className="block font-display text-4xl font-bold leading-none tracking-[-0.03em] text-[#8BE95F] sm:text-5xl">
                {shell.cta24.value}
              </span>
              <span className="mt-2 block text-sm leading-snug text-white/75">{shell.cta24.label}</span>
            </p>
          </div>
        </Reveal>

        <Reveal
          className="tl-af-cote tl-af-cote--droite col-span-1 h-44 sm:h-56 lg:col-span-2 lg:col-start-11 lg:row-start-1 lg:h-auto"
          y={28}
          delay={0.16}
        >
          <div aria-hidden="true" className="tl-af-tuile bg-mint" />
          <div aria-hidden="true" className="tl-af-visible">
            <div className="relative h-[72%] max-h-[260px]" style={{ aspectRatio: "1000 / 1082" }}>
              <div className="tl-ch-flotte relative h-full w-full">
                <Image
                  src="/images/palette/palette-pleine.webp"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 240px, 140px"
                  className="relative z-[1] object-contain"
                />
              </div>
              <div className="tl-ch-ombre tl-ch-flotte-ombre absolute inset-x-[4%] -bottom-3 h-6" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
