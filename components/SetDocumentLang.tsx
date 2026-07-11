"use client";

import { useEffect } from "react";

/** Ajuste l'attribut lang du document selon la section visitée (fr ou en). */
export default function SetDocumentLang({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
