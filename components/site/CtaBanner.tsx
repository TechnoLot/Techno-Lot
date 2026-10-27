import { Phone } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { PrimaryButtonLink } from "@/components/site/Button";
import { Reveal } from "@/components/site/Reveal";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

type CtaBannerProps = {
  locale: Locale;
  title: ReactNode;
  text?: ReactNode;
  /** Libellé du bouton (défaut : « Faire une soumission » / « Get a quote ») */
  buttonLabel?: string;
  /** Chemin NON localisé du bouton (défaut : /soumission) */
  href?: string;
  /** Thème du chapitre autour des tuiles (sand / cream = anciens noms, rendus en blanc) */
  background?: "light" | "night" | "deep" | "mint" | "dark" | "sand" | "cream";
  className?: string;
};

/**
 * Appel à l'action de bas de page : rangée de trois tuiles pleine largeur.
 * Au centre, la grande tuile lime (titre, texte, bouton bleu nuit, téléphone) ;
 * de part et d'autre, deux tuiles étroites coupées par les bords de l'écran
 * (bleu nuit avec « 24 h » et lueur ; menthe avec la palette pleine).
 * Empilée sur mobile. Composant serveur ; tuiles révélées en cascade.
 */
export function CtaBanner({
  locale,
  title,
  text,
  buttonLabel,
  href = "/soumission",
  background = "light",
  className,
}: CtaBannerProps) {
  const t = getDict(locale);
  const theme = background === "sand" || background === "cream" ? "light" : background;

  return (
    <section data-theme={theme} className={`relative overflow-hidden py-14 sm:py-20 ${className ?? ""}`}>
      <div className="grid grid-cols-2 gap-3 px-5 sm:px-8 lg:grid-cols-[minmax(4.5rem,1fr)_minmax(0,60rem)_minmax(4.5rem,1fr)] lg:px-0">
        {/* Tuile bleu nuit — coupée par le bord gauche */}
        <Reveal className="order-2 lg:order-1 lg:-ml-10" delay={0.08}>
          <div
            data-theme="night"
            className="relative flex h-full min-h-[11rem] flex-col justify-end overflow-hidden rounded-[28px] p-6 lg:min-h-[26rem] lg:rounded-l-none lg:pl-16"
          >
            <div
              aria-hidden="true"
              className="absolute -bottom-1/3 -left-1/3 h-[140%] w-[160%] bg-[radial-gradient(circle_at_center,rgba(94,203,51,0.22),transparent_60%)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(rgba(139,233,95,0.22)_1px,transparent_1.5px)] [background-size:18px_18px] [mask-image:linear-gradient(to_top,black,transparent_85%)]"
            />
            <p className="relative lg:hidden xl:block">
              <span className="block font-display text-5xl font-bold leading-none tracking-[-0.03em] text-[#8BE95F]">
                {t.shell.cta24.value}
              </span>
              <span className="mt-2 block text-sm leading-snug text-moss">{t.shell.cta24.label}</span>
            </p>
          </div>
        </Reveal>

        {/* Tuile centrale lime */}
        <Reveal className="order-1 col-span-2 lg:order-2 lg:col-span-1">
          <div
            data-theme="lime"
            className="relative flex h-full flex-col justify-center overflow-hidden rounded-[28px] px-6 py-12 text-mist sm:px-12 sm:py-16 lg:min-h-[26rem] lg:px-16"
          >
            <h2 className="max-w-2xl text-balance font-display text-[2.125rem] font-bold leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-[3.25rem]">
              {title}
            </h2>
            {text && <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-moss sm:text-lg">{text}</p>}
            <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
              <PrimaryButtonLink href={localePath(locale, href)}>
                {buttonLabel ?? t.cta.defaultButton}
              </PrimaryButtonLink>
              <a
                href={site.phoneHref}
                className="group inline-flex items-center gap-2.5 font-display text-base font-semibold text-mist"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-night-900 text-[#8BE95F] transition-transform duration-300 group-hover:scale-110">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="underline-offset-4 group-hover:underline">
                  {t.shell.orCallUs} {site.phone}
                </span>
              </a>
            </div>
          </div>
        </Reveal>

        {/* Tuile menthe — palette pleine, coupée par le bord droit */}
        <Reveal className="order-3 lg:-mr-10" delay={0.16}>
          <div
            data-theme="mint"
            className="relative h-full min-h-[11rem] overflow-hidden rounded-[28px] lg:min-h-[26rem] lg:rounded-r-none"
          >
            <Image
              src="/images/palette/palette-pleine.webp"
              alt=""
              width={1000}
              height={1082}
              sizes="(max-width: 1024px) 50vw, 320px"
              className="absolute -bottom-[6%] left-[8%] h-auto w-[115%] max-w-none lg:left-[10%] lg:w-[150%]"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
