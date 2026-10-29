"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

type CounterProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  /** true = pas de séparateur de milliers */
  plain?: boolean;
  locale: Locale;
  className?: string;
  /** Durée en secondes */
  duration?: number;
};

/*
  Courbe cubic-bezier(0.16, 1, 0.3, 1), résolue exactement comme framer-motion (qui animait ces
  compteurs) : recherche de t par subdivision binaire (précision 1e-7, 12 itérations au plus),
  sans approximation de Newton ni table. Mêmes valeurs à chaque image.
*/
const X1 = 0.16;
const Y1 = 1;
const X2 = 0.3;
const Y2 = 1;
const bezier = (t: number, a1: number, a2: number) => (((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t + 3 * a1) * t;

function ease(x: number): number {
  if (x === 0 || x === 1) return x;
  let bas = 0;
  let haut = 1;
  let t: number;
  let ecart: number;
  let i = 0;
  do {
    t = bas + (haut - bas) / 2;
    ecart = bezier(t, X1, X2) - x;
    if (ecart > 0) haut = t;
    else bas = t;
  } while (Math.abs(ecart) > 0.0000001 && ++i < 12);
  return bezier(t, Y1, Y2);
}

/** Compteur animé au défilement (chiffres tabulaires). Valeur finale rendue côté serveur ; directe en mouvement réduit. */
export function Counter({ value, prefix, suffix, plain = false, locale, className, duration = 1.6 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  const format = (v: number) =>
    plain ? String(Math.round(v)) : Math.round(v).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA");

  // Déclencheur : une seule fois, dès qu'une partie du nombre entre dans l'écran rétréci de 40 px
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setInView(true);
      },
      { rootMargin: "-40px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    // N'écrit dans le DOM que si le texte affiché change
    const ecrire = (v: number) => {
      const texte = format(v);
      if (el.textContent !== texte) el.textContent = texte;
    };
    if (window.matchMedia("(prefers-reduced-motion)").matches) {
      ecrire(value);
      return;
    }
    // Temps en millisecondes entières depuis le déclenchement, lu au début de chaque image (comme framer)
    const debut = performance.now();
    const ms = duration * 1000;
    let raf = requestAnimationFrame(function image() {
      const t = Math.round(performance.now() - debut);
      if (t >= ms) {
        ecrire(value);
        return;
      }
      ecrire(value * ease(t / ms));
      raf = requestAnimationFrame(image);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {prefix ? <span>{prefix} </span> : null}
      <span ref={ref}>{format(value)}</span>
      {suffix ? <span>{suffix}</span> : null}
    </span>
  );
}
