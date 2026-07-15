import type { ReactNode } from "react";
import Image from "next/image";
import HeroBackground from "@/components/HeroBackground";
import Reveal from "@/components/Reveal";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Photo d'ambiance derrière le titre — un voile sombre est appliqué par-dessus. */
  image?: string;
};

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
          <Reveal>
            <span className="eyebrow">{eyebrow}</span>
          </Reveal>
        )}
        <Reveal delay={0.08}>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            {title}
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.18}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
              {subtitle}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
