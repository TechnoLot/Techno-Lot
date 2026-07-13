"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-night-950">
      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-night-900/40 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <SidebarContent email={email} />
        </aside>

        {/* Contenu principal */}
        <div className="min-w-0 flex-1">
          {/* Barre mobile */}
          <div className="flex items-center justify-between border-b border-white/5 bg-night-950/70 px-4 py-3 backdrop-blur-xl lg:hidden">
            <Link href="/admin" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Techno Lot" width={120} height={72} className="h-8 w-auto" />
              <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Admin
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Ouvrir le menu"
              className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {children}
        </div>
      </div>

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
          >
            <button
              type="button"
              className="flex-1 bg-night-950/70 backdrop-blur"
              onClick={() => setDrawerOpen(false)}
              aria-label="Fermer le menu"
            />
            <motion.aside
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ duration: 0.28, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="flex w-72 flex-col border-l border-white/5 bg-night-900"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Fermer"
                  className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <SidebarContent
                email={email}
                onNavigate={() => setDrawerOpen(false)}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarContent({
  email,
  onNavigate,
}: {
  email: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="hidden px-5 pt-6 lg:block">
        <Link href="/admin" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Techno Lot"
            width={140}
            height={84}
            className="h-9 w-auto"
          />
        </Link>
        <p className="mt-3 font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Tableau de bord
        </p>
      </div>

      <div className="mt-6">
        <AdminNav onNavigate={onNavigate} />
      </div>

      <div className="mt-auto border-t border-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Connecté
        </p>
        <p className="mt-1 truncate text-sm text-white">{email}</p>
        <form action="/admin/auth/signout" method="POST" className="mt-3">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition-colors hover:border-red-500/40 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
