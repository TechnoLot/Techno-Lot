"use client";

import { ArrowRight, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type PointerEvent } from "react";
import { Counter } from "@/components/site/Counter";
import { localePath, type Locale } from "@/lib/i18n";
import type { ChapitresContenu, Engagement } from "./contenu-chapitres";

/** Couleur de chaque carte : bleu nuit, lime, vert profond (les chapitres de la marque). */
const TEINTES: Record<Engagement["key"], string> = {
  reponse: "eng-carte--nuit",
  ramassage: "eng-carte--lime",
  paiement: "eng-carte--vert",
};

/** Grand chiffre : compteur (sauf texte fixe), unité plus petite, lecture complète pour les lecteurs d'écran. */
function Chiffre({ item, locale }: { item: Engagement; locale: Locale }) {
  const unit = <span className={`eng-unite ${item.unitBefore ? "mr-[0.06em]" : "ml-[0.1em]"}`}>{item.unit}</span>;
  return (
    <span className="eng-chiffre">
      <span className="sr-only">{item.spoken}</span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        {item.unitBefore ? unit : null}
        {item.value !== undefined ? <Counter value={item.value} locale={locale} plain /> : item.text}
        {item.unitBefore ? null : unit}
      </span>
    </span>
  );
}

/** 24 h : le cadran fait le tour d'une journée. */
function Cadran() {
  return (
    <svg viewBox="0 0 48 48" className="eng-cadran" aria-hidden="true">
      <circle cx="24" cy="24" r="19" className="eng-cadran-piste" />
      <circle cx="24" cy="24" r="19" pathLength={100} className="eng-cadran-arc" />
      <line x1="24" y1="24" x2="24" y2="11" className="eng-aiguille" />
      <circle cx="24" cy="24" r="2.6" className="eng-cadran-centre" />
    </svg>
  );
}

/** 0 $ : le camion arrive chez vous, sans frais. */
function Route() {
  return (
    <span className="eng-route" aria-hidden="true">
      <span className="eng-route-ligne" />
      <span className="eng-camion">
        <Truck className="h-7 w-7" strokeWidth={2.1} />
      </span>
    </span>
  );
}

/** 50 % : la première moitié est payée au ramassage, le solde après l'inspection. */
function Barre({ debut, fin }: { debut: string; fin: string }) {
  return (
    <span className="eng-barre" aria-hidden="true">
      <span className="eng-barre-piste">
        <span className="eng-barre-moitie" />
        <span className="eng-barre-solde" />
      </span>
      <span className="eng-barre-libelles">
        <span>{debut}</span>
        <span>{fin}</span>
      </span>
    </span>
  );
}

/**
 * Cartes « Nos engagements » : trois cartes de couleur, cliquables, qui mènent chacune à la
 * page qui détaille la promesse. Chaque carte illustre son engagement par une petite animation
 * (jouée une fois à l'entrée dans l'écran, rejouée au survol) ; avec une souris, la carte
 * s'incline légèrement et une lueur suit le curseur.
 * Rendu serveur = état final (rien de caché sans JavaScript) ; mouvement réduit : immobile.
 */
export function EngagementsCartes({
  items,
  barre,
  locale,
}: {
  items: Engagement[];
  barre: ChapitresContenu["stats"]["barre"];
  locale: Locale;
}) {
  const listeRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const liste = listeRef.current;
    if (!liste || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Déjà à l'écran au chargement : état final, rien n'est rejoué
    if (liste.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    liste.setAttribute("data-arme", "");
    // Chaque carte se joue quand elle entre dans l'écran (empilées sur mobile)
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-vu", "");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.35 },
    );
    liste.querySelectorAll(".eng-item").forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, []);

  /** Inclinaison et lueur : variables CSS posées directement (aucun rendu React par mouvement). */
  const suivre = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    // lueur : décalage (px) depuis sa place par défaut (milieu du bord haut), sur la taille de la carte
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    el.style.setProperty("--eng-dx", `${((x - 0.5) * w).toFixed(1)}px`);
    el.style.setProperty("--eng-dy", `${(y * h).toFixed(1)}px`);
    el.style.setProperty("--eng-rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
    el.style.setProperty("--eng-ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
  };
  const relacher = (e: PointerEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.setProperty("--eng-rx", "0deg");
    e.currentTarget.style.setProperty("--eng-ry", "0deg");
  };

  return (
    <ul ref={listeRef} className="eng-liste grid gap-4 md:grid-cols-3 md:gap-5">
      {items.map((item, i) => (
        <li key={item.key} className="eng-item" style={{ ["--eng-i" as string]: i }}>
          <Link
            href={localePath(locale, item.href)}
            onPointerMove={suivre}
            onPointerLeave={relacher}
            className={`eng-carte ${TEINTES[item.key]}`}
          >
            <span aria-hidden="true" className="eng-lueur" />
            <span className="eng-haut">
              <span className="eng-tete">
                <Chiffre item={item} locale={locale} />
                {item.key === "reponse" && <Cadran />}
              </span>
              {item.key === "ramassage" && <Route />}
              {item.key === "paiement" && <Barre debut={barre.debut} fin={barre.fin} />}
            </span>
            <span className="eng-bas">
              <h3 className="eng-titre">{item.title}</h3>
              <span className="eng-texte">{item.caption}</span>
              <span className="eng-lien">
                {item.lien}
                <ArrowRight className="eng-fleche h-4 w-4" aria-hidden="true" />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
