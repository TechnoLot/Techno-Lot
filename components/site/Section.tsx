import type { ReactNode } from "react";
import { Reveal } from "@/components/site/Reveal";

/**
 * Thèmes de « chapitre » (définis dans app/site.css via data-theme) :
 * night (bleu nuit) · deep (vert profond) · lime (vert du logo, texte encre) ·
 * mint (menthe) · light (blanc, défaut) · dark (noir) · green (ancien aplat vert).
 * cream et sand restent acceptés pour compatibilité (fond doux, palette claire).
 */
export type SectionTheme = "light" | "night" | "deep" | "lime" | "mint" | "dark" | "green" | "cream" | "sand";

type SectionProps = {
  children: ReactNode;
  className?: string;
  /** Classes du conteneur centré (max-w-6xl px-5 sm:px-8 par défaut) */
  containerClassName?: string;
  id?: string;
  theme?: SectionTheme;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

const legacyBg: Partial<Record<SectionTheme, string>> = {
  cream: "bg-cream",
  sand: "bg-sand",
};

/**
 * Chapitre pleine largeur : aplat d'une couleur de la marque (data-theme),
 * collé au suivant sans séparateur, conteneur centré commun à tout le site
 * (max-w-6xl, gouttières 20 / 32 px) et rythme vertical py-20 / sm:py-28.
 */
export function Section({
  children,
  className,
  containerClassName,
  id,
  theme = "light",
  ...aria
}: SectionProps) {
  const legacy = legacyBg[theme];
  return (
    <section
      id={id}
      {...(legacy ? {} : { "data-theme": theme })}
      {...aria}
      className={`relative py-20 text-mist sm:py-28 ${legacy ?? ""} ${className ?? ""}`}
    >
      <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${containerClassName ?? ""}`}>{children}</div>
    </section>
  );
}

type SectionHeadingProps = {
  /** Ignoré (la direction artistique n'affiche plus de surtitre) ; gardé pour compatibilité. */
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** left (défaut : titres alignés à gauche) ou center */
  align?: "left" | "center";
  /** Niveau du titre (h2 par défaut) */
  as?: "h2" | "h3";
  id?: string;
  className?: string;
};

/**
 * En-tête de section : grand titre Chakra Petch 700 serré + sous-titre Inter
 * 17–19 px ; couleurs du thème (text-mist / text-moss) ; révélé au défilement.
 */
export function SectionHeading({
  title,
  subtitle,
  align = "left",
  as: Tag = "h2",
  id,
  className,
}: SectionHeadingProps) {
  const alignCls = align === "center" ? "mx-auto text-center" : "text-left";
  return (
    <Reveal className={`max-w-3xl ${alignCls} ${className ?? ""}`}>
      <Tag
        id={id}
        className="text-balance font-display text-[2.125rem] font-bold leading-[1.02] tracking-[-0.025em] text-mist sm:text-5xl lg:text-[3.5rem]"
      >
        {title}
      </Tag>
      {subtitle && (
        <p
          className={`mt-5 max-w-2xl text-[17px] leading-relaxed text-moss sm:text-lg lg:text-[19px] ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
