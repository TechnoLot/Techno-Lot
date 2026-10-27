import type { Locale } from "@/lib/i18n";
import { Counter } from "@/components/site/Counter";
import { Reveal } from "@/components/site/Reveal";
import { getChapitres, type Engagement } from "./contenu-chapitres";
import "./chapitres.css";

/** Habillage de chaque tuile (une seule valeur de rayon : 20 px). */
const TUILES: Record<Engagement["key"], { tile: string; number: string; caption: string }> = {
  reponse: {
    tile: "bg-vivid text-ink",
    number: "text-ink",
    caption: "text-ink/75",
  },
  ramassage: {
    tile: "tl-ch-glow bg-night-900 text-white",
    number: "text-vivid",
    caption: "text-white/70",
  },
  paiement: {
    tile: "bg-leaf text-white",
    number: "text-white",
    caption: "text-white/80",
  },
};

/** Grand chiffre : compteur (sauf texte fixe), unité plus petite, lecture complète pour les lecteurs d'écran. */
function Chiffre({ item, locale, className }: { item: Engagement; locale: Locale; className: string }) {
  const unit = (
    <span className={`text-[0.46em] ${item.unitBefore ? "mr-[0.06em]" : "ml-[0.12em]"}`}>{item.unit}</span>
  );
  return (
    <p className={`font-display font-bold leading-[0.82] tracking-[-0.02em] tabular-nums ${className}`}>
      <span className="sr-only">{item.spoken}</span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        {item.unitBefore ? unit : null}
        {item.value !== undefined ? <Counter value={item.value} locale={locale} plain /> : item.text}
        {item.unitBefore ? null : unit}
      </span>
    </p>
  );
}

function Legende({ item, captionClass }: { item: Engagement; captionClass: string }) {
  return (
    <div className="max-w-[26ch]">
      <h3 className="font-display text-lg font-semibold leading-tight sm:text-xl">{item.title}</h3>
      <p className={`mt-1.5 text-sm leading-relaxed sm:text-[15px] ${captionClass}`}>{item.caption}</p>
    </div>
  );
}

/**
 * Chapitre blanc « Nos engagements » : trois tuiles en escalier qui refusent de
 * s'aligner (grande tuile lime, tuile bleu nuit décalée, tuile verte encore plus
 * basse). Le titre occupe l'encoche au-dessus des petites tuiles. Les chiffres
 * roulent à l'entrée ; les tuiles montent en décalé.
 */
export function Stats({ locale }: { locale: Locale }) {
  const { stats } = getChapitres(locale);
  const [grand, nuit, vert] = stats.items;

  return (
    <section data-theme="light" aria-labelledby="engagements-titre" className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div className="tl-ch-stats mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-5 sm:gap-5 sm:px-8 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0">
        <Reveal className="col-span-2 mb-5 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:mb-0 lg:pb-6" y={20}>
          <h2
            id="engagements-titre"
            className="font-display text-[clamp(2.25rem,4.6vw,4rem)] font-bold leading-[1] tracking-[-0.01em] text-mist"
          >
            {stats.title}
          </h2>
        </Reveal>

        <Reveal className="col-span-2 lg:col-span-6 lg:col-start-1 lg:row-span-2 lg:row-start-1" y={32}>
          <div
            className={`flex h-[76vw] min-h-[300px] max-h-[440px] flex-col justify-between rounded-[20px] p-6 sm:p-9 lg:h-[70vh] lg:max-h-[780px] lg:min-h-[520px] lg:p-11 ${TUILES[grand.key].tile}`}
          >
            <Chiffre item={grand} locale={locale} className={`text-[clamp(6rem,30vw,12.5rem)] lg:text-[clamp(7rem,13vw,12.5rem)] ${TUILES[grand.key].number}`} />
            <Legende item={grand} captionClass={TUILES[grand.key].caption} />
          </div>
        </Reveal>

        {[nuit, vert].map((item, i) => (
          <Reveal
            key={item.key}
            delay={0.08 * (i + 1)}
            y={32}
            className={
              i === 0
                ? "col-span-1 mt-3 lg:col-span-3 lg:col-start-7 lg:row-start-2 lg:mt-0"
                : "col-span-1 mt-14 lg:col-span-3 lg:col-start-10 lg:row-start-2 lg:mt-[12vh]"
            }
          >
            <div
              className={`relative flex flex-col justify-between overflow-hidden rounded-[20px] p-5 sm:p-7 lg:p-7 ${
                i === 0 ? "h-[17rem] sm:h-[20rem] lg:h-[44vh] lg:min-h-[300px]" : "h-[15rem] sm:h-[17rem] lg:h-[34vh] lg:min-h-[250px]"
              } ${TUILES[item.key].tile}`}
            >
              <Chiffre
                item={item}
                locale={locale}
                className={`relative text-[clamp(3rem,13vw,4.5rem)] lg:text-[clamp(3.5rem,5.6vw,5.75rem)] ${TUILES[item.key].number}`}
              />
              <div className="relative">
                <Legende item={item} captionClass={TUILES[item.key].caption} />
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
