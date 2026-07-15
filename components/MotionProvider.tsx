"use client";

import { LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

const loadFeatures = () =>
  import("@/components/motion-features").then((mod) => mod.default);

/**
 * Fournit le moteur d'animation framer-motion en différé (LazyMotion) :
 * les composants utilisent `m.*` au lieu de `motion.*`, et le moteur
 * d'animation est chargé dans un chunk séparé après le rendu initial.
 * `strict` garantit qu'aucun `motion.*` (bundle complet) ne se glisse
 * dans l'arbre public par erreur.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
