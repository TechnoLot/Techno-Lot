import type { Locale } from "@/lib/i18n";
import { Counter } from "@/components/site/Counter";
import { Reveal } from "@/components/site/Reveal";
import { getChapitres, type Engagement } from "./contenu-chapitres";
import "./chapitres.css";

/** Chiffre de l'engagement : compteur (sauf texte fixe), unité plus petite, lecture complète pour les lecteurs d'écran. */
function Chiffre({ item, locale }: { item: Engagement; locale: Locale }) {
  const unit = (
    <span className={`text-[0.5em] ${item.unitBefore ? "mr-[0.06em]" : "ml-[0.12em]"}`}>{item.unit}</span>
  );
  return (
    <p className="font-display text-[clamp(2.75rem,5vw,3.75rem)] font-bold leading-none tracking-[-0.02em] text-emerald tabular-nums">
      <span className="sr-only">{item.spoken}</span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        {item.unitBefore ? unit : null}
        {item.value !== undefined ? <Counter value={item.value} locale={locale} plain /> : item.text}
        {item.unitBefore ? null : unit}
      </span>
    </p>
  );
}

/**
 * Chapitre blanc « Nos engagements », juste sous le héros : un fondu bleu nuit
 * adoucit le passage du héros sombre au blanc, puis un seul panneau sobre
 * présente les trois engagements côte à côte (empilés sur mobile).
 */
export function Stats({ locale }: { locale: Locale }) {
  const { stats } = getChapitres(locale);

  return (
    <section data-theme="light" aria-labelledby="engagements-titre" className="relative overflow-hidden pb-16 pt-36 sm:pb-20 sm:pt-44 lg:pb-24 lg:pt-52">
      <div aria-hidden="true" className="tl-ch-fondu pointer-events-none absolute inset-x-0 top-0 h-32 sm:h-40 lg:h-48" />

      <div className="relative mx-auto w-full max-w-5xl px-5 sm:px-8">
        <Reveal y={16}>
          <h2
            id="engagements-titre"
            className="text-center font-display text-[clamp(1.9rem,3.4vw,2.6rem)] font-bold leading-tight tracking-[-0.01em] text-mist"
          >
            {stats.title}
          </h2>
        </Reveal>

        <Reveal y={20} delay={0.06} className="mt-9 sm:mt-11">
          <ul className="grid divide-y divide-line-strong rounded-[20px] bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stats.items.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-5 px-5 py-5 text-left sm:flex-col sm:gap-0 sm:px-6 sm:py-10 sm:text-center"
              >
                <div className="w-[5.5rem] shrink-0 sm:w-auto">
                  <Chiffre item={item} locale={locale} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold leading-tight text-mist sm:mt-4 sm:text-xl">{item.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-moss sm:mx-auto sm:mt-1.5 sm:max-w-[26ch]">{item.caption}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
