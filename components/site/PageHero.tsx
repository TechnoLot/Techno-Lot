import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { CielEtoiles } from "@/components/site/CielEtoiles";

export type PageHeroImage =
  | { kind: "object"; src: string; alt?: string; width?: number }
  | { kind: "photo"; src: string; alt?: string }
  | { kind: "logo"; alt?: string };

type PageHeroProps = {
  /** Ignoré (pas de surtitre dans la direction artistique) ; gardé pour compatibilité. */
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  /** object = objet détouré qui flotte à droite ; photo = image cadrée ; logo = logo empilé qui bouge */
  image?: PageHeroImage;
  /** compact : titre et marges réduits (ex. Contact, Soumission) */
  size?: "default" | "compact";
  /**
   * night (défaut) = ciel de nuit de l'accueil en étoiles vertes ;
   * deep = vert profond, mêmes étoiles ; green / light / sand : anciens aplats (compatibilité).
   */
  theme?: "night" | "deep" | "green" | "light" | "sand";
  /** Sous le texte (boutons, puces…) */
  children?: ReactNode;
  /** Optionnel : fil d'Ariane (components/seo/Breadcrumbs) rendu juste au-dessus du titre */
  breadcrumbs?: ReactNode;
};

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/**
 * En-tête des pages intérieures : le ciel de nuit de l'accueil au-dessus de Montréal
 * en étoiles vertes (CielEtoiles, canvas ; image fixe en mouvement réduit), lueur
 * verte d'horizon, très grand titre Chakra Petch, intro, objet optionnel qui
 * flotte à droite. Premier bloc de la page : il porte `data-under-header` et
 * gère lui-même l'espace sous l'en-tête fixe (--site-header-h).
 * Entrées en CSS pur (.hero-item) : rien n'est caché en attendant le JavaScript (LCP).
 */
export function PageHero({ title, intro, image, size = "default", theme = "night", children, breadcrumbs }: PageHeroProps) {
  const compact = size === "compact";
  const starry = theme === "night" || theme === "deep";
  const legacyBg = theme === "sand" ? "bg-sand" : "";

  return (
    <header
      data-under-header=""
      {...(theme === "sand" ? {} : { "data-theme": theme })}
      className={`relative isolate overflow-hidden text-mist ${legacyBg} ${
        compact
          ? "pb-14 pt-[calc(var(--site-header-h)+2.75rem)] sm:pb-20 sm:pt-[calc(var(--site-header-h)+4rem)]"
          : "pb-20 pt-[calc(var(--site-header-h)+3.5rem)] sm:pb-28 sm:pt-[calc(var(--site-header-h)+5.5rem)] lg:min-h-[min(78svh,760px)]"
      }`}
    >
      {starry && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {/* Décor, de l'arrière vers l'avant : ciel en dégradé (night ; deep garde son vert),
              poussière d'étoiles et étoiles (canvas), lueur d'horizon, vignette, voile du texte */}
          {theme === "night" && <div className="tl-ciel-fond" />}
          <CielEtoiles />
          <div className="tl-ciel-horizon" />
          <div className="tl-ciel-vignette" />
          <div className="tl-ciel-voile" />
          {/* Fondu bas : le chapitre suivant enchaîne sans filet */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-black/20" />
        </div>
      )}

      <div
        className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${
          image ? "grid items-center gap-12 lg:grid-cols-12 lg:gap-10" : ""
        }`}
      >
        <div className={image ? "lg:col-span-7" : "max-w-4xl"}>
          {breadcrumbs && (
            <div className="hero-item mb-6 sm:mb-8" style={d(0)}>
              {breadcrumbs}
            </div>
          )}
          <h1
            className={`hero-item text-balance font-display font-bold leading-[0.98] tracking-[-0.03em] text-mist ${
              compact
                ? "text-[2.375rem] sm:text-5xl lg:text-[3.75rem]"
                : "text-[2.75rem] sm:text-6xl lg:text-[5rem] xl:text-[5.5rem]"
            }`}
            style={d(0)}
          >
            {title}
          </h1>
          {intro && (
            <p
              className="hero-item mt-6 max-w-2xl text-[17px] leading-relaxed text-moss sm:mt-7 sm:text-lg lg:text-xl"
              style={d(0.08)}
            >
              {intro}
            </p>
          )}
          {children && (
            <div className="hero-item mt-9" style={d(0.16)}>
              {children}
            </div>
          )}
        </div>

        {image?.kind === "object" && (
          <div
            className={`relative mx-auto w-full lg:col-span-5 ${
              compact ? "max-w-[220px] sm:max-w-[280px] lg:max-w-[320px]" : "max-w-[280px] sm:max-w-[360px] lg:max-w-none"
            }`}
          >
            <div className="relative aspect-square">
              <div
                aria-hidden="true"
                className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_center,rgba(94,203,51,0.28),transparent_68%)]"
              />
              <div
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="tl-float" style={{ width: `${image.width ?? 78}%` }}>
                  <Image
                    src={image.src}
                    alt={image.alt ?? ""}
                    width={560}
                    height={560}
                    priority
                    sizes="(max-width: 1024px) 70vw, 420px"
                    className="h-auto w-full drop-shadow-[0_28px_30px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {image?.kind === "logo" && (
          <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[360px] lg:col-span-5 lg:max-w-none">
            <div className="relative aspect-square">
              <div
                aria-hidden="true"
                className="tl-logo-halo absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_center,rgba(94,203,51,0.3),transparent_66%)]"
              />
              <div className="absolute inset-0 flex items-center justify-center [perspective:900px]">
                <div className="tl-logo-move w-[84%]">
                  <Image
                    src="/logo.png"
                    alt={image.alt ?? ""}
                    width={1919}
                    height={1158}
                    priority
                    sizes="(max-width: 640px) 240px, (max-width: 1024px) 300px, 400px"
                    className="h-auto w-full drop-shadow-[0_24px_28px_rgba(0,0,0,0.45)]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {image?.kind === "photo" && (
          <div className="relative lg:col-span-5">
            <div
              className="relative aspect-[4/3] overflow-hidden rounded-[28px] ring-1 ring-white/10"
            >
              <Image
                src={image.src}
                alt={image.alt ?? ""}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
