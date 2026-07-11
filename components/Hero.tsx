"use client";

import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import HeroBackground from "@/components/HeroBackground";
import ParticleField from "@/components/ParticleField";
import Magnetic from "@/components/Magnetic";
import { getDict, localePath, type Locale } from "@/lib/i18n";

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
    transition: { duration: 0.7, delay, ease },
  });

  const startWords = t.hero.titleStart.split(" ");
  const accentWords = t.hero.titleAccent.split(" ");

  return (
    <section className="relative overflow-hidden">
      <HeroBackground />
      <ParticleField />

      <motion.div
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className="container-site relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center py-24 text-center"
      >
        {/* Logo en évidence */}
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease }}
          className="relative"
        >
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-accent/10 blur-3xl"
          />
          <Image
            src="/logo.png"
            alt="Techno Lot"
            width={420}
            height={252}
            priority
            className="h-auto w-64 sm:w-80 lg:w-96"
          />
        </motion.div>

        <h1 className="mx-auto mt-10 max-w-3xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          {startWords.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block whitespace-pre"
              {...fadeUp(0.35 + i * 0.07)}
            >
              {word}{" "}
            </motion.span>
          ))}
          {accentWords.map((word, i) => (
            <motion.span
              key={`a-${i}`}
              className="inline-block whitespace-pre text-accent"
              {...fadeUp(0.35 + (startWords.length + i) * 0.07)}
            >
              {word}{" "}
            </motion.span>
          ))}
        </h1>

        <motion.p
          {...fadeUp(0.95)}
          className="mx-auto mt-5 max-w-3xl text-lg text-white"
        >
          <span className="text-slate-300">{t.hero.subtitleStart}</span>{" "}
          <span className="text-accent">|</span> {t.hero.subtitleEnd}
        </motion.p>

        <motion.div
          {...fadeUp(1.1)}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Magnetic>
            <Link href={localePath(locale, "/contact")} className="btn-primary">
              {t.hero.ctaPrimary}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              href={localePath(locale, "/consultation")}
              className="btn-secondary"
            >
              {t.hero.ctaSecondary}
            </Link>
          </Magnetic>
        </motion.div>

        {/* Indicateur de défilement */}
        <motion.a
          href="#services"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.7 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 transition-colors hover:text-accent"
          aria-label={t.hero.scrollAria}
        >
          <motion.span
            className="block"
            animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-6 w-6" aria-hidden />
          </motion.span>
        </motion.a>
      </motion.div>
    </section>
  );
}
