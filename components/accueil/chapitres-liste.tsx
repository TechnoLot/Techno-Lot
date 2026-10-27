"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from "react";
import { Reveal } from "@/components/site/Reveal";
import type { Categorie, CategorieKey } from "./contenu-chapitres";

type Suivi = { x: number; y: number; tx: number; ty: number; raf: number; pret: boolean };

/**
 * Grande liste typographique « Ce que nous rachetons ». Chaque rangée est une
 * bande pleine largeur à pas de ton ; au survol (ou au focus clavier) elle passe
 * au lime et l'image de l'objet apparaît au-dessus, puis suit le curseur.
 * Sur écran tactile ou étroit, la vignette est dans la rangée (chapitres.css).
 */
export function ListeRachat({ items, href }: { items: Categorie[]; href: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const suivi = useRef<Suivi>({ x: 0, y: 0, tx: 0, ty: 0, raf: 0, pret: false });
  const [active, setActive] = useState<CategorieKey | null>(null);

  useEffect(() => {
    const s = suivi.current;
    return () => cancelAnimationFrame(s.raf);
  }, []);

  function rendre(rot: number) {
    const el = floatRef.current;
    const s = suivi.current;
    if (el) el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${rot.toFixed(2)}deg)`;
  }

  function tick() {
    const s = suivi.current;
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    s.x += dx * 0.18;
    s.y += dy * 0.18;
    rendre(Math.max(-7, Math.min(7, dx * 0.06)));
    s.raf = Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4 ? requestAnimationFrame(tick) : 0;
    if (!s.raf) rendre(0);
  }

  /** Vise un point (coordonnées dans la liste) ; saut direct au premier affichage ou en mouvement réduit. */
  function viser(x: number, y: number) {
    const s = suivi.current;
    s.tx = x;
    s.ty = y;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!s.pret || reduce) {
      s.x = x;
      s.y = y;
      s.pret = true;
      rendre(0);
      return;
    }
    if (!s.raf) s.raf = requestAnimationFrame(tick);
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    // En mouvement réduit, l'image reste posée au point d'ancrage de la rangée.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    viser(e.clientX - r.left, e.clientY - r.top);
  }

  /** Point d'ancrage d'une rangée (focus clavier, mouvement réduit) : à droite du nom, centré en hauteur. */
  function ancrer(row: HTMLElement) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    viser(w.width * 0.6, r.top - w.top + r.height / 2);
  }

  function onEnter(key: CategorieKey, e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    setActive(key);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) ancrer(e.currentTarget);
  }

  function onFocus(key: CategorieKey, e: FocusEvent<HTMLElement>) {
    setActive(key);
    ancrer(e.currentTarget);
  }

  function eteindre() {
    setActive(null);
    suivi.current.pret = false;
  }

  return (
    <div ref={wrapRef} className="relative isolate" onPointerMove={onMove} onPointerLeave={eteindre}>
      <ul className="relative">
        {items.map((item, i) => (
          <li key={item.key} className="tl-ch-rangee" style={{ "--pas": i } as CSSProperties}>
            <Link
              href={href}
              onPointerEnter={(e) => onEnter(item.key, e)}
              onFocus={(e) => onFocus(item.key, e)}
              onBlur={eteindre}
              className="group block focus-visible:outline-offset-[-4px]"
            >
              <Reveal
                delay={Math.min(i, 5) * 0.07}
                y={20}
                className="relative mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-5 sm:gap-x-6 sm:px-8 sm:py-7 lg:grid-cols-12 lg:gap-x-6 lg:py-8"
              >
                <span className="flex min-w-0 items-center gap-4 sm:gap-5 lg:col-span-7">
                  <span aria-hidden="true" className="tl-ch-vignette relative h-14 w-14 shrink-0 sm:h-16 sm:w-16">
                    <Image src={item.image} alt="" fill sizes="64px" className="object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[clamp(1.75rem,7vw,4.75rem)] font-bold leading-[0.95] tracking-[-0.01em] text-mist transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-3 group-focus-visible:translate-x-3 motion-reduce:transition-none">
                      {item.name}
                    </span>
                    <span className="mt-1.5 block text-sm leading-snug text-moss lg:hidden">{item.desc}</span>
                  </span>
                </span>
                <span className="hidden text-base leading-relaxed text-moss lg:col-span-4 lg:block">{item.desc}</span>
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center justify-self-end rounded-full bg-ink text-white transition-transform duration-300 group-hover:-rotate-45 group-focus-visible:-rotate-45 group-active:scale-90 motion-reduce:transition-none sm:h-12 sm:w-12 lg:col-span-1"
                >
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
              </Reveal>
            </Link>
          </li>
        ))}
      </ul>

      <div
        ref={floatRef}
        aria-hidden="true"
        data-on={active ? "" : undefined}
        className="tl-ch-flotteur pointer-events-none absolute left-0 top-0 z-[3] h-[clamp(170px,15vw,220px)] w-[clamp(210px,19vw,280px)]"
      >
        {items.map((item) => (
          <Image
            key={item.key}
            src={item.image}
            alt=""
            fill
            sizes="280px"
            className={`object-contain transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
              active === item.key ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
