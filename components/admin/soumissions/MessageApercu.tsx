"use client";

import { useState } from "react";

/** Message d'une soumission : quatre lignes, puis « Voir tout » s'il est plus long. */
export default function MessageApercu({ texte }: { texte: string }) {
  const [ouvert, setOuvert] = useState(false);
  const long = texte.length > 280 || texte.split("\n").length > 4;

  return (
    <div className="mt-3 rounded-xl bg-admin-subtle px-3.5 py-3">
      <p
        className={`whitespace-pre-line text-[14px] leading-relaxed text-admin-ink ${
          long && !ouvert ? "line-clamp-4" : ""
        }`}
      >
        {texte}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          className="admin-focus mt-1.5 rounded-md text-[13px] font-semibold text-admin-green hover:underline"
        >
          {ouvert ? "Réduire" : "Voir tout"}
        </button>
      )}
    </div>
  );
}
