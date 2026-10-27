"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { m } from "framer-motion";
import { Check } from "lucide-react";
import { PrimaryButtonLink } from "@/components/site/Button";
import type { AccueilContenu } from "./contenu";
import { OBJETS, PAL_H, PAL_W, STAGE_H, TOTAL } from "./palette-objets";
import "./interactif.css";

const DIR = "/images/palette/";
/** Calendrier des chutes : début, écart entre deux chutes, durée, part de vol. */
const START = 0.05;
const STEP = 0.088;
const DUR = 0.09;
const LAND = 0.82;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const pctX = (v: number) => `${(v / PAL_W) * 100}%`;
const pctY = (v: number) => `${(v / STAGE_H) * 100}%`;
const finalTransform = (r?: number) => (r ? `rotate(${r}deg)` : "none");

/**
 * Chapitre lime « on se déplace » : la section s'épingle et dix appareils tombent un à un
 * sur la palette au défilement, avec un petit rebond ; une fois la palette pleine, l'invitation
 * à soumettre apparaît. Sans JS ou en mouvement réduit : palette déjà chargée, bouton visible.
 */
export function PaletteScene({ labels, href }: { labels: AccueilContenu["palette"]; href: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const shadowRefs = useRef<(HTMLElement | null)[]>([]);
  // Rendu serveur = palette pleine : rien n'est caché si le JS ne s'exécute pas.
  const [full, setFull] = useState(true);

  useEffect(() => {
    const track = trackRef.current;
    const scene = sceneRef.current;
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    if (!track || !scene || !stage || !tilt) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let sceneH = scene.clientHeight;
    let stageTop = stage.offsetTop;
    let stageW = stage.offsetWidth;
    let raf = 0;
    let visible = true;
    let shown = true;

    const target = () => {
      if (reduce) return 1;
      const rect = track.getBoundingClientRect();
      return clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
    };
    // Départ à la position courante : pas de chute rejouée au chargement en milieu de page.
    let Pe = target();

    const paint = () => {
      const k = stageW / PAL_W; // px par unité de palette
      const stageBottom = stageTop + STAGE_H * k;
      let landed = 0;
      let impact = 0;

      OBJETS.forEach((d, i) => {
        const el = itemRefs.current[i];
        const sh = shadowRefs.current[i];
        if (!el) return;
        const t = clamp((Pe - (START + d.drop * STEP)) / DUR);
        let fall: number;
        let air: number;
        if (t < LAND) {
          const g = t / LAND;
          fall = 1 - g * g;
          air = 1 - g;
        } else {
          // petit rebond à l'atterrissage
          const b = (t - LAND) / (1 - LAND);
          fall = -Math.sin(b * Math.PI) * 0.02;
          air = 0;
          impact = Math.max(impact, Math.sin(b * Math.PI));
        }
        if (t >= LAND) landed++;

        // départ près du haut de la scène, avec une hauteur de chute minimale
        const h = (d.w * k * d.dims[1]) / d.dims[0];
        const restCenter = stageBottom - d.b * k - h / 2;
        const dist = Math.max(restCenter - sceneH * 0.04, sceneH * 0.22);
        const dy = -fall * dist;
        const side = d.drop % 2 ? 1 : -1;
        const rx = air * 28 * side;
        const ry = air * 22 * -side;
        const rz = (d.r ?? 0) + air * 14 * side;
        el.style.opacity = t > 0 ? Math.min(1, t * 12).toFixed(2) : "0";
        el.style.transform = `translate3d(0, ${dy.toFixed(1)}px, 0) perspective(700px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotate(${rz.toFixed(2)}deg)`;

        // ombre de contact : se forme à l'approche, nette une fois posé
        if (sh) {
          const near = t <= 0 ? 0 : t >= LAND ? 1 : (t / LAND) ** 2;
          sh.style.opacity = (near ** 1.5).toFixed(3);
          sh.style.transform = `translateX(-50%) scaleX(${(0.55 + 0.45 * near).toFixed(3)})`;
        }
      });

      tilt.style.transform = `translate3d(0, ${(impact * 2.5).toFixed(2)}px, 0) scaleY(${(1 - impact * 0.012).toFixed(4)})`;
      const isFull = landed >= TOTAL;
      if (isFull !== shown) {
        shown = isFull;
        setFull(isFull);
      }
    };

    const frame = () => {
      raf = 0;
      if (!visible) return;
      const P = target();
      // progression lissée : les chutes restent fluides même avec la molette
      Pe = reduce ? 1 : Pe + (P - Pe) * 0.14;
      paint();
      if (Math.abs(P - Pe) > 0.0004) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(() => {
      sceneH = scene.clientHeight;
      stageTop = stage.offsetTop;
      stageW = stage.offsetWidth;
      paint();
      kick();
    });
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      kick();
    });

    // état initial posé tout de suite (avant la première image), même hors écran
    paint();
    ro.observe(scene);
    ro.observe(stage);
    io.observe(track);
    window.addEventListener("scroll", kick, { passive: true });
    kick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", kick);
    };
  }, []);

  // Petite gerbe de confettis quand le dernier appareil se pose (pas au premier rendu, déjà plein)
  const [confetti, setConfetti] = useState(0);
  const wasFull = useRef(true);
  useEffect(() => {
    if (full && !wasFull.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setConfetti((c) => c + 1);
    }
    wasFull.current = full;
  }, [full]);

  return (
    <section data-theme="lime" aria-labelledby="palette-titre" className="relative text-mist">
      <div ref={trackRef} className="relative h-[190vh] motion-reduce:h-auto lg:h-[210vh]">
        <div className="sticky top-0 flex h-[100svh] flex-col pb-6 pt-[calc(var(--site-header-h)+1.25rem)] motion-reduce:static motion-reduce:h-auto motion-reduce:py-20 lg:pb-10 lg:pt-[calc(var(--site-header-h)+2.25rem)]">
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-5 sm:px-8">
            <h2
              id="palette-titre"
              className="text-balance font-display text-[clamp(2.1rem,6vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.035em] text-mist"
            >
              {labels.title}
            </h2>

            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 lg:mt-8 lg:grid lg:grid-cols-12 lg:grid-rows-[auto_1fr_auto] lg:gap-x-8 lg:gap-y-0">
              {/* Texte + aucun minimum */}
              <div className="lg:col-span-4 lg:row-start-1">
                <p className="max-w-md text-[15px] leading-relaxed text-moss sm:text-base lg:text-lg">{labels.text}</p>
                <p className="mt-3 inline-flex items-center gap-2.5 font-display text-base font-semibold text-mist lg:mt-5 lg:text-lg">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-deep text-vivid">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {labels.note}
                </p>
              </div>

              {/* Scène */}
              <div
                ref={sceneRef}
                className="palette-scene relative min-h-0 flex-1 motion-reduce:h-[300px] motion-reduce:flex-none sm:motion-reduce:h-[420px] lg:col-span-8 lg:col-start-5 lg:row-span-3 lg:row-start-1 lg:h-full lg:motion-reduce:h-[480px]"
              >
                <div
                  ref={stageRef}
                  role="img"
                  aria-label={labels.sceneLabel}
                  className="palette-stage absolute bottom-[2%] left-1/2 -translate-x-1/2"
                >
                  {/* Ombre au sol, discrète */}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-[-1.5%] left-1/2 h-[6%] w-[90%] -translate-x-1/2 rounded-[50%] bg-deep/30 blur-xl"
                  />
                  <div ref={tiltRef} className="relative h-full w-full origin-bottom will-change-transform">
                    <Image
                      src={`${DIR}palette-vide.webp`}
                      alt=""
                      width={1400}
                      height={306}
                      sizes="(min-width: 1024px) 680px, 90vw"
                      draggable={false}
                      className="absolute bottom-0 left-0 block w-full select-none"
                      style={{ height: pctY(PAL_H) }}
                    />
                    {OBJETS.map((d, i) => (
                      <PaletteItem
                        key={d.src}
                        d={d}
                        itemRef={(el) => {
                          itemRefs.current[i] = el;
                        }}
                        shadowRef={(el) => {
                          shadowRefs.current[i] = el;
                        }}
                      />
                    ))}
                  </div>
                  {confetti > 0 && <Confetti key={confetti} />}
                </div>
              </div>

              {/* Fin : palette prête (hauteur réservée : la scène ne bouge pas quand il apparaît) */}
              <div className="min-h-[7.25rem] lg:col-span-4 lg:row-start-3 lg:min-h-[8rem]">
                {full && (
                  <div className="animate-[heroRiseIn_500ms_ease-out_both] motion-reduce:animate-none">
                    <p className="max-w-xs font-display text-lg font-semibold leading-snug text-mist lg:text-xl">{labels.done}</p>
                    <PrimaryButtonLink href={href} className="mt-3 lg:mt-4">
                      {labels.cta}
                    </PrimaryButtonLink>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaletteItem({
  d,
  itemRef,
  shadowRef,
}: {
  d: (typeof OBJETS)[number];
  itemRef: (el: HTMLElement | null) => void;
  shadowRef: (el: HTMLElement | null) => void;
}) {
  const [sx, sy, sw] = d.shadow;
  return (
    <>
      {/* Ombre de contact, discrète, sur la surface d'appui */}
      <span
        ref={shadowRef}
        aria-hidden="true"
        className="absolute block rounded-[50%] bg-ink/30 blur-[3px]"
        style={{
          left: pctX(sx),
          bottom: pctY(sy - 6),
          width: pctX(sw),
          height: pctY(12),
          transform: "translateX(-50%)",
        }}
      />
      <span
        ref={itemRef}
        className="absolute block will-change-transform"
        style={{
          left: pctX(d.x),
          bottom: pctY(d.b),
          width: pctX(d.w),
          transformOrigin: d.origin ?? "50% 50%",
          transform: finalTransform(d.r),
        }}
      >
        <Image
          src={`${DIR}${d.src}.webp`}
          alt=""
          width={d.dims[0]}
          height={d.dims[1]}
          sizes={`${Math.ceil((d.w / PAL_W) * 680)}px`}
          draggable={false}
          className="block h-auto w-full select-none drop-shadow-[0_5px_7px_rgba(4,30,12,0.2)]"
          style={d.clipRight ? { clipPath: `inset(0 ${d.clipRight * 100}% 0 0)` } : undefined}
        />
      </span>
    </>
  );
}

/** Couleurs de la marque, lisibles sur le lime. */
const CONFETTI_COLORS = ["#0e3a20", "#ffffff", "#e8f5e0", "#0a0f1c", "#2e8b14"];

/** Gerbe de confettis qui jaillit de la palette puis retombe en tournoyant. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (-90 + (Math.random() - 0.5) * 130) * (Math.PI / 180);
        const speed = 120 + Math.random() * 150;
        const shape = i % 3;
        return {
          x: Math.cos(angle) * speed,
          peak: Math.sin(angle) * speed,
          fall: 90 + Math.random() * 120,
          spin: (Math.random() - 0.5) * 900,
          delay: Math.random() * 0.12,
          duration: 1.5 + Math.random() * 0.6,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          w: shape === 0 ? 7 : shape === 1 ? 5 : 3,
          h: shape === 0 ? 11 : shape === 1 ? 5 : 13,
          round: shape === 1,
        };
      }),
    []
  );

  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[18%] z-20">
      {pieces.map((p, i) => (
        <m.span
          key={i}
          className="absolute left-0 top-0 block"
          style={{ width: p.w, height: p.h, backgroundColor: p.color, borderRadius: p.round ? 999 : 1.5 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.6 }}
          animate={{
            x: [0, p.x * 0.75, p.x],
            y: [0, p.peak, p.peak + p.fall],
            rotate: [0, p.spin * 0.5, p.spin],
            opacity: [0, 1, 1, 0],
            scale: [0.6, 1, 1, 0.9],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            x: { duration: p.duration, delay: p.delay, ease: [0.16, 1, 0.3, 1] },
            y: {
              duration: p.duration,
              delay: p.delay,
              times: [0, 0.32, 1],
              ease: [
                [0.2, 0.8, 0.4, 1],
                [0.5, 0, 0.9, 0.6],
              ],
            },
            opacity: { duration: p.duration, delay: p.delay, times: [0, 0.05, 0.75, 1] },
            scale: { duration: p.duration, delay: p.delay, times: [0, 0.1, 0.8, 1] },
            rotate: { duration: p.duration, delay: p.delay, ease: "linear" },
          }}
        />
      ))}
    </span>
  );
}
