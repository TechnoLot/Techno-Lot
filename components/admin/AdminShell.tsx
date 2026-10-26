"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CornerDownLeft, LogOut, Menu, Search, X } from "lucide-react";
import AdminNav, { ADMIN_ROUTES } from "@/components/admin/AdminNav";
import CalculatriceOverlay, {
  OPEN_CALCULATRICE_EVENT,
} from "@/components/admin/CalculatriceOverlay";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export default function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();

  // Ferme le drawer à chaque changement de page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Échap ferme le drawer + verrouille le défilement derrière.
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

  // ⌘K / Ctrl+K : palette de navigation.
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
      <div className="min-h-screen bg-night-950">
        {/* Halo d'ambiance très discret en haut de la zone de contenu */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_100%_at_60%_0%,rgba(94,203,51,0.06),transparent)]"
        />

        <div className="relative flex">
          {/* Sidebar desktop */}
          <aside className="hidden w-[248px] shrink-0 border-r border-white/[0.06] bg-night-900/60 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
            <SidebarContent email={email} onSearch={openPalette} />
          </aside>

          {/* Contenu principal */}
          <div className="min-w-0 flex-1">
            {/* Barre mobile */}
            <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-night-950/80 px-4 py-2.5 backdrop-blur-xl lg:hidden">
              <Link href="/admin" className="admin-focus flex items-center gap-2 rounded-lg">
                <Image
                  src="/logo.png"
                  alt="Techno Lot"
                  width={120}
                  height={72}
                  className="h-8 w-auto"
                />
                <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Admin
                </span>
              </Link>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={openPalette}
                  aria-label="Rechercher une page"
                  className="admin-btn h-10 w-10 !px-0"
                >
                  <Search className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Ouvrir le menu"
                  aria-expanded={drawerOpen}
                  className="admin-btn h-10 w-10 !px-0"
                >
                  <Menu className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </div>
            </header>

            <main id="admin-main">{children}</main>
          </div>
        </div>

        {/* Overlay calculatrice global — ouvert par événement custom */}
        <CalculatriceOverlay />

        {/* Drawer mobile */}
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
                className="relative flex h-full w-[min(300px,86vw)] flex-col border-r border-white/[0.06] bg-night-900 shadow-admin-pop"
              >
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Fermer le menu"
                  className="admin-btn absolute right-3 top-4 z-10 h-9 w-9 !px-0"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
                <SidebarContent
                  email={email}
                  onNavigate={() => setDrawerOpen(false)}
                  onSearch={openPalette}
                />
              </motion.aside>
              <button
                type="button"
                tabIndex={-1}
                className="flex-1 bg-night-950/70 backdrop-blur-sm"
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

function SidebarContent({
  email,
  onNavigate,
  onSearch,
}: {
  email: string;
  onNavigate?: () => void;
  onSearch: () => void;
}) {
  const initial = (email.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 pb-4 pt-5">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="admin-focus inline-flex items-center gap-2.5 rounded-lg"
        >
          <Image
            src="/logo.png"
            alt="Techno Lot"
            width={140}
            height={84}
            className="h-9 w-auto"
          />
          <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Admin
          </span>
        </Link>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onSearch}
          className="admin-focus flex w-full items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-left text-[13px] text-slate-500 transition-colors hover:border-white/[0.12] hover:text-slate-300"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="flex-1">Aller à…</span>
          <span className="hidden items-center gap-0.5 lg:flex">
            <kbd className="admin-kbd">Ctrl</kbd>
            <kbd className="admin-kbd">K</kbd>
          </span>
        </button>
      </div>

      <div className="mx-5 h-px bg-white/[0.06]" />

      <div className="min-h-0 flex-1 overflow-y-auto py-4 [scrollbar-width:thin]">
        <AdminNav onNavigate={onNavigate} />
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent/15 font-display text-sm font-semibold text-accent-bright ring-1 ring-inset ring-accent/25"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-slate-500">Connecté</p>
            <p className="truncate text-[13px] font-medium text-slate-200" title={email}>
              {email}
            </p>
          </div>
          <form action="/admin/auth/signout" method="POST">
            <button
              type="submit"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="admin-focus inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Palette de navigation (⌘K / Ctrl+K) : filtre les destinations de la
 * sidebar, flèches haut/bas pour choisir, Entrée pour ouvrir.
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
            className="absolute inset-0 bg-night-950/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-night-900 shadow-admin-pop"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
              <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
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
                className="h-12 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <kbd className="admin-kbd">Échap</kbd>
            </div>
            <ul
              id="admin-palette-list"
              ref={listRef}
              role="listbox"
              className="max-h-[50vh] overflow-y-auto p-2"
            >
              {results.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-slate-500">
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
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active ? "bg-white/[0.06] text-white" : "text-slate-300"
                    }`}
                  >
                    <r.icon
                      className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-slate-500"}`}
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{r.label}</span>
                    <span className="text-[11px] text-slate-600">{r.section}</span>
                    {active && (
                      <CornerDownLeft className="h-3.5 w-3.5 text-slate-500" aria-hidden />
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
