import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n";
import { Reveal } from "@/components/site/Reveal";
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
 * Chapitre menthe « Ce que nous rachetons », simple : six cartes blanches (vignette,
 * nom, courte description) qui mènent à la page détaillée, puis la ligne « Et aussi ».
 */
export function Rachetons({ locale }: { locale: Locale }) {
  const { rachetons } = getChapitres(locale);
  const description = localePath(locale, "/achat-de-lot-description");

  return (
    <section data-theme="mint" aria-labelledby="rachetons-titre" className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-x-10">
          <Reveal className="lg:col-span-7" y={20}>
            <h2
              id="rachetons-titre"
              className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.02em] text-mist"
            >
              {rachetons.titleStart} <span className="text-emerald">{rachetons.titleAccent}</span>
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-5" y={20} delay={0.06}>
            <p className="text-base leading-relaxed text-moss sm:text-lg">{rachetons.intro}</p>
          </Reveal>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-3">
          {rachetons.items.map((item, i) => (
            <li key={item.key}>
              <Reveal className="h-full" y={16} delay={Math.min(i, 5) * 0.05}>
                <Link
                  href={description}
                  className="tl-ch-carte flex h-full items-center gap-3 rounded-[20px] bg-white p-3.5 sm:gap-4 sm:p-5"
                >
                  <span aria-hidden="true" className="relative h-12 w-12 shrink-0 sm:h-16 sm:w-16">
                    <Image src={item.image} alt="" fill sizes="64px" className="object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[15px] font-semibold leading-snug text-mist sm:text-lg">
                      {item.name}
                    </span>
                    <span className="mt-0.5 hidden text-sm leading-snug text-moss sm:block">{item.desc}</span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-8 sm:mt-10" y={16}>
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
      </div>
    </section>
  );
}
