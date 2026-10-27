"use client";

import { useId, useRef, useState } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { CalendarCheck, ClipboardList, HandCoins, Truck } from "lucide-react";
import { PrimaryButtonLink } from "@/components/site/Button";
import type { AccueilContenu } from "./contenu";
import { MaquetteEtape } from "./etapes-maquettes";
import "./interactif.css";

type Steps = AccueilContenu["steps"];

/**
 * Teinte de chaque étape : l'ordre se lit du plus foncé au plus clair.
 * Texte blanc ou encre selon le meilleur contraste (vert moyen : encre 4,5:1 contre blanc 4,4:1).
 */
const TEINTES = [
  { bg: "bg-deep", fg: "text-white", sub: "text-white/80", rim: "border-white/25", Icon: ClipboardList },
  { bg: "bg-leaf", fg: "text-ink", sub: "text-ink", rim: "border-ink/30", Icon: CalendarCheck },
  { bg: "bg-vivid", fg: "text-ink", sub: "text-ink/80", rim: "border-ink/25", Icon: Truck },
  { bg: "bg-mint", fg: "text-ink", sub: "text-[#313d34]", rim: "border-ink/20", Icon: HandCoins },
] as const;

/**
 * « Comment ça marche ? » : accordéon horizontal de quatre panneaux collés (vertical sur mobile).
 * La section s'épingle et le défilement ouvre les étapes une à une ; un clic (ou un toucher) sur
 * une bande l'ouvre aussi. Mouvement réduit : pas d'épinglage, ouverture au clic, sans transition.
 */
export function EtapesAccordeon({ steps, href }: { steps: Steps; href: string }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const trackRef = useRef<HTMLDivElement>(null);
  const lockUntil = useRef(0);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const items = steps.items;
  const n = items.length;

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // pendant le défilement lancé par un clic, on ne repasse pas par les étapes intermédiaires
    if (reduce || performance.now() < lockUntil.current) return;
    const next = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    setActive((a) => (a === next ? a : next));
  });

  const select = (i: number) => {
    setActive(i);
    const track = trackRef.current;
    if (reduce || !track || !track.offsetHeight) return;
    const travel = track.offsetHeight - window.innerHeight;
    if (travel <= 0) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const target = top + ((i + 0.5) / n) * travel;
    lockUntil.current = performance.now() + 1300;
    if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1.1 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <>
      <div ref={trackRef} className="relative h-[300vh] motion-reduce:h-auto lg:h-[320vh]">
        <div className="etapes-pin sticky top-0 flex h-[100svh] flex-col pb-5 pt-[calc(var(--site-header-h)+1.25rem)] motion-reduce:static motion-reduce:h-auto motion-reduce:pb-6 motion-reduce:pt-20 lg:justify-center lg:pb-6 lg:pt-[calc(var(--site-header-h)+1rem)]">
          <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-5 sm:px-8 lg:flex-none">
            {/* Introduction sur deux colonnes */}
            <div className="grid gap-x-8 gap-y-2 lg:grid-cols-12 lg:items-end">
              <h2
                id={`${uid}-titre`}
                className="font-display text-[clamp(2rem,3.9vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.02em] text-mist lg:col-span-5"
              >
                {steps.title}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-moss sm:text-base lg:col-span-5 lg:col-start-7 lg:max-w-none lg:pb-1 lg:text-lg">
                {steps.subtitle}
              </p>
            </div>

            {/* Accordéon */}
            <ol
              aria-labelledby={`${uid}-titre`}
              className="etapes-acc mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] motion-reduce:h-[600px] motion-reduce:flex-none lg:mt-8 lg:h-[min(540px,calc(100svh-var(--site-header-h)-16.5rem))] lg:flex-none lg:flex-row lg:motion-reduce:h-[540px]"
            >
              {items.map((step, i) => {
                const t = TEINTES[i % TEINTES.length];
                const on = i === active;
                const btnId = `${uid}-b${i}`;
                const panelId = `${uid}-p${i}`;
                return (
                  <li key={step.title} data-open={on || undefined} className={`etapes-panel relative overflow-hidden ${t.bg} ${t.fg}`}>
                    {/* Bande : nom de l'étape (tourné à 90° sur grand écran) */}
                    <button
                      id={btnId}
                      type="button"
                      aria-expanded={on}
                      aria-controls={panelId}
                      onClick={() => select(i)}
                      className={`absolute inset-x-0 top-0 z-10 h-16 text-left focus-visible:outline-offset-[-4px] lg:inset-y-0 lg:h-auto ${
                        on ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <span
                        className={`flex h-full items-center gap-3 px-5 transition-opacity lg:flex-col lg:items-start lg:justify-between lg:p-7 ${
                          on ? "lg:opacity-0 lg:duration-150" : "lg:opacity-100 lg:delay-200 lg:duration-300"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border lg:h-11 lg:w-11 ${t.rim}`}
                        >
                          <t.Icon className="h-[18px] w-[18px] lg:h-5 lg:w-5" aria-hidden="true" />
                        </span>
                        <span className="font-display text-base font-semibold leading-tight sm:text-lg lg:rotate-180 lg:whitespace-nowrap lg:text-xl lg:[writing-mode:vertical-rl]">
                          {step.title}
                        </span>
                      </span>
                    </button>

                    {/* Contenu du panneau ouvert : largeur fixe, il ne se recompose pas pendant l'ouverture */}
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      className={`etapes-content absolute left-0 top-16 flex flex-col px-5 pb-5 transition-[opacity,transform] ease-out lg:top-0 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6 lg:p-10 ${
                        on ? "translate-y-0 opacity-100 delay-150 duration-500" : "translate-y-3 opacity-0 duration-150"
                      }`}
                    >
                      <div className="lg:flex lg:flex-col lg:justify-between">
                        <span
                          aria-hidden="true"
                          className={`hidden h-11 w-11 items-center justify-center rounded-full border lg:flex ${t.rim}`}
                        >
                          <t.Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p
                            aria-hidden="true"
                            className="hidden text-balance font-display text-[clamp(1.75rem,2.6vw,2.5rem)] font-bold leading-[1.04] tracking-[-0.02em] lg:block"
                          >
                            {step.title}
                          </p>
                          <p className={`max-w-[34ch] text-sm leading-relaxed sm:text-base lg:mt-4 ${t.sub}`}>{step.text}</p>
                        </div>
                      </div>
                      <div
                        data-stage
                        aria-hidden="true"
                        className="etapes-stage relative mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden lg:mt-0"
                      >
                        <MaquetteEtape index={i} mock={steps.mock} play={on && !reduce} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Grand écran : bouton sous l'accordéon, dans la vue épinglée */}
            <div className="mt-6 hidden lg:block">
              <PrimaryButtonLink href={href}>{steps.cta}</PrimaryButtonLink>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile : le bouton suit l'accordéon (toute la hauteur épinglée reste aux étapes) */}
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-1 sm:px-8 lg:hidden">
        <PrimaryButtonLink href={href}>{steps.cta}</PrimaryButtonLink>
      </div>
    </>
  );
}
