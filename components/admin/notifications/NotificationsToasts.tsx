"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import type { NotificationItem } from "@/lib/admin/notifications-types";
import { titreAlerte } from "@/lib/admin/notifications-regles";
import { PastilleIcone } from "./apparence";

/** Une fenêtre d'alerte (id unique par arrivée). */
export type Alerte = { id: string; item: NotificationItem };

/** Durée d'affichage, en pause au survol ou au focus. */
const DUREE_MS = 8000;
/** Fenêtres visibles au plus. */
export const ALERTES_MAX = 3;

function ligne(item: NotificationItem): string {
  if (item.kind === "vente-ebay") {
    const montant = `${formatMoney(item.total, true)}${item.currency !== "CAD" ? ` ${item.currency}` : ""}`;
    return `${montant} · ${item.title}`;
  }
  return [item.nom, item.entreprise ?? item.ville].filter(Boolean).join(" · ");
}

/**
 * Fenêtres « pop » en bas à droite quand une vente ou une demande arrive
 * (toutes les pages admin). La plus récente est en bas, près du coin.
 */
export default function NotificationsToasts({
  alertes,
  onFermer,
}: {
  alertes: Alerte[];
  onFermer: (id: string) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <div
      role="region"
      aria-label="Nouvelles notifications"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col gap-2 sm:bottom-5 sm:left-auto sm:right-5 sm:w-[360px]"
    >
      <AnimatePresence initial={false}>
        {alertes.slice(-ALERTES_MAX).map((a) => (
          <Fenetre key={a.id} alerte={a} onFermer={onFermer} reduce={reduce} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Fenetre({
  alerte,
  onFermer,
  reduce,
}: {
  alerte: Alerte;
  onFermer: (id: string) => void;
  reduce: boolean;
}) {
  const { item } = alerte;
  const fermerRef = useRef(() => onFermer(alerte.id));
  fermerRef.current = () => onFermer(alerte.id);
  const fermer = useCallback(() => fermerRef.current(), []);

  // Minuterie de fermeture, mise en pause au survol ou au focus.
  const restant = useRef(DUREE_MS);
  const depart = useRef(0);
  const minuterie = useRef<number | null>(null);
  const survol = useRef(false);
  const focus = useRef(false);

  const lancer = useCallback(() => {
    if (minuterie.current !== null) return;
    depart.current = Date.now();
    minuterie.current = window.setTimeout(() => fermerRef.current(), Math.max(0, restant.current));
  }, []);
  const pause = useCallback(() => {
    if (minuterie.current === null) return;
    window.clearTimeout(minuterie.current);
    minuterie.current = null;
    restant.current -= Date.now() - depart.current;
  }, []);
  const suivre = useCallback(() => {
    if (survol.current || focus.current) pause();
    else lancer();
  }, [lancer, pause]);

  useEffect(() => {
    lancer();
    return () => {
      if (minuterie.current !== null) window.clearTimeout(minuterie.current);
      minuterie.current = null;
    };
  }, [lancer]);

  const texte = ligne(item);

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={{ duration: reduce ? 0.15 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => {
        survol.current = true;
        suivre();
      }}
      onMouseLeave={() => {
        survol.current = false;
        suivre();
      }}
      onFocus={() => {
        focus.current = true;
        suivre();
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        focus.current = false;
        suivre();
      }}
      className="pointer-events-auto relative rounded-2xl border border-admin-line bg-admin-card p-3.5 pr-10 shadow-[0_16px_40px_-16px_rgba(10,10,10,0.35)]"
    >
      <div className="flex gap-3">
        <PastilleIcone item={item} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-admin-ink">
            {/* Toute la carte mène au fil (lien étiré sur la carte). */}
            <Link
              href="/admin/notifications"
              onClick={fermer}
              className="admin-focus rounded before:absolute before:inset-0 before:rounded-2xl before:content-['']"
            >
              {titreAlerte(item)}
            </Link>
          </p>
          {texte && <p className="truncate text-[13px] text-admin-ink">{texte}</p>}
          <p className="text-[12px] text-admin-muted">à l’instant</p>
        </div>
      </div>
      <button
        type="button"
        onClick={fermer}
        aria-label="Fermer"
        className="admin-focus absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-admin-muted transition-colors hover:bg-admin-page hover:text-admin-ink"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  );
}
