import { Phone } from "lucide-react";
import type { ReactNode } from "react";
import { PrimaryButtonLink } from "@/components/site/Button";
import { LiensDefilants } from "@/components/site/LiensDefilants";
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
  /** Chemin NON localisé de la page courante : retiré du ruban de liens utiles */
  current?: string;
  /** Thème du chapitre autour de la carte (sand / cream = anciens noms, rendus en blanc) */
  background?: "light" | "night" | "deep" | "mint" | "dark" | "sand" | "cream";
  className?: string;
};

/**
 * Appel à l'action de bas de page, simple : une carte lime (titre, texte, bouton,
 * téléphone discret), puis un ruban de liens utiles qui défile (services, FAQ,
 * contact, téléphone). Composant serveur ; seul le ruban est animé.
 */
export function CtaBanner({
  locale,
  title,
  text,
  buttonLabel,
  href = "/soumission",
  current,
  background = "light",
  className,
}: CtaBannerProps) {
  const t = getDict(locale);
  const theme = background === "sand" || background === "cream" ? "light" : background;
  const exclude = current ? [href, current] : [href];

  return (
    <section data-theme={theme} className={`relative overflow-hidden py-14 sm:py-20 ${className ?? ""}`}>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div
            data-theme="lime"
            className="grid gap-8 rounded-[28px] px-6 py-10 text-mist sm:px-10 sm:py-12 lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-14"
          >
            <div className="lg:col-span-7">
              <h2 className="text-balance font-display text-[2rem] font-bold leading-[1.04] tracking-[-0.02em] sm:text-[2.5rem] lg:text-[2.75rem]">
                {title}
              </h2>
              {text && <p className="mt-4 max-w-xl text-base leading-relaxed text-moss sm:text-lg">{text}</p>}
            </div>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7 lg:col-span-5 lg:flex-col lg:items-end lg:gap-4">
              <PrimaryButtonLink href={localePath(locale, href)}>{buttonLabel ?? t.cta.defaultButton}</PrimaryButtonLink>
              <a href={site.phoneHref} className="group inline-flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="underline decoration-ink/30 decoration-2 underline-offset-4 transition-colors group-hover:decoration-ink">
                  {t.shell.orCallUs} {site.phone}
                </span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>

      <LiensDefilants locale={locale} exclude={exclude} className="mt-8 sm:mt-10" />
    </section>
  );
}
