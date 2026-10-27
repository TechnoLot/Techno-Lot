import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Constellation } from "@/components/site/Constellation";

export type PageHeroImage =
  | { kind: "object"; src: string; alt?: string; width?: number }
  | { kind: "photo"; src: string; alt?: string };

type PageHeroProps = {
  /** Ignoré (pas de surtitre dans la direction artistique) ; gardé pour compatibilité. */
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  /** object = objet détouré qui flotte à droite ; photo = image cadrée */
  image?: PageHeroImage;
  /** compact : titre et marges réduits (ex. Contact, Soumission) */
  size?: "default" | "compact";
  /**
   * night (défaut) = bleu nuit de l'ancien héros, lueurs vertes et constellation ;
   * deep = vert profond, mêmes lueurs ; green / light / sand : anciens aplats (compatibilité).
   */
  theme?: "night" | "deep" | "green" | "light" | "sand";
  /** Sous le texte (boutons, puces…) */
  children?: ReactNode;
};

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/**
 * En-tête des pages intérieures, « chapitre » bleu nuit façon ancien héros :
 * lueurs vertes diffuses qui dérivent, constellation légère (canvas, coupée en
 * mouvement réduit), très grand titre Chakra Petch, intro, objet optionnel qui
 * flotte à droite. Premier bloc de la page : il porte `data-under-header` et
 * gère lui-même l'espace sous l'en-tête fixe (--site-header-h).
 * Entrées en CSS pur (.hero-item) : rien n'est caché en attendant le JavaScript (LCP).
 */
export function PageHero({ title, intro, image, size = "default", theme = "night", children }: PageHeroProps) {
  const compact = size === "compact";
  const glowing = theme === "night" || theme === "deep";
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
      {glowing && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="tl-glow tl-glow-a -left-[18%] -top-[25%] h-[620px] w-[620px] bg-[radial-gradient(circle_at_center,rgba(94,203,51,0.20),transparent_62%)] sm:h-[820px] sm:w-[820px]" />
          <div className="tl-glow tl-glow-b -bottom-[45%] -right-[12%] h-[620px] w-[620px] bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.14),transparent_62%)] sm:h-[900px] sm:w-[900px]" />
          <Constellation />
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
