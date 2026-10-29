"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ZERO_COUNTS,
  type NotificationItem,
  type NotificationsPoll,
  type NotificationsSummary,
} from "@/lib/admin/notifications-types";
import {
  choisirFrais,
  choisirSon,
  plusGrandeArrivee,
  plusTard,
  titreAvecCompte,
} from "@/lib/admin/notifications-regles";
import { debloquerAudio, jouerSon } from "./sons";
import NotificationsToasts, { ALERTES_MAX, type Alerte } from "./NotificationsToasts";

/** Lecture des nouveautés, même onglet caché (le navigateur peut ralentir à 1/min). */
const POLL_MS = 30_000;
/** Synchro eBay de fond (le serveur saute si la dernière tentative a moins de 50 s). */
const EBAY_MS = 60_000;
/** Dernière arrivée signalée (son + fenêtre), partagée entre les onglets du navigateur. */
const CLE_ALERTE = "tl_notif_alerte";
/** Préférence de son : « off » = coupé. */
const CLE_SON = "tl_notif_son";

function lireStockage(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrireStockage(cle: string, valeur: string): void {
  try {
    window.localStorage.setItem(cle, valeur);
  } catch {
    /* stockage bloqué : la mémoire de l'onglet suffit */
  }
}

type NotificationsContextValue = {
  /** null tant que la première lecture n'est pas revenue */
  summary: NotificationsSummary | null;
  /** L'onglet Notifications a été vu jusqu'à cet instant : la pastille retombe à zéro. */
  markSeen: (upTo: string) => Promise<void>;
  /** Relit la pastille (après un retrait, par exemple). */
  refresh: () => Promise<void>;
  /** Son des alertes (préférence du navigateur, activé par défaut) */
  sonActif: boolean;
  setSonActif: (v: boolean) => void;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  summary: null,
  markSeen: async () => {},
  refresh: async () => {},
  sonActif: true,
  setSonActif: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

/**
 * Notifications de tout le tableau de bord : pastille du menu, titre de
 * l'onglet, son et fenêtres d'alerte. Lit GET /api/admin/notifications au
 * chargement, à chaque changement de page, chaque 30 s et au retour sur
 * l'onglet ; la synchro eBay tourne en fond quand eBay est connecté.
 *
 * Alertes : la première lecture fixe un repère sans rien signaler ; chaque
 * lecture suivante demande les arrivées depuis ce repère. Seules celles plus
 * récentes que `tl_notif_alerte` sonnent : avec deux onglets admin ouverts,
 * un seul sonne.
 */
export default function NotificationsProvider({
  children,
  ebayConfigured,
}: {
  children: React.ReactNode;
  ebayConfigured: boolean;
}) {
  const pathname = usePathname();
  const [summary, setSummary] = useState<NotificationsSummary | null>(null);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [sonActif, setSonActifState] = useState(true);
  const sonRef = useRef(true);
  // Seule la dernière lecture lancée met à jour la pastille : une réponse
  // partie avant « vu » ne doit pas la rallumer.
  const seq = useRef(0);
  /** Arrivée la plus récente connue (ISO) ; null avant la première lecture. */
  const repere = useRef<string | null>(null);
  /** Dernière arrivée signalée par cet onglet (si le stockage est bloqué). */
  const signale = useRef<string | null>(null);

  useEffect(() => {
    const actif = lireStockage(CLE_SON) !== "off";
    sonRef.current = actif;
    setSonActifState(actif);
  }, []);

  const setSonActif = useCallback((v: boolean) => {
    sonRef.current = v;
    setSonActifState(v);
    ecrireStockage(CLE_SON, v ? "on" : "off");
  }, []);

  // Le son n'est permis qu'après un geste de l'utilisateur sur la page.
  useEffect(() => {
    const debloquer = () => debloquerAudio();
    window.addEventListener("pointerdown", debloquer, true);
    window.addEventListener("keydown", debloquer, true);
    return () => {
      window.removeEventListener("pointerdown", debloquer, true);
      window.removeEventListener("keydown", debloquer, true);
    };
  }, []);

  const alerter = useCallback((nouveaux: NotificationItem[]) => {
    const frais = choisirFrais(nouveaux, plusTard(lireStockage(CLE_ALERTE), signale.current));
    const max = plusGrandeArrivee(frais);
    if (!max) return;
    signale.current = max;
    ecrireStockage(CLE_ALERTE, max);
    if (sonRef.current) jouerSon(choisirSon(frais));
    // Plus récente en dernier (en bas de la pile).
    const ajout = frais
      .slice()
      .reverse()
      .map((item) => ({ id: `${item.key}@${item.arrivedAt}`, item }));
    setAlertes((prev) => {
      const ids = new Set(ajout.map((a) => a.id));
      return [...prev.filter((a) => !ids.has(a.id)), ...ajout].slice(-ALERTES_MAX);
    });
  }, []);

  const fermerAlerte = useCallback((id: string) => {
    setAlertes((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    const mine = ++seq.current;
    const depuis = repere.current;
    try {
      const url = depuis
        ? `/api/admin/notifications?depuis=${encodeURIComponent(depuis)}`
        : "/api/admin/notifications";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationsPoll;
      const nouveaux = Array.isArray(data.nouveaux) ? data.nouveaux : [];
      if (repere.current === null) {
        // Première lecture : repère sans alerte.
        repere.current = data.latest ?? data.now ?? new Date().toISOString();
      } else if (depuis !== null) {
        alerter(nouveaux);
        repere.current = plusTard(repere.current, plusGrandeArrivee(nouveaux));
      }
      if (mine === seq.current) setSummary({ unseen: data.unseen, latest: data.latest });
    } catch {
      /* hors ligne : on garde la dernière valeur */
    }
  }, [alerter]);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  // Synchro eBay de fond : une vente synchronisée est signalée sans attendre la prochaine lecture.
  const lastSync = useRef<string | null>(null);
  const syncEnCours = useRef(false);
  useEffect(() => {
    if (!ebayConfigured) return;
    let actif = true;
    const synchro = async () => {
      if (syncEnCours.current) return;
      syncEnCours.current = true;
      try {
        const r = await fetch("/api/admin/ebay-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auto: true }),
        });
        const data = (await r.json().catch(() => ({}))) as { lastSync?: string | null };
        if (actif && data.lastSync && data.lastSync !== lastSync.current) {
          lastSync.current = data.lastSync;
          void refresh();
        }
      } catch {
        /* les pages eBay affichent les erreurs de synchro */
      } finally {
        syncEnCours.current = false;
      }
    };
    void synchro();
    const id = window.setInterval(() => void synchro(), EBAY_MS);
    return () => {
      actif = false;
      window.clearInterval(id);
    };
  }, [ebayConfigured, refresh]);

  // Titre de l'onglet : « (n) » devant tant qu'il y a des nouveautés. Next
  // réécrit le titre à chaque navigation : on le réapplique, sans boucle
  // (écriture seulement si le titre voulu diffère).
  const nonVues = summary?.unseen.tout ?? 0;
  useEffect(() => {
    const appliquer = () => {
      const voulu = titreAvecCompte(document.title, nonVues);
      if (voulu !== document.title) document.title = voulu;
    };
    appliquer();
    const observer = new MutationObserver(appliquer);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      const sans = titreAvecCompte(document.title, 0);
      if (sans !== document.title) document.title = sans;
    };
  }, [nonVues]);

  const markSeen = useCallback(
    async (upTo: string) => {
      seq.current += 1;
      setSummary((s) => (s ? { ...s, unseen: ZERO_COUNTS } : s));
      try {
        await fetch("/api/admin/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "vu", upTo }),
        });
      } catch {
        /* la prochaine lecture corrigera */
      }
      void refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ summary, markSeen, refresh, sonActif, setSonActif }),
    [summary, markSeen, refresh, sonActif, setSonActif],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationsToasts alertes={alertes} onFermer={fermerAlerte} />
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
