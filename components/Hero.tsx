"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import HeroBackground from "@/components/HeroBackground";
import Magnetic from "@/components/Magnetic";
import { getDict, localePath, type Locale } from "@/lib/i18n";

// Décor purement esthétique : chargé après le rendu initial pour ne pas
// alourdir le JavaScript critique ni retarder l'interactivité de la page.
const ParticleField = dynamic(() => import("@/components/ParticleField"), {
  ssr: false,
});

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export default function Hero({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 600], [0, 110]);
  const contentOpacity = useTransform(scrollY, [0, 520], [1, 0.15]);

  const fadeUp = (delay: number) => ({
    initial: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 28, filter: "blur(6px)" },
    animate: reduceMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.45, delay, ease },
  });

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
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease }}
          className="relative"
        >
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
              className="h-auto w-64 sm:w-80 lg:w-96"
            />
          </motion.div>
        </motion.div>

        {/* Titre : « Vos lots informatiques ont de la valeur »
            — l'accent « de la valeur » reçoit un soulignement qui se dessine */}
        <h1 className="mx-auto mt-10 max-w-3xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          {startWords.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block whitespace-pre"
              {...fadeUp(0.1 + i * 0.03)}
            >
              {word}{" "}
            </motion.span>
          ))}
          <span className="relative inline-block whitespace-nowrap pb-1">
            {accentWords.map((word, i) => (
              <motion.span
                key={`a-${i}`}
                className="inline-block whitespace-pre text-accent"
                {...fadeUp(0.1 + (startWords.length + i) * 0.03)}
              >
                {word}
                {i < accentWords.length - 1 ? " " : ""}
              </motion.span>
            ))}
            <motion.span
              aria-hidden
              className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-accent-gradient shadow-glow"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              style={{ transformOrigin: "left" }}
              transition={{ duration: 0.5, delay: 0.35, ease }}
            />
          </span>
        </h1>

        {/* Sous-titre : structure approuvée (gris • | vert • blanc) */}
        <motion.p
          {...fadeUp(0.3)}
          className="mx-auto mt-6 max-w-3xl text-lg text-white"
        >
          <span className="text-slate-300">{t.hero.subtitleStart}</span>{" "}
          <span className="text-accent">|</span> {t.hero.subtitleEnd}
        </motion.p>

        {/* CTAs — bouton principal avec halo pulsant */}
        <motion.div
          {...fadeUp(0.38)}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
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
        </motion.div>

        {/* Indicateur de défilement raffiné : ligne verticale + chevron */}
        <motion.a
          href="#services"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="group absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-slate-500 transition-colors hover:text-accent"
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
        </motion.a>
      </motion.div>
    </section>
  );
}
