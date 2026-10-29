"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mail } from "lucide-react";
import { WEBMAIL_URL } from "@/lib/admin/config";

type Props = {
  courriel: string;
  variante?: "bouton" | "lien";
  className?: string;
};

const DUREE_COPIEE_MS = 3000;

/** Copie l’adresse dans le presse-papiers ; silencieux si le navigateur refuse. */
async function copierTexte(texte: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texte);
      return;
    }
  } catch {
    // On tente le repli ci-dessous.
  }
  try {
    const zone = document.createElement("textarea");
    zone.value = texte;
    zone.setAttribute("readonly", "");
    zone.style.position = "fixed";
    zone.style.opacity = "0";
    zone.style.pointerEvents = "none";
    document.body.appendChild(zone);
    zone.select();
    document.execCommand("copy");
    document.body.removeChild(zone);
  } catch {
    // Copie impossible : Hostinger s’ouvre quand même.
  }
}

/**
 * Le webmail Hostinger n’accepte aucun lien de nouveau message pré-rempli :
 * on copie l’adresse du client et on ouvre la boîte dans un nouvel onglet.
 */
export default function EcrireHostinger({ courriel, variante = "bouton", className }: Props) {
  const [copiee, setCopiee] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (minuterie.current) clearTimeout(minuterie.current);
    },
    [],
  );

  function copier() {
    void copierTexte(courriel);
    setCopiee(true);
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setCopiee(false), DUREE_COPIEE_MS);
  }

  const titre = `Copie ${courriel} et ouvre ta boîte Hostinger dans un nouvel onglet : colle l’adresse dans « À »`;
  const annonce = (
    <span aria-live="polite" className="sr-only">
      {copiee ? `Adresse ${courriel} copiée` : ""}
    </span>
  );

  if (variante === "lien") {
    return (
      <span className="inline-flex min-w-0 items-baseline gap-1.5">
        <a
          href={WEBMAIL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={copier}
          title={titre}
          className={["admin-focus min-w-0 break-all rounded text-admin-ink hover:underline", className]
            .filter(Boolean)
            .join(" ")}
        >
          {courriel}
        </a>
        {copiee && (
          <span className="text-[12px] text-admin-green" aria-hidden>
            copiée
          </span>
        )}
        {annonce}
      </span>
    );
  }

  return (
    <>
      <a
        href={WEBMAIL_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={copier}
        title={titre}
        className={["admin-btn", className].filter(Boolean).join(" ")}
      >
        {copiee ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Mail className="h-3.5 w-3.5" aria-hidden />
        )}
        {copiee ? "Adresse copiée" : "Écrire"}
      </a>
      {annonce}
    </>
  );
}
