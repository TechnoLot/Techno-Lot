"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import HeroBackground from "@/components/HeroBackground";
import Magnetic from "@/components/Magnetic";
import { getDict, localePath, type Locale } from "@/lib/i18n";

// Décor purement esthétique : chargé après le rendu initial pour ne pas
// alourdir le JavaScript critique ni retarder l'interactivité de la page.
const ParticleField = dynamic(() => import("@/components/ParticleField"), {
  ssr: false,
});

/* Les animations d'entrée sont en CSS pur (voir globals.css) : elles
   démarrent dès le premier rendu HTML, sans attendre l'hydratation —
   indispensable pour un bon LCP. framer-motion ne sert plus qu'aux effets
   post-hydratation (parallaxe au défilement, respiration du logo). */
const enterDelay = (delay: number): CSSProperties =>
  ({ "--enter-delay": `${delay}s` }) as CSSProperties;

export default function Hero({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 600], [0, 110]);
  const contentOpacity = useTransform(scrollY, [0, 520], [1, 0.15]);

  const startWords = t.hero.titleStart.split(" ");
  const accentWords = t.hero.titleAccent.split(" ");

  return (
    <section className="relative overflow-hidden">
      <HeroBackground />
      <ParticleField />

      {/* Balayage lumineux diagonal (signature ambiante, 14 s) */}
      {!reduceMotion && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="hero-sweep" />
        </div>
      )}

      {/* Grain film très subtil */}
      <div
        aria-hidden
        className="hero-grain pointer-events-none absolute inset-0"
      />

      <motion.div
        style={
          reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }
        }
        className="container-site relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center py-24 text-center"
      >
        {/* Logo — respiration continue très subtile */}
        <div className="hero-enter-logo relative">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-accent/10 blur-3xl"
          />
          <motion.div
            animate={reduceMotion ? undefined : { scale: [1, 1.015, 1] }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src="/logo.png"
              alt="Techno Lot"
              width={420}
              height={252}
              priority
              sizes="(min-width: 1024px) 384px, (min-width: 640px) 320px, 256px"
              className="h-auto w-64 sm:w-80 lg:w-96"
            />
          </motion.div>
        </div>

        {/* Titre : « Vos lots informatiques ont de la valeur »
            — l'accent « de la valeur » reçoit un soulignement qui se dessine */}
        <h1 className="mx-auto mt-10 max-w-3xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          {startWords.map((word, i) => (
            <span
              key={i}
              className="hero-enter inline-block whitespace-pre"
              style={enterDelay(0.1 + i * 0.03)}
            >
              {word}{" "}
            </span>
          ))}
          <span className="relative inline-block whitespace-nowrap pb-1">
            {accentWords.map((word, i) => (
              <span
                key={`a-${i}`}
                className="hero-enter inline-block whitespace-pre text-accent"
                style={enterDelay(0.1 + (startWords.length + i) * 0.03)}
              >
                {word}
                {i < accentWords.length - 1 ? " " : ""}
              </span>
            ))}
            <span
              aria-hidden
              className="hero-underline-enter absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-accent-gradient shadow-glow"
            />
          </span>
        </h1>

        {/* Sous-titre : structure approuvée (gris • | vert • blanc) */}
        <p
          className="hero-enter mx-auto mt-6 max-w-3xl text-lg text-white"
          style={enterDelay(0.3)}
        >
          <span className="text-slate-300">{t.hero.subtitleStart}</span>{" "}
          <span className="text-accent">|</span> {t.hero.subtitleEnd}
        </p>

        {/* CTAs — bouton principal avec halo pulsant */}
        <div
          className="hero-enter-soft mt-10 flex flex-col items-center gap-4 sm:flex-row"
          style={enterDelay(0.38)}
        >
          <div className="relative">
            {!reduceMotion && (
              <span
                aria-hidden
                className="absolute inset-0 -z-10 animate-btn-halo rounded-full bg-accent/40 blur-xl"
              />
            )}
            <Magnetic>
              <Link
                href={localePath(locale, "/contact")}
                className="btn-primary group"
              >
                {t.hero.ctaPrimary}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </Magnetic>
          </div>
          <Magnetic>
            <Link
              href={localePath(locale, "/consultation")}
              className="btn-secondary"
            >
              {t.hero.ctaSecondary}
            </Link>
          </Magnetic>
        </div>

        {/* Indicateur de défilement raffiné : ligne verticale + chevron */}
        <a
          href="#services"
          className="hero-fade group absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-slate-500 transition-colors hover:text-accent"
          style={enterDelay(0.6)}
          aria-label={t.hero.scrollAria}
        >
          <span className="hero-scroll-line" aria-hidden />
          <motion.span
            className="block"
            animate={reduceMotion ? undefined : { y: [0, 4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5" aria-hidden />
          </motion.span>
        </a>
      </motion.div>
    </section>
  );
}
