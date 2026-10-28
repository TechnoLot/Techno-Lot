import type { Locale } from "@/lib/i18n";
import { Reveal } from "@/components/site/Reveal";
import { getChapitres } from "./contenu-chapitres";
import { EngagementsCartes } from "./engagements-cartes";
import "./chapitres.css";

/**
 * Chapitre blanc « Nos engagements », juste sous le héros : un fondu bleu nuit
 * adoucit le passage du héros sombre au blanc, puis trois cartes de couleur
 * (24 h, 0 $, 50 %) attirent l'œil ; chacune illustre sa promesse par une petite
 * animation et mène à la page qui la détaille (engagements-cartes.tsx).
 */
export function Stats({ locale }: { locale: Locale }) {
  const { stats } = getChapitres(locale);

  return (
    <section data-theme="light" aria-labelledby="engagements-titre" className="relative overflow-hidden pb-16 pt-36 sm:pb-20 sm:pt-44 lg:pb-24 lg:pt-52">
      <div aria-hidden="true" className="tl-ch-fondu pointer-events-none absolute inset-x-0 top-0 h-32 sm:h-40 lg:h-48" />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal y={16} className="mx-auto max-w-2xl text-center">
          <h2
            id="engagements-titre"
            className="font-display text-[clamp(2.25rem,4.4vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.02em] text-mist"
          >
            {stats.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-moss sm:text-lg">{stats.subtitle}</p>
        </Reveal>

        <div className="mt-10 sm:mt-12">
          <EngagementsCartes items={stats.items} barre={stats.barre} locale={locale} />
        </div>
      </div>
    </section>
  );
}
