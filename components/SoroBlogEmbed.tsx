"use client";

import { useEffect } from "react";

const SORO_EMBED_URL =
  "https://app.trysoro.com/api/embed/bd88392c-6733-413d-81de-c32ad9627262";

/**
 * Widget de blog Soro : le composant rend uniquement le conteneur
 * <div id="soro-blog"> — le script est injecté côté navigateur via
 * useEffect pour éviter tout écart SSR/CSR (React se plaint quand une
 * balise <script> apparaît dans le rendu serveur).
 *
 * Équivalent au snippet officiel Soro `<script src="…" defer>` : chargé
 * après le HTML, exécute avant DOMContentLoaded. Idempotent en cas de
 * remontage du composant.
 */
export default function SoroBlogEmbed() {
  useEffect(() => {
    if (document.querySelector(`script[data-soro-embed="true"]`)) return;
    const script = document.createElement("script");
    script.src = SORO_EMBED_URL;
    script.defer = true;
    script.dataset.soroEmbed = "true";
    document.body.appendChild(script);
  }, []);

  return <div id="soro-blog" />;
}
