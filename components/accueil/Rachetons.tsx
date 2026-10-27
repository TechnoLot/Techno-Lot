import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n";
import { Reveal } from "@/components/site/Reveal";
import { ListeRachat } from "./chapitres-liste";
import { getChapitres } from "./contenu-chapitres";
import "./chapitres.css";

/** Flèche qui sort par la droite pendant qu'une autre entre par la gauche (survol, focus). */
function Fleche({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`tl-ch-fleche grid shrink-0 place-items-center rounded-full ${className}`}>
      <ArrowRight className="h-4 w-4" />
      <ArrowRight className="h-4 w-4" />
    </span>
  );
}

/**
 * Chapitre menthe « Ce que nous rachetons » : grande liste typographique
 * interactive (bandes à pas de ton, image de l'objet qui suit le curseur),
 * la ligne « Et aussi » et une rangée compacte de quatre liens de services.
 */
export function Rachetons({ locale }: { locale: Locale }) {
  const { rachetons } = getChapitres(locale);
  const description = localePath(locale, "/achat-de-lot-description");

  return (
    <section data-theme="mint" aria-labelledby="rachetons-titre" className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-12 lg:items-end lg:gap-x-6">
        <Reveal className="lg:col-span-7" y={20}>
          <h2
            id="rachetons-titre"
            className="font-display text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1] tracking-[-0.01em] text-mist"
          >
            {rachetons.titleStart} <span className="text-emerald">{rachetons.titleAccent}</span>
          </h2>
        </Reveal>
        <Reveal className="lg:col-span-4 lg:col-start-9" y={20} delay={0.06}>
          <p className="text-base leading-relaxed text-moss sm:text-lg">{rachetons.intro}</p>
        </Reveal>
      </div>

      <div className="mt-12 sm:mt-16">
        <ListeRachat items={rachetons.items} href={description} />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal className="mt-10 sm:mt-12" y={16}>
          <p className="flex flex-col gap-3 text-base leading-relaxed text-moss sm:text-lg lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <span>{rachetons.more}</span>
            <Link
              href={description}
              className="group inline-flex items-center gap-3 self-start font-display font-semibold text-mist lg:self-auto"
            >
              <span className="underline decoration-emerald/40 decoration-2 underline-offset-[6px] transition-colors group-hover:decoration-emerald">
                {rachetons.moreLink}
              </span>
              <Fleche className="h-9 w-9 bg-ink text-white transition-colors duration-300 group-hover:bg-emerald" />
            </Link>
          </p>
        </Reveal>

        <Reveal className="mt-14 sm:mt-16" y={16} delay={0.06}>
          <nav aria-labelledby="rachetons-services" className="flex flex-col gap-4">
            <p id="rachetons-services" className="text-sm font-semibold text-emerald">
              {rachetons.servicesLabel}
            </p>
            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-6">
              {rachetons.services.map((service) => (
                <li key={service.key}>
                  <Link
                    href={localePath(locale, service.href)}
                    className="group inline-flex items-center gap-3 rounded-full py-1 font-display text-base font-semibold text-mist transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none"
                  >
                    <Fleche className="h-8 w-8 bg-surface text-mist transition-colors duration-300 group-hover:bg-ink group-hover:text-white" />
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Reveal>
      </div>
    </section>
  );
}
