import { Check, MapPin } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { getAccueil } from "./contenu";
import { getContenuCarte } from "./contenu-carte";
import { ZonesCarte } from "./zones-scene";

/**
 * Chapitre menthe « Partout au Québec » : texte à gauche, vraie carte du Québec à droite.
 * Au bureau, la section s'épingle et les trajets partent de Mascouche vers les villes au
 * défilement, puis le Québec se remplit de vert (voir zones-scene.tsx).
 */
export function Zones({ locale }: { locale: Locale }) {
  const { zones } = getAccueil(locale);
  const carte = getContenuCarte(locale);

  return (
    <section data-theme="mint" aria-labelledby="zones-titre" className="relative text-mist">
      <div data-zones-track className="zones-track relative">
        <div className="zones-pin">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:h-full lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-8 lg:pt-[calc(var(--site-header-h)+1.5rem)] motion-reduce:lg:py-24">
            <div className="lg:col-span-5">
              <h2
                id="zones-titre"
                className="font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.03em] text-mist"
              >
                {zones.title}
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-moss sm:text-lg">{zones.text}</p>
              <p className="mt-7 inline-flex items-center gap-2 rounded-full bg-deep px-4 py-2 font-display text-sm font-semibold text-white">
                <Check className="h-4 w-4 text-lime" aria-hidden="true" />
                {carte.minimum}
              </p>
              <div>
                <a
                  href={site.address.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-start gap-2 text-sm font-semibold text-mist underline decoration-emerald/50 underline-offset-4 transition-colors hover:text-emerald sm:text-base"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
                  {zones.address}
                  <span className="sr-only"> {carte.newTab}</span>
                </a>
              </div>
            </div>
            <div className="lg:col-span-7">
              <ZonesCarte locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
