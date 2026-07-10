"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Phone, X } from "lucide-react";
import { navLinks, site } from "@/lib/site";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/5 bg-night-950/80 shadow-card backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="container-site flex h-20 items-center justify-between gap-4">
        <Link
          href="/"
          className="relative z-50 shrink-0"
          aria-label="Techno Lot — Accueil"
        >
          <Image
            src="/logo.png"
            alt="Techno Lot"
            width={150}
            height={90}
            priority
            className="h-14 w-auto"
          />
        </Link>

        {/* Navigation bureau */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "text-accent-bright"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/soumission" className="btn-primary ml-2 !px-5 !py-2.5 !text-xs">
            Soumission
          </Link>
        </nav>

        <div className="hidden items-center xl:flex">
          <a
            href={site.phoneHref}
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-accent/40 hover:text-accent-bright"
          >
            <Phone className="h-4 w-4 text-accent" aria-hidden />
            <span className="hidden 2xl:inline">Contactez-nous :</span>{" "}
            <span className="font-semibold text-white group-hover:text-accent-bright">
              {site.phone}
            </span>
          </a>
        </div>

        {/* Bouton menu mobile */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="relative z-50 rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-white lg:hidden"
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      {/* Menu mobile plein écran */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 flex flex-col bg-night-950/95 backdrop-blur-2xl lg:hidden"
          >
            <nav
              className="container-site flex flex-1 flex-col justify-center gap-2 pt-20"
              aria-label="Navigation mobile"
            >
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.4 }}
                >
                  <Link
                    href={link.href}
                    className="block py-3 font-display text-3xl font-bold text-white transition-colors hover:text-accent-bright"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + navLinks.length * 0.06, duration: 0.4 }}
                className="mt-6 flex flex-col gap-4"
              >
                <Link href="/soumission" className="btn-primary w-full">
                  Soumission
                </Link>
                <a
                  href={site.phoneHref}
                  className="flex items-center justify-center gap-2 text-slate-300"
                >
                  <Phone className="h-4 w-4 text-accent" aria-hidden />
                  Contactez-nous : <span className="font-semibold text-white">{site.phone}</span>
                </a>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
