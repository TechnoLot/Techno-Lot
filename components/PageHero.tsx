import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import HeroBackground from "@/components/HeroBackground";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Photo d'ambiance derrière le titre — un voile sombre est appliqué par-dessus. */
  image?: string;
};

/* Entrées en CSS pur (voir globals.css) plutôt qu'en framer-motion : le
   titre — souvent l'élément LCP de la page — est peint dès le premier
   rendu HTML, sans attendre l'hydratation JavaScript. */
const enterDelay = (delay: number): CSSProperties =>
  ({ "--enter-delay": `${delay}s` }) as CSSProperties;

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <HeroBackground />
      {image && (
        <div className="absolute inset-0" aria-hidden>
          <Image
            src={image}
            alt=""
            fill
            priority
            quality={45}
            sizes="100vw"
            className="object-cover opacity-30 saturate-[0.85]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-night-900/70 via-night-900/80 to-night-900" />
        </div>
      )}
      <div className="container-site relative py-20 text-center sm:py-28">
        {eyebrow && (
          <div className="hero-enter">
            <span className="eyebrow">{eyebrow}</span>
          </div>
        )}
        <div className="hero-enter" style={enterDelay(0.08)}>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            {title}
          </h1>
        </div>
        {subtitle && (
          <div className="hero-enter" style={enterDelay(0.18)}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
              {subtitle}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
