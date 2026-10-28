"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { m, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Reveal } from "@/components/site/Reveal";
import { Glows, type ChapterTheme } from "./Chapter";

export type RailItem = {
  title: string;
  text: string;
  image: string;
  /** Lien discret vers la page dédiée à la catégorie (optionnel) */
  link?: { href: string; label: string };
};

type CategoryRailProps = {
  theme: ChapterTheme;
  heading: ReactNode;
  intro?: ReactNode;
  items: RailItem[];
  /** Dernier panneau : « tout le reste » */
  special: { word: string; title: string; text: ReactNode; action?: ReactNode };
  /** Libellé accessible de la liste */
  label: string;
};

/**
 * Défilé des catégories : le chapitre s'épingle et le défilement vertical fait glisser les panneaux
 * de droite à gauche (le panneau au centre de l'attention est pleinement allumé).
 * Rendu serveur = rangée qu'on fait défiler soi-même (snap) : rien n'est caché si le JS échoue ;
 * même chose en mouvement réduit ou sur un écran trop bas.
 */
export function CategoryRail({ theme, heading, intro, items, special, label }: CategoryRailProps) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const [pinned, setPinned] = useState(false);
  const [distance, setDistance] = useState(0);
  const [active, setActive] = useState(0);
  const x = useMotionValue(0);
  const hid = useId();
  const total = items.length + 1;

  useEffect(() => {
    if (reduce) {
      setPinned(false);
      return;
    }
    const mq = window.matchMedia("(min-height: 620px)");
    const apply = () => setPinned(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [reduce]);

  useEffect(() => {
    const rail = railRef.current;
    if (!pinned || !rail) {
      x.set(0);
      return;
    }
    const measure = () => setDistance(Math.max(0, rail.scrollWidth - document.documentElement.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned, x]);

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  const sync = (v: number) => {
    x.set(-v * distance);
    const next = Math.min(total - 1, Math.max(0, Math.round(v * (total - 1))));
    setActive((a) => (a === next ? a : next));
  };
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (pinned) sync(v);
  });
  useEffect(() => {
    if (pinned) sync(scrollYProgress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned, distance]);

  const dim = (i: number) => (pinned && i !== active ? "opacity-45" : "opacity-100");

  return (
    <section data-theme={theme} aria-labelledby={hid} className="relative isolate">
      <div
        ref={trackRef}
        className="relative"
        style={pinned ? { height: `calc(100svh + ${Math.round(distance)}px)` } : undefined}
      >
        <div
          className={
            pinned
              ? "sticky top-0 flex h-[100svh] flex-col justify-center overflow-clip pb-6 pt-[calc(var(--site-header-h,96px)+12px)]"
              : "relative overflow-clip py-20 sm:py-28"
          }
        >
          <Glows side="right" />
          <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
            <Reveal className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
              <div className="max-w-2xl">
                <h2
                  id={hid}
                  className={`font-display font-bold leading-[1.04] tracking-[-0.025em] text-mist ${
                    pinned ? "text-[clamp(1.6rem,3.4vw,2.9rem)]" : "text-[clamp(2rem,4.4vw,3.4rem)]"
                  }`}
                >
                  {heading}
                </h2>
                {intro && <p className={`mt-3 text-base leading-relaxed text-moss ${pinned ? "max-sm:hidden" : "sm:text-lg"}`}>{intro}</p>}
              </div>
              <div aria-hidden="true" className="flex items-center gap-4 pb-1">
                <span className="font-display text-sm font-semibold tabular-nums tracking-[0.14em] text-mist">
                  {String(active + 1).padStart(2, "0")}
                  <span className="text-moss"> / {String(total).padStart(2, "0")}</span>
                </span>
                {pinned && (
                  <span className="relative h-[2px] w-28 overflow-hidden rounded-full bg-line sm:w-40">
                    <m.span className="absolute inset-0 origin-left bg-emerald" style={{ scaleX: bar }} />
                  </span>
                )}
              </div>
            </Reveal>
          </div>

          <div
            className={pinned ? "mt-6 sm:mt-10" : "svc-rail-scroll mt-10 snap-x snap-mandatory overflow-x-auto pb-4"}
            tabIndex={pinned ? undefined : 0}
            aria-label={pinned ? undefined : label}
          >
            <m.ol
              ref={railRef}
              aria-label={label}
              style={pinned ? { x } : undefined}
              className="svc-rail flex w-max gap-4 sm:gap-6"
            >
              {items.map((item, i) => (
                <li
                  key={item.title}
                  className={`svc-rail-item w-[78vw] shrink-0 snap-start transition-opacity duration-500 sm:w-[54vw] lg:w-[30rem] ${dim(i)}`}
                >
                  <article>
                    <div className="relative h-[26svh] max-h-[360px] min-h-[180px] overflow-hidden rounded-[24px] bg-[#05080d] sm:h-[34svh] lg:h-[38svh]">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 78vw, (max-width: 1024px) 54vw, 480px"
                        className={`object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          pinned && i === active ? "scale-[1.04]" : "scale-100"
                        }`}
                      />
                      <span className="absolute left-4 top-4 font-display text-sm font-semibold tabular-nums tracking-[0.14em] text-white/80">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-xl font-semibold leading-snug text-mist sm:text-2xl">{item.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-moss sm:text-base">{item.text}</p>
                    {item.link && (
                      <Link
                        href={item.link.href}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {item.link.label}
                        <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </Link>
                    )}
                  </article>
                </li>
              ))}
              <li className={`svc-rail-item w-[78vw] shrink-0 snap-start transition-opacity duration-500 sm:w-[54vw] lg:w-[30rem] ${dim(items.length)}`}>
                <article>
                  <div
                    data-theme="lime"
                    className="relative flex h-[26svh] max-h-[360px] min-h-[180px] items-end overflow-hidden rounded-[24px] p-6 sm:h-[34svh] lg:h-[38svh]"
                  >
                    <span aria-hidden="true" className="svc-ring absolute -right-16 -top-16 h-64 w-64 rounded-full" />
                    <span className="font-display text-[clamp(3.5rem,9vw,6.5rem)] font-bold leading-none tracking-[-0.04em] text-ink">
                      {special.word}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold leading-snug text-mist sm:text-2xl">{special.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-moss sm:text-base">{special.text}</p>
                  {special.action && <div className="mt-5">{special.action}</div>}
                </article>
              </li>
            </m.ol>
          </div>
        </div>
      </div>
    </section>
  );
}
