import type { ReactNode } from "react";
import { Reveal } from "@/components/site/Reveal";

export type ChapterTheme = "night" | "deep" | "lime" | "mint" | "light" | "dark";

type ChapterProps = {
  theme: ChapterTheme;
  children: ReactNode;
  id?: string;
  className?: string;
  containerClassName?: string;
  "aria-labelledby"?: string;
  /** Lueurs vertes de l'identité (chapitres sombres) */
  glow?: "left" | "right" | "both";
};

/**
 * Chapitre pleine largeur : aplat d'une couleur de la marque (data-theme dans app/site.css),
 * collé au suivant, même conteneur (max-w-6xl) que le héros. overflow-clip garde les
 * séquences épinglées (sticky) fonctionnelles.
 */
export function Chapter({ theme, children, id, className, containerClassName, glow, ...aria }: ChapterProps) {
  return (
    <section id={id} data-theme={theme} {...aria} className={`relative isolate overflow-clip py-20 sm:py-28 ${className ?? ""}`}>
      {glow && <Glows side={glow} />}
      <div className={`relative mx-auto w-full max-w-6xl px-5 sm:px-8 ${containerClassName ?? ""}`}>{children}</div>
    </section>
  );
}

/** Lueurs vertes douces (décor), comme l'ancien héros bleu nuit. */
export function Glows({ side }: { side: "left" | "right" | "both" }) {
  return (
    <>
      {(side === "right" || side === "both") && (
        <div aria-hidden="true" className="svc-glow pointer-events-none absolute -right-[18%] -top-[22%] -z-10 h-[620px] w-[620px]" />
      )}
      {(side === "left" || side === "both") && (
        <div aria-hidden="true" className="svc-glow svc-glow--soft pointer-events-none absolute -bottom-[26%] -left-[16%] -z-10 h-[560px] w-[560px]" />
      )}
    </>
  );
}

/** Titre de chapitre aligné à gauche (Chakra Petch), révélé au défilement. */
export function ChapterTitle({
  id,
  children,
  intro,
  className,
  size = "lg",
}: {
  id?: string;
  children: ReactNode;
  intro?: ReactNode;
  className?: string;
  size?: "lg" | "md";
}) {
  return (
    <Reveal className={`max-w-2xl ${className ?? ""}`}>
      <h2
        id={id}
        className={`font-display font-bold leading-[1.04] tracking-[-0.025em] text-mist ${
          size === "lg" ? "text-[clamp(2rem,4.4vw,3.4rem)]" : "text-[clamp(1.7rem,3.2vw,2.5rem)]"
        }`}
      >
        {children}
      </h2>
      {intro && <p className="mt-5 max-w-xl text-base leading-relaxed text-moss sm:text-lg">{intro}</p>}
    </Reveal>
  );
}

/** Mise en valeur d'un mot dans un texte de chapitre (suit le thème). */
export function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-mist">{children}</strong>;
}
