"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ZERO_COUNTS, type NotificationsSummary } from "@/lib/admin/notifications-types";

/** Vérification des nouveautés quand l'onglet du navigateur est visible. */
const POLL_MS = 30_000;

type NotificationsContextValue = {
  /** null tant que la première lecture n'est pas revenue */
  summary: NotificationsSummary | null;
  /** L'onglet Notifications a été vu jusqu'à cet instant : la pastille retombe à zéro. */
  markSeen: (upTo: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  summary: null,
  markSeen: async () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

/**
 * Pastille des notifications pour tout le tableau de bord : lit
 * GET /api/admin/notifications au chargement, à chaque changement de page,
 * chaque 30 s (onglet visible) et au retour sur l'onglet.
 */
export default function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [summary, setSummary] = useState<NotificationsSummary | null>(null);
  // Seule la dernière lecture lancée compte : une réponse partie avant
  // « vu » ne doit pas rallumer la pastille.
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationsSummary;
      if (mine === seq.current) setSummary(data);
    } catch {
      /* hors ligne : on garde la dernière valeur */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const markSeen = useCallback(
    async (upTo: string) => {
      seq.current += 1;
      setSummary((s) => (s ? { ...s, unseen: ZERO_COUNTS } : s));
      try {
        await fetch("/api/admin/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upTo }),
        });
      } catch {
        /* la prochaine lecture corrigera */
      }
      refresh();
    },
    [refresh],
  );

  return (
    <NotificationsContext.Provider value={{ summary, markSeen }}>
      {children}
    </NotificationsContext.Provider>
  );
}

/** Pastille ronde du nombre de nouveautés (rien à zéro). */
export function NotificationsCount({
  count,
  tone = "default",
  className = "",
}: {
  count: number;
  /** « onGreen » : sur la ligne active (fond lime) du menu */
  tone?: "default" | "onGreen";
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className={`inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums leading-none ${
        tone === "onGreen" ? "bg-[#0a0a0a] text-[#6bd63b]" : "bg-[#6bd63b] text-[#0a0a0a]"
      } ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
