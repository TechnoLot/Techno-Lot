"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
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
 * « Comment ça marche ? » : accordéon vertical de quatre bandes empilées, qui se lit de haut en bas.
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
        <div className="etapes-pin sticky top-0 flex h-[100svh] flex-col pb-5 pt-[calc(var(--site-header-h)+1.25rem)] motion-reduce:static motion-reduce:h-auto motion-reduce:pb-6 motion-reduce:pt-20 lg:pb-8">
          <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-5 sm:px-8 lg:justify-center">
            {/* Introduction : titre et sous-titre à gauche, bouton à droite (grand écran) */}
            <div className="flex items-end justify-between gap-8">
              <div>
                <h2
                  id={`${uid}-titre`}
                  className="font-display text-[clamp(2rem,3.6vw,3rem)] font-bold leading-[1.02] tracking-[-0.02em] text-mist"
                >
                  {steps.title}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-moss sm:text-base lg:mt-3 lg:max-w-none">{steps.subtitle}</p>
              </div>
              <div className="hidden shrink-0 lg:block">
                <PrimaryButtonLink href={href}>{steps.cta}</PrimaryButtonLink>
              </div>
            </div>

            {/* Accordéon : une bande par étape, l'étape ouverte se déplie vers le bas */}
            <ol
              aria-labelledby={`${uid}-titre`}
              style={{ "--etapes-n": n } as CSSProperties}
              className="etapes-acc mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] motion-reduce:h-[620px] motion-reduce:flex-none lg:mt-7 lg:max-h-[640px]"
            >
              {items.map((step, i) => {
                const t = TEINTES[i % TEINTES.length];
                const on = i === active;
                const btnId = `${uid}-b${i}`;
                const panelId = `${uid}-p${i}`;
                return (
                  <li
                    key={step.title}
                    data-open={on || undefined}
                    data-after={i > active || undefined}
                    style={{ "--etapes-i": i } as CSSProperties}
                    className={`etapes-panel overflow-hidden ${t.bg} ${t.fg}`}
                  >
                    {/* Bande : icône, nom de l'étape et son numéro, toujours à l'horizontale */}
                    <button
                      id={btnId}
                      type="button"
                      aria-expanded={on}
                      aria-controls={panelId}
                      onClick={() => select(i)}
                      className={`etapes-band absolute inset-x-0 top-0 z-10 text-left focus-visible:outline-offset-[-4px] ${
                        on ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <span className="flex h-full items-center gap-3 px-5 sm:gap-4 lg:px-8">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${t.rim}`}>
                          <t.Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 font-display text-base font-semibold leading-tight sm:text-lg lg:text-xl">
                          {step.title}
                        </span>
                        <span aria-hidden="true" className={`ml-auto shrink-0 font-display text-sm font-semibold tabular-nums ${t.sub}`}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </span>
                    </button>

                    {/* Contenu de l'étape ouverte : texte puis maquette (côte à côte dès 640 px) */}
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      className={`etapes-content absolute left-0 flex flex-col px-5 pb-5 transition-[opacity,transform] ease-out sm:flex-row sm:items-center sm:gap-6 lg:gap-10 lg:px-8 lg:pb-6 ${
                        on ? "translate-y-0 opacity-100 delay-150 duration-500" : "translate-y-3 opacity-0 duration-150"
                      }`}
                    >
                      <p
                        className={`max-w-[34ch] text-sm leading-relaxed sm:w-[42%] sm:shrink-0 sm:text-base lg:text-xl lg:leading-relaxed ${t.sub}`}
                      >
                        {step.text}
                      </p>
                      <div
                        data-stage
                        aria-hidden="true"
                        className="etapes-stage relative mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden sm:mt-0 sm:h-full"
                      >
                        <MaquetteEtape index={i} mock={steps.mock} play={on && !reduce} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
      {/* Mobile et tablette : le bouton suit l'accordéon (toute la hauteur épinglée reste aux étapes) */}
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-1 sm:px-8 lg:hidden">
        <PrimaryButtonLink href={href}>{steps.cta}</PrimaryButtonLink>
      </div>
    </>
  );
}
