import type { ReactNode } from "react";
import HeroBackground from "@/components/HeroBackground";
import Reveal from "@/components/Reveal";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
};

export default function PageHero({ eyebrow, title, subtitle }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <HeroBackground />
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
