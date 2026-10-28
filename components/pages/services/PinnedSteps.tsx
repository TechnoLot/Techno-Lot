"use client";

import { m, useMotionValueEvent, useReducedMotion, useScroll, useSpring, type MotionValue } from "framer-motion";
import { createContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Reveal } from "@/components/site/Reveal";
import { Glows, type ChapterTheme } from "./Chapter";

export type PinnedStep = { title: string; text: ReactNode };

/**
 * Ce qu'une image d'étape (frames) peut savoir de la séquence : progression du défilement
 * (0 → 1 sur toute la section), épinglage actif, étape affichée, et sa propre fenêtre
 * [start, end] dans la progression. Lu par les scènes animées (ex. PaymentFrame).
 */
export type EtapeScene = {
  progress: MotionValue<number>;
  pinned: boolean;
  active: boolean;
  start: number;
  end: number;
};
export const EtapeSceneContext = createContext<EtapeScene | null>(null);

type PinnedStepsProps = {
  theme: ChapterTheme;
  heading: ReactNode;
  intro?: ReactNode;
  steps: PinnedStep[];
  /** Une image par étape, en fondu enchaîné */
  frames?: ReactNode[];
  /** Ou une scène continue pilotée par la variable CSS --p (0 → 1) posée sur la scène */
  scene?: ReactNode;
  /** Épingler aussi sous 1024 px (séquences courtes seulement) */
  pinOnMobile?: boolean;
  /** Proportions de la scène sous 1024 px (classe Tailwind complète) */
  aspect?: string;
  /** Proportions de la scène dès 1024 px (classe lg: complète) */
  lgAspect?: string;
  glow?: "left" | "right" | "both";
  id?: string;
  /** Libellé de la scène pour les lecteurs d'écran */
  stageLabel?: string;
};

/**
 * Séquence épinglée : le chapitre reste à l'écran et le défilement fait avancer les étapes une à une
 * (barre de progression, étape active dépliée, scène qui change). Un clic sur une étape y amène.
 * Rendu serveur = version statique complète (toutes les étapes dépliées) : rien n'est caché si le JS
 * échoue. L'épinglage s'active après l'hydratation, jamais en mouvement réduit.
 */
export function PinnedSteps({
  theme,
  heading,
  intro,
  steps,
  frames,
  scene,
  pinOnMobile = false,
  aspect = "aspect-[4/3]",
  lgAspect = "lg:aspect-[5/4]",
  glow,
  id,
  stageLabel,
}: PinnedStepsProps) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [active, setActive] = useState(0);
  const n = steps.length;
  const hid = useId();
  const staticP = (i: number) => Math.min(1, (i + 0.8) / n);

  useEffect(() => {
    if (reduce) {
      setPinned(false);
      return;
    }
    const mq = window.matchMedia(
      pinOnMobile ? "(min-height: 600px)" : "(min-width: 1024px) and (min-height: 620px)",
    );
    const apply = () => setPinned(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [reduce, pinOnMobile]);

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const rail = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!pinned) return;
    stageRef.current?.style.setProperty("--p", v.toFixed(4));
    const next = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    setActive((a) => (a === next ? a : next));
  });

  useEffect(() => {
    if (pinned) stageRef.current?.style.setProperty("--p", scrollYProgress.get().toFixed(4));
  }, [pinned, scrollYProgress]);

  const select = (i: number) => {
    if (!pinned) {
      setActive(i);
      return;
    }
    const track = trackRef.current;
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.offsetHeight - window.innerHeight;
    const target = top + ((i + 0.5) / n) * travel;
    if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1.1 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  const stageSize = pinned && pinOnMobile ? `h-[30svh] lg:h-auto ${lgAspect}` : `${aspect} ${lgAspect}`;

  return (
    <section id={id} data-theme={theme} aria-labelledby={hid} className="relative isolate">
      <div ref={trackRef} className="relative" style={pinned ? { height: `${100 + n * 70}vh` } : undefined}>
        <div
          className={
            pinned
              ? "sticky top-0 flex h-[100svh] items-center overflow-clip pb-5 pt-[calc(var(--site-header-h,96px)+10px)]"
              : "relative overflow-clip py-20 sm:py-28"
          }
        >
          {glow && <Glows side={glow} />}
          <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
            <div className={`grid lg:grid-cols-12 lg:gap-x-12 ${pinned ? "gap-4 lg:gap-y-6" : "gap-8 lg:gap-y-10"}`}>
              <Reveal className="lg:col-span-5">
                <h2
                  id={hid}
                  className={`font-display font-bold leading-[1.04] tracking-[-0.025em] text-mist ${
                    pinned ? "text-[clamp(1.55rem,3vw,2.6rem)]" : "text-[clamp(2rem,4.4vw,3.4rem)]"
                  }`}
                >
                  {heading}
                </h2>
                {intro && (
                  <p className={`mt-4 text-base leading-relaxed text-moss ${pinned ? "max-lg:hidden" : "sm:text-lg"}`}>{intro}</p>
                )}
              </Reveal>

              <Reveal className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 lg:self-center" delay={0.08}>
                <div
                  ref={stageRef}
                  role="img"
                  aria-label={stageLabel ?? steps[active]?.title}
                  data-mode={pinned ? "pinned" : "static"}
                  data-step={active}
                  style={pinned ? undefined : ({ "--p": staticP(active) } as CSSProperties)}
                  className={`svc-stage relative w-full overflow-hidden rounded-[28px] bg-surface ring-1 ring-line ${stageSize}`}
                >
                  {frames?.map((frame, i) => (
                    <div
                      key={i}
                      aria-hidden="true"
                      className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        i === active ? "scale-100 opacity-100" : "pointer-events-none scale-[0.97] opacity-0"
                      }`}
                    >
                      <EtapeSceneContext.Provider
                        value={{ progress: scrollYProgress, pinned, active: i === active, start: i / n, end: (i + 1) / n }}
                      >
                        {frame}
                      </EtapeSceneContext.Provider>
                    </div>
                  ))}
                  {scene}
                  <span
                    aria-hidden="true"
                    className="svc-chip absolute bottom-4 right-4 rounded-full px-3 py-1 font-display text-xs font-semibold tabular-nums tracking-[0.14em]"
                  >
                    {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                  </span>
                </div>
              </Reveal>

              <div className="relative lg:col-span-5">
                {pinned && (
                  <div aria-hidden="true" className="absolute bottom-5 left-[19px] top-5 w-[2px] overflow-hidden rounded-full bg-line">
                    <m.div className="h-full w-full origin-top bg-emerald" style={{ scaleY: rail }} />
                  </div>
                )}
                <ol className={`relative ${pinned ? "space-y-1" : "space-y-5"}`}>
                  {steps.map((step, i) => {
                    const on = i === active;
                    const done = i < active;
                    const open = !pinned || on;
                    return (
                      <li key={step.title}>
                        <Reveal delay={pinned ? 0 : i * 0.08} y={20}>
                          <button
                            type="button"
                            onClick={() => select(i)}
                            aria-current={on ? "step" : undefined}
                            className="group flex w-full items-center gap-4 py-1.5 text-left"
                          >
                            <span
                              className={`svc-dot relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold tabular-nums transition-[background-color,color,box-shadow] duration-500 ${
                                on ? "svc-dot--on" : done ? "svc-dot--done" : ""
                              }`}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span
                              className={`font-display text-lg font-semibold leading-snug text-mist transition-opacity duration-500 sm:text-xl ${
                                pinned && !on ? "opacity-55 group-hover:opacity-90" : "opacity-100"
                              }`}
                            >
                              {step.title}
                            </span>
                          </button>
                          <div
                            className={`grid pl-14 transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                              open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="pb-2 pt-1 text-[15px] leading-relaxed text-moss sm:text-base">{step.text}</div>
                            </div>
                          </div>
                        </Reveal>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
