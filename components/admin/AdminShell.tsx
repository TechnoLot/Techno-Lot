"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CornerDownLeft,
  LogOut,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import AdminNav, { ADMIN_ROUTES } from "@/components/admin/AdminNav";
import ThemeToggle, { writeAdminThemeCookie, type AdminTheme } from "@/components/admin/ThemeToggle";
import { getAdminPrenom } from "@/app/admin/(dashboard)/compte/actions";
import { ADMIN_PRENOM_EVENT, resolvePrenom } from "@/lib/admin/config";
import CalculatriceOverlay, {
  OPEN_CALCULATRICE_EVENT,
} from "@/components/admin/CalculatriceOverlay";
import { Logo } from "@/components/site/Logo";
import {
  NotificationsCount,
  useNotifications,
} from "@/components/admin/notifications/NotificationsProvider";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

/**
 * Coque du tableau de bord : barre latérale bleu nuit (dans les deux thèmes),
 * contenu en couleurs par rôle (clair ou sombre selon data-admin-theme),
 * tiroir mobile et recherche rapide (Ctrl K). La pastille des notifications
 * vient de NotificationsProvider (layout du tableau de bord).
 */
export default function AdminShell({
  email,
  theme = "light",
  configurationIncomplete = [],
  children,
}: {
  email: string;
  /** Thème lu côté serveur dans le témoin tl_admin_theme (pas de flash au chargement) */
  theme?: "light" | "dark";
  /** NOMS des variables de sécurité manquantes sur le serveur (lib/securite/env.ts) ; bandeau si non vide */
  configurationIncomplete?: string[];
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();

  // Thème : valeur serveur (témoin) au chargement, puis bascule instantanée
  // côté client — data-admin-theme change sur la racine, sans rechargement.
  const [currentTheme, setCurrentTheme] = useState<AdminTheme>(theme);
  useEffect(() => setCurrentTheme(theme), [theme]);
  const changeTheme = useCallback((next: AdminTheme) => {
    setCurrentTheme(next);
    writeAdminThemeCookie(next);
  }, []);

  // Prénom : table par défaut tout de suite, puis user_metadata.prenom s'il existe.
  const [prenom, setPrenom] = useState<string | null>(() => resolvePrenom(email));
  useEffect(() => {
    let alive = true;
    setPrenom(resolvePrenom(email));
    getAdminPrenom()
      .then((p) => {
        if (alive && p) setPrenom(p);
      })
      .catch(() => {});
    const onUpdate = (e: Event) => {
      const p = (e as CustomEvent<string>).detail;
      if (typeof p === "string" && p.trim()) setPrenom(p.trim());
    };
    window.addEventListener(ADMIN_PRENOM_EVENT, onUpdate);
    return () => {
      alive = false;
      window.removeEventListener(ADMIN_PRENOM_EVENT, onUpdate);
    };
  }, [email]);

  // Ferme le tiroir à chaque changement de page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Échap ferme le tiroir + verrouille le défilement derrière.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  // Ctrl+K / ⌘K : palette de navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDrawerOpen(false);
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openPalette = useCallback(() => {
    setDrawerOpen(false);
    setPaletteOpen(true);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div data-admin-theme={currentTheme} className="min-h-screen bg-admin-page text-admin-ink">
        <div className="relative flex">
          {/* Barre latérale (ordinateur) */}
          <aside className="relative hidden w-[264px] shrink-0 overflow-hidden bg-[#0a0f1c] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
            <SidebarContent
              email={email}
              prenom={prenom}
              theme={currentTheme}
              onThemeChange={changeTheme}
              onSearch={openPalette}
            />
          </aside>

          {/* Contenu principal */}
          <div className="min-w-0 flex-1">
            {/* Barre mobile */}
            <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#0a0f1c] px-4 py-2 lg:hidden">
              <Link href="/admin" className="nav-focus flex items-center rounded-lg">
                <Logo variant="fonce" layout="horizontal" height={28} />
              </Link>
              <div className="flex items-center gap-1">
                <MobileNotificationsLink />
                <button
                  type="button"
                  onClick={openPalette}
                  aria-label="Rechercher une page"
                  className="nav-focus inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-[#cbd5e1] transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <Search className="h-[18px] w-[18px]" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Ouvrir le menu"
                  aria-expanded={drawerOpen}
                  className="nav-focus inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-[#cbd5e1] transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </header>

            <main id="admin-main">
              {configurationIncomplete.length > 0 && (
                <BandeauConfiguration noms={configurationIncomplete} />
              )}
              {children}
            </main>
          </div>
        </div>

        {/* Overlay calculatrice global — ouvert par événement custom */}
        <CalculatriceOverlay />

        {/* Tiroir mobile */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
            >
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.28, ease: EASE }}
                className="relative flex h-full w-[min(304px,86vw)] flex-col overflow-hidden bg-[#0a0f1c]"
              >
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Fermer le menu"
                  className="nav-focus absolute right-3 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-[#cbd5e1] transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
                <SidebarContent
                  email={email}
                  prenom={prenom}
                  theme={currentTheme}
                  onThemeChange={changeTheme}
                  onNavigate={() => setDrawerOpen(false)}
                  onSearch={openPalette}
                />
              </motion.aside>
              <button
                type="button"
                tabIndex={-1}
                className="flex-1 bg-[#0a0f1c]/50"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </MotionConfig>
  );
}

/**
 * Bandeau en haut de toutes les pages admin quand des variables de sécurité
 * manquent chez l'hébergeur (noms seulement, jamais de valeur).
 */
function BandeauConfiguration({ noms }: { noms: string[] }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-4 sm:px-8 lg:px-10">
      <p
        role="alert"
        className="flex gap-2 rounded-2xl border border-admin-tint-amber-line bg-admin-tint-amber px-4 py-3 text-sm text-admin-warning"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 break-words">
          Configuration de sécurité incomplète sur le serveur : {noms.join(", ")}. Les limites de
          débit, le journal de sécurité ou les actions admin peuvent être désactivés. Ajoute ces
          variables chez l&apos;hébergeur puis redéploie.
        </span>
      </p>
    </div>
  );
}

/** Cloche de la barre mobile (le menu est replié) : mène aux notifications, avec la pastille. */
function MobileNotificationsLink() {
  const unseen = useNotifications().summary?.unseen.tout ?? 0;
  return (
    <Link
      href="/admin/notifications"
      aria-label={
        unseen > 0 ? `Notifications (${unseen} nouvelle${unseen > 1 ? "s" : ""})` : "Notifications"
      }
      className="nav-focus relative inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-[#cbd5e1] transition-colors hover:bg-white/[0.08] hover:text-white"
    >
      <Bell className="h-[18px] w-[18px]" aria-hidden />
      <NotificationsCount
        count={unseen}
        className="absolute right-0.5 top-1 !h-[18px] !min-w-[18px] !px-1 !text-[10px]"
      />
    </Link>
  );
}

function SidebarContent({
  email,
  prenom,
  theme,
  onThemeChange,
  onNavigate,
  onSearch,
}: {
  email: string;
  prenom: string | null;
  theme: AdminTheme;
  onThemeChange: (theme: AdminTheme) => void;
  onNavigate?: () => void;
  onSearch: () => void;
}) {
  const pathname = usePathname() ?? "";
  const compteActive = pathname === "/admin/compte" || pathname.startsWith("/admin/compte/");
  const displayName = prenom ?? (email.split("@")[0] || "Admin");
  const initial = displayName.charAt(0).toLocaleUpperCase("fr-CA");

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Lueur verte de la marque, très douce, dans le coin supérieur */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(107,214,59,0.22),rgba(107,214,59,0.06)_55%,transparent)]"
      />

      <div className="relative px-5 pb-5 pt-7">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="nav-focus inline-flex items-center rounded-lg"
        >
          <Logo variant="fonce" layout="horizontal" height={38} priority />
        </Link>
      </div>

      <div className="relative px-3 pb-4">
        <button
          type="button"
          onClick={onSearch}
          className="nav-focus flex h-11 w-full items-center gap-2.5 rounded-[12px] border border-white/10 bg-white/[0.04] px-3 text-left text-[14px] text-[#94a3b8] transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-[#cbd5e1]"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="flex-1">Aller à…</span>
          <span className="hidden items-center gap-0.5 lg:flex">
            <kbd className="admin-kbd">Ctrl</kbd>
            <kbd className="admin-kbd">K</kbd>
          </span>
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-color:#1f2c4d_transparent] [scrollbar-width:thin]">
        <AdminNav onNavigate={onNavigate} />
      </div>

      <div className="relative flex flex-col gap-2.5 border-t border-white/10 px-3 pb-4 pt-3">
        {/* Carte utilisateur */}
        <div className="flex items-center gap-3 rounded-[12px] px-1.5 py-1">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6bd63b] font-display text-[16px] font-semibold text-[#0a0a0a] shadow-[0_0_0_3px_rgba(107,214,59,0.18)]"
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-white">
              {displayName}
            </span>
            <span className="block truncate text-[12px] text-[#94a3b8]" title={email}>
              {email}
            </span>
          </span>
        </div>

        <ThemeToggle theme={theme} onChange={onThemeChange} />

        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href="/admin/compte"
            onClick={onNavigate}
            aria-current={compteActive ? "page" : undefined}
            className={`nav-focus flex h-10 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-medium transition-colors ${
              compteActive
                ? "bg-[#6bd63b] text-[#0a0a0a]"
                : "text-[#cbd5e1] hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <UserRound
              className={`h-4 w-4 shrink-0 ${compteActive ? "text-[#0a0a0a]" : "text-[#94a3b8]"}`}
              aria-hidden
            />
            Mon compte
          </Link>
          <form action="/admin/auth/signout" method="POST">
            <button
              type="submit"
              className="nav-focus flex h-10 w-full items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-medium text-[#cbd5e1] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="h-4 w-4 shrink-0 text-[#94a3b8]" aria-hidden />
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Palette de navigation (Ctrl+K) : filtre les destinations du menu,
 * flèches haut/bas pour choisir, Entrée pour ouvrir.
 */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const q = norm(query.trim());
    if (!q) return ADMIN_ROUTES;
    return ADMIN_ROUTES.filter((r) => norm(`${r.label} ${r.section}`).includes(q));
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function go(i: number) {
    const r = results[i];
    if (!r) return;
    onClose();
    if (r.action === "open-calculatrice") {
      window.dispatchEvent(new Event(OPEN_CALCULATRICE_EVENT));
    } else {
      router.push(r.href);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(index);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Aller à une page"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer"
            onClick={onClose}
            className="absolute inset-0 bg-[#0a0f1c]/50"
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-admin-line bg-admin-card shadow-[0_24px_64px_-24px_rgba(10,15,28,0.35)]"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-admin-line-soft px-4">
              <Search className="h-4 w-4 shrink-0 text-admin-muted" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Aller à une page…"
                aria-label="Rechercher une page"
                aria-controls="admin-palette-list"
                aria-activedescendant={results[index] ? `palette-opt-${index}` : undefined}
                role="combobox"
                aria-expanded="true"
                className="h-12 w-full bg-transparent text-sm text-admin-ink placeholder:text-admin-faint focus:outline-none"
              />
              <kbd className="inline-flex h-5 items-center rounded-md border border-admin-line-strong bg-admin-page px-1.5 font-sans text-[10px] font-medium text-admin-muted">
                Échap
              </kbd>
            </div>
            <ul
              id="admin-palette-list"
              ref={listRef}
              role="listbox"
              className="max-h-[50vh] overflow-y-auto p-2"
            >
              {results.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-admin-muted">
                  Aucune page ne correspond à « {query} ».
                </li>
              )}
              {results.map((r, i) => {
                const active = i === index;
                return (
                  <li
                    key={r.href}
                    id={`palette-opt-${i}`}
                    data-idx={i}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => go(i)}
                    className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-admin-ink transition-colors ${
                      active ? "bg-admin-tint-green" : ""
                    }`}
                  >
                    <r.icon
                      className={`h-4 w-4 shrink-0 ${active ? "text-admin-green" : "text-admin-muted"}`}
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{r.label}</span>
                    <span className="text-[11px] text-admin-muted">{r.section}</span>
                    {active && (
                      <CornerDownLeft className="h-3.5 w-3.5 text-admin-muted" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
