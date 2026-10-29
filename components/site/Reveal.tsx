"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { hauteurFenetre, lirePositionDefilement, positionDefilement } from "@/lib/defilement";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Délai en secondes (échelonnement : 0.06–0.09 s par élément) */
  delay?: number;
  /** Décalage vertical de départ en px */
  y?: number;
  /** Conservé pour compatibilité : la révélation se joue toujours une seule fois. */
  once?: boolean;
  style?: CSSProperties;
};

/* Registre partagé : un seul écouteur de défilement (filet de sécurité de
   l'IntersectionObserver, qui peut être suspendu dans certains contextes). */
const pending = new Set<HTMLElement>();
/* Place des blocs en attente dans le document (décalage de départ compris), en cache :
   le filet ne lit le DOM que pour confirmer les blocs que ce cache annonce à l'écran,
   toutes les lectures avant toute écriture. */
const places = new Map<HTMLElement, { top: number; bottom: number }>();
let listening = false;
let last = 0;

function reveal(el: HTMLElement) {
  el.setAttribute("data-in", "");
  pending.delete(el);
  places.delete(el);
}

/** Relit la place des blocs en attente (lectures seulement). */
function measure(els: HTMLElement[]) {
  const sy = lirePositionDefilement();
  const out: { el: HTMLElement; top: number; bottom: number }[] = [];
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    places.set(el, { top: r.top + sy, bottom: r.bottom + sy });
    out.push({ el, top: r.top, bottom: r.bottom });
  });
  return out;
}

function sweep() {
  const y = positionDefilement();
  const limit = hauteurFenetre() * 0.95;
  // Candidats d'après le cache (bloc jamais mesuré : toujours vérifié)
  const candidates = Array.from(pending).filter((el) => {
    const p = places.get(el);
    return !p || (p.top - y < limit && p.bottom - y > 0);
  });
  if (!candidates.length) return;
  // Lectures d'abord, puis écritures : une seule mise en page au plus
  measure(candidates)
    .filter((r) => r.top < limit && r.bottom > 0)
    .forEach((r) => reveal(r.el));
}

function listen() {
  if (listening) return;
  listening = true;
  // Installe d'abord la position partagée : elle est à jour quand nos écouteurs passent
  hauteurFenetre();
  let trailing: ReturnType<typeof setTimeout> | undefined;
  const onScroll = () => {
    if (!pending.size) return;
    clearTimeout(trailing);
    trailing = setTimeout(sweep, 120);
    const now = Date.now();
    if (now - last < 90) return;
    last = now;
    sweep();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      // Largeur ou hauteur changée : les places en cache ne valent plus
      places.clear();
      onScroll();
    },
    { passive: true },
  );
  window.addEventListener("hashchange", sweep);
  // Impression : tout afficher
  window.addEventListener("beforeprint", () => pending.forEach(reveal));
  // Contenu plus haut ou plus bas (images, polices, accordéons) : places relues après la mise en page
  new ResizeObserver(() => {
    if (pending.size) measure(Array.from(pending));
  }).observe(document.body);
}

/* Montage : les blocs montés ensemble sont traités en un seul passage, juste après les
   effets (microtâche, avant l'affichage) : toutes les positions sont lues, puis les blocs
   sous la ligne de flottaison sont armés. Jamais d'alternance lecture/écriture. */
type Mounting = { el: HTMLElement; active: boolean; arm: () => void };
const mounting: Mounting[] = [];

function armMounted() {
  const batch = mounting.splice(0).filter((m) => m.active);
  if (!batch.length) return;
  const limit = window.innerHeight * 0.92;
  // Déjà à l'écran (ou au-dessus) : on ne masque rien.
  batch.filter((m) => m.el.getBoundingClientRect().top >= limit).forEach((m) => m.arm());
}

function queueMount(m: Mounting) {
  if (!mounting.length) queueMicrotask(armMounted);
  mounting.push(m);
}

/**
 * Révélation au défilement : fondu + montée (transform/opacity, CSS .tl-reveal
 * dans app/site.css), une seule fois.
 * Le contenu est VISIBLE au rendu serveur : rien n'est caché si le JavaScript
 * échoue. Après l'hydratation, seul un bloc encore sous la ligne de flottaison
 * est « armé » (masqué hors écran), puis révélé quand il entre dans la vue.
 * Un bloc déjà à l'écran reste tel quel (aucun clignotement, LCP intact).
 * Mouvement réduit : aucun masquage ni déplacement.
 */
export function Reveal({ children, className, delay = 0, y = 28, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let io: IntersectionObserver | undefined;
    const mount: Mounting = {
      el,
      active: true,
      arm: () => {
        el.setAttribute("data-armed", "");
        pending.add(el);
        listen();

        if (typeof IntersectionObserver !== "undefined") {
          io = new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) {
                reveal(el);
                io?.disconnect();
              }
            },
            { rootMargin: "0px 0px -5% 0px", threshold: 0.01 },
          );
          io.observe(el);
        }
      },
    };
    queueMount(mount);
    return () => {
      mount.active = false;
      io?.disconnect();
      pending.delete(el);
      places.delete(el);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`tl-reveal ${className ?? ""}`}
      style={{ ...style, ["--tl-reveal-y" as string]: `${y}px`, ["--tl-reveal-d" as string]: `${delay}s` }}
    >
      {children}
    </div>
  );
}
