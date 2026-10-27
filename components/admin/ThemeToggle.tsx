"use client";

import { useId, useRef } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminTheme = "light" | "dark";

/** Témoin lu par app/admin/(dashboard)/layout.tsx au chargement (pas de flash). */
export function writeAdminThemeCookie(theme: AdminTheme) {
  // Efface un éventuel ancien témoin posé sur path=/ (il masquerait celui-ci).
  document.cookie = "tl_admin_theme=; path=/; max-age=0; SameSite=Lax";
  document.cookie = `tl_admin_theme=${theme}; path=/admin; max-age=31536000; SameSite=Lax`;
}

const OPTIONS: { value: AdminTheme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
];

/**
 * Interrupteur Clair / Sombre de la barre latérale (fond bleu nuit dans les
 * deux thèmes). Groupe radio : flèches gauche/droite pour changer.
 */
export default function ThemeToggle({
  theme,
  onChange,
}: {
  theme: AdminTheme;
  onChange: (theme: AdminTheme) => void;
}) {
  const layoutId = `theme-pill-${useId()}`;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = OPTIONS[(i + 1) % OPTIONS.length];
    onChange(next.value);
    refs.current[(i + 1) % OPTIONS.length]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Thème de l'affichage"
      className="grid grid-cols-2 gap-1 rounded-[12px] border border-white/10 bg-white/[0.04] p-1"
    >
      {OPTIONS.map((o, i) => {
        const active = o.value === theme;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`nav-focus relative flex h-9 items-center justify-center gap-2 rounded-[9px] text-[13.5px] font-medium transition-colors duration-150 ${
              active ? "text-white" : "text-[#94a3b8] hover:text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-[9px] bg-white/[0.12] ring-1 ring-inset ring-white/15"
              />
            )}
            <o.icon
              className={`relative h-4 w-4 ${active ? "text-[#6bd63b]" : ""}`}
              aria-hidden
            />
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
