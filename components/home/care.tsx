"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Forklift, Package, Play, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { HomeContent } from "@/lib/home-content";

type VanState = "static" | "armed" | "playing" | "ended";

/**
 * L'arrivée du fourgon. La vidéo se joue une seule fois, d'elle-même, quand la
 * scène est bien à l'écran (elle ne suit pas le défilement), puis s'arrête sur
 * sa dernière image : le fourgon garé, lettré. Sans JavaScript, en mouvement
 * réduit ou si le navigateur refuse la lecture, on voit directement cette
 * dernière image, avec un bouton pour lancer l'arrivée.
 *
 * Les deux images (la cour vide, le fourgon garé) sont rendues par le serveur
 * et passées en enfants ; l'état décide laquelle se voit.
 */
export function CareVideo({
  src,
  srcSquare,
  labels,
  children,
}: {
  src: string;
  srcSquare: string;
  labels: { play: string; replay: string };
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<VanState>("static");
  const [live, setLive] = useState(false);
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = box.current;
    const v = vid.current;
    if (!el || !v) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // même seuil que la mise en page empilée (vidéo carrée)
    const square = matchMedia("(max-width: 860px), (max-aspect-ratio: 4/5)").matches;
    v.muted = true;
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      v.preload = "auto";
      v.src = square ? srcSquare : src;
      v.load();
    };
    loadRef.current = load;
    setLive(true);

    const onEnded = () => setState("ended");
    // fichier introuvable ou illisible : on garde l'image du fourgon garé
    const onError = () => setState("static");
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);

    // On charge la vidéo un écran avant qu'elle n'arrive (en mouvement réduit,
    // seulement si on la demande).
    const near = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          load();
          near.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );

    let seen: IntersectionObserver | null = null;
    if (!reduce) {
      near.observe(el);
      setState("armed");
      seen = new IntersectionObserver(
        (es) => {
          if (!es.some((e) => e.isIntersecting && e.intersectionRatio >= 0.6)) return;
          seen?.disconnect();
          load();
          v.currentTime = 0;
          v.play()
            .then(() => setState("playing"))
            .catch(() => setState("static"));
        },
        { threshold: [0.6] },
      );
      seen.observe(el);
    }

    return () => {
      near.disconnect();
      seen?.disconnect();
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
      v.pause();
    };
  }, [src, srcSquare]);

  const start = () => {
    const v = vid.current;
    if (!v) return;
    loadRef.current();
    v.currentTime = 0;
    v.play()
      .then(() => setState("playing"))
      .catch(() => setState("static"));
  };

  const showButton = live && (state === "static" || state === "ended");

  return (
    <div className="tl-care__media" ref={box} data-state={state}>
      {children}
      <video
        className="tl-care__video"
        ref={vid}
        muted
        playsInline
        preload="none"
        aria-hidden="true"
      />
      {showButton && (
        <button type="button" className="tl-care__replay" onClick={start}>
          {state === "ended" ? (
            <RotateCcw aria-hidden="true" size={16} strokeWidth={2} />
          ) : (
            <Play aria-hidden="true" size={16} strokeWidth={2} />
          )}
          <span>{state === "ended" ? labels.replay : labels.play}</span>
        </button>
      )}
    </div>
  );
}

type Care = HomeContent["care"];
const KEYS = ["simple", "efficace", "paiement"] as const;
type Key = (typeof KEYS)[number];

/**
 * Les trois engagements, en onglets. Sans JavaScript, les trois panneaux sont
 * tous visibles, chacun avec son titre (les onglets sont alors masqués).
 * Chaque panneau a son petit schéma, qui se joue quand on l'ouvre.
 */
export function CareTabs({ care }: { care: Care }) {
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState<Key>("simple");
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setReady(true);
    const el = root.current;
    if (!el) return;
    // Les schémas se jouent quand le bloc arrive à l'écran, pas au chargement.
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let j = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % KEYS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + KEYS.length) % KEYS.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = KEYS.length - 1;
    if (j < 0) return;
    e.preventDefault();
    setActive(KEYS[j]);
    tabs.current[j]?.focus();
  };

  const tabId = (k: Key) => `tl-care-tab-${k}-${uid}`;
  const panelId = (k: Key) => `tl-care-panel-${k}-${uid}`;
  const panel = (k: Key) => ({
    id: panelId(k),
    role: "tabpanel" as const,
    "aria-labelledby": tabId(k),
    tabIndex: 0,
    hidden: ready && active !== k,
    className: "tl-care__panel",
  });

  return (
    <div className={`tl-care__tabs${ready ? " is-ready" : ""}${seen ? " is-seen" : ""}`} ref={root}>
      <div className="tl-care__list" role="tablist" aria-label={care.tabsLabel}>
        {KEYS.map((k, i) => (
          <button
            key={k}
            ref={(b) => {
              tabs.current[i] = b;
            }}
            type="button"
            role="tab"
            id={tabId(k)}
            aria-selected={active === k}
            aria-controls={panelId(k)}
            tabIndex={active === k ? 0 : -1}
            className="tl-care__tab"
            onClick={() => setActive(k)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="tl-care__tabn" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="tl-care__tabl">{care[k].tab}</span>
          </button>
        ))}
      </div>

      <div className="tl-care__panels">
        <div {...panel("simple")}>
          <h3 className="tl-care__pt">{care.simple.title}</h3>
          <p className="tl-care__px">{care.simple.text}</p>
          <div className="tl-care__viz">
            <div className="tl-care__split">
              <div className="tl-care__col tl-care__col--you">
                <p className="tl-care__who">{care.simple.you}</p>
                <ul>
                  {care.simple.youItems.map((t) => (
                    <li key={t}>
                      <span className="tl-care__tick" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="tl-care__col tl-care__col--us">
                <p className="tl-care__who">{care.simple.us}</p>
                <ul>
                  {care.simple.usItems.map((t, i) => (
                    <li key={t} style={{ "--i": i } as React.CSSProperties}>
                      <Check
                        className="tl-care__check"
                        aria-hidden="true"
                        size={16}
                        strokeWidth={2.4}
                      />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div {...panel("efficace")}>
          <h3 className="tl-care__pt">{care.efficace.title}</h3>
          <p className="tl-care__px">{care.efficace.text}</p>
          <div className="tl-care__viz">
            <ol className="tl-care__flow">
              {care.efficace.flow.map((t, i) => {
                const Icon = [Package, Forklift, Truck][i];
                return (
                  <li key={t} style={{ "--i": i } as React.CSSProperties}>
                    <span className="tl-care__node" aria-hidden="true">
                      <Icon size={26} strokeWidth={1.7} />
                    </span>
                    <span className="tl-care__flowl">{t}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div {...panel("paiement")}>
          <h3 className="tl-care__pt">{care.paiement.title}</h3>
          <p className="tl-care__px">{care.paiement.text}</p>
          <div className="tl-care__viz">
            <div className="tl-care__pay">
              <div className="tl-care__bar" aria-hidden="true">
                <span className="tl-care__seg tl-care__seg--a" />
                <span className="tl-care__seg tl-care__seg--b" />
              </div>
              <div className="tl-care__marks">
                <div className="tl-care__mark">
                  <Truck className="tl-care__mi" aria-hidden="true" size={18} strokeWidth={1.8} />
                  <strong>{care.paiement.first}</strong>
                  <span>{care.paiement.firstNote}</span>
                </div>
                <div className="tl-care__mark">
                  <ShieldCheck
                    className="tl-care__mi"
                    aria-hidden="true"
                    size={18}
                    strokeWidth={1.8}
                  />
                  <strong>{care.paiement.second}</strong>
                  <span>{care.paiement.secondNote}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
