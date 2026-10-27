"use client";

import { useEffect } from "react";

const SORO_EMBED_BASE =
  "https://app.trysoro.com/api/embed/bd88392c-6733-413d-81de-c32ad9627262";

/**
 * Widget de blog Soro (repli quand la lecture serveur des articles échoue).
 * Le composant rend uniquement le conteneur <div id="soro-blog"> ; le script
 * est injecté côté navigateur via useEffect pour éviter tout écart SSR/CSR.
 * `theme` suit le chapitre où le widget est posé (dark sur bleu nuit, light
 * sur fond clair). L'habillage est dans components/pages/blog.css (#soro-blog).
 */
export default function SoroBlogEmbed({ theme = "dark" }: { theme?: "dark" | "light" }) {
  useEffect(() => {
    if (document.querySelector(`script[data-soro-embed="true"]`)) return;
    const script = document.createElement("script");
    script.src = `${SORO_EMBED_BASE}?theme=${theme}`;
    script.defer = true;
    script.dataset.soroEmbed = "true";
    document.body.appendChild(script);
  }, [theme]);

  return <div id="soro-blog" data-soro-theme={theme} />;
}
