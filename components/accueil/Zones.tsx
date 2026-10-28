import { Check } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { Reveal } from "@/components/site/Reveal";
import { getAccueil } from "./contenu";
import { getContenuCarte } from "./contenu-carte";
import { ZonesCarte } from "./zones-scene";

/**
 * Chapitre blanc « Partout au Québec », compact : texte à gauche, petite carte du sud
 * du Québec à droite (Gatineau, Montréal, Trois-Rivières, Québec, Sherbrooke). Pas
 * d'épinglage : la carte s'anime une fois à son entrée dans l'écran (zones-scene.tsx).
 */
export function Zones({ locale }: { locale: Locale }) {
  const { zones } = getAccueil(locale);
  const carte = getContenuCarte(locale);

  return (
    <section data-theme="light" aria-labelledby="zones-titre" className="relative py-16 text-mist sm:py-20 lg:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-12">
        <Reveal className="lg:col-span-5" y={20}>
          <h2
            id="zones-titre"
            className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.02em] text-mist"
          >
            {zones.title}
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-moss sm:text-lg">{zones.text}</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-deep px-4 py-2 font-display text-sm font-semibold text-white">
            <Check className="h-4 w-4 text-lime" aria-hidden="true" />
            {carte.minimum}
          </p>
        </Reveal>
        <Reveal className="lg:col-span-7" y={24} delay={0.06}>
          <ZonesCarte locale={locale} />
        </Reveal>
      </div>
    </section>
  );
}
