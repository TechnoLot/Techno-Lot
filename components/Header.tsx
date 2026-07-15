"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { Menu, Phone, X } from "lucide-react";
import { site } from "@/lib/site";
import {
  getDict,
  localePath,
  switchLocalePath,
  type Locale,
} from "@/lib/i18n";

/** Sélecteur de langue FR | EN (pilule segmentée). */
function LanguageSwitcher({
  locale,
  ariaLabel,
}: {
  locale: Locale;
  ariaLabel: string;
}) {
  const pathname = usePathname();
  return (
    <div
      aria-label={ariaLabel}
      className="flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1 font-display text-xs font-semibold"
    >
      {(["fr", "en"] as Locale[]).map((l) => (
        <Link
          key={l}
          href={switchLocalePath(pathname ?? "/", l)}
          aria-current={l === locale ? "true" : undefined}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wider transition-colors ${
            l === locale
              ? "bg-accent/15 text-accent-bright"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}

export default function Header({ locale }: { locale: Locale }) {
  const t = getDict(locale);
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

  const homeHref = localePath(locale, "/");

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
          href={homeHref}
          className="relative z-50 shrink-0"
          aria-label={t.header.logoAria}
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
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label={t.header.navAria}
        >
          {t.nav.map((link) => {
            const href = localePath(locale, link.href);
            const active =
              link.href === "/"
                ? pathname === href
                : pathname?.startsWith(href);
            return (
              <Link
                key={link.href}
                href={href}
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
          <Link
            href={localePath(locale, "/soumission")}
            className="btn-primary ml-2 !px-5 !py-2.5 !text-xs"
          >
            {t.header.quoteButton}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={site.phoneHref}
            className="group hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-accent/40 hover:text-accent-bright xl:flex"
          >
            <Phone className="h-4 w-4 text-accent" aria-hidden />
            <span className="hidden 2xl:inline">{t.header.callPrefix}</span>{" "}
            <span className="font-semibold text-white group-hover:text-accent-bright">
              {site.phone}
            </span>
          </a>

          {/* Sélecteur de langue — toujours visible en haut à droite */}
          <div className="relative z-50">
            <LanguageSwitcher
              locale={locale}
              ariaLabel={t.header.switcherAria}
            />
          </div>

          {/* Bouton menu mobile */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t.header.menuClose : t.header.menuOpen}
            className="relative z-50 rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-white lg:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile plein écran */}
      <AnimatePresence>
        {menuOpen && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 flex flex-col bg-night-950/95 backdrop-blur-2xl lg:hidden"
          >
            <nav
              className="container-site flex flex-1 flex-col justify-center gap-2 pt-20"
              aria-label={t.header.navMobileAria}
            >
              {t.nav.map((link, i) => (
                <m.div
                  key={link.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.4 }}
                >
                  <Link
                    href={localePath(locale, link.href)}
                    className="block py-3 font-display text-3xl font-bold text-white transition-colors hover:text-accent-bright"
                  >
                    {link.label}
                  </Link>
                </m.div>
              ))}
              <m.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.08 + t.nav.length * 0.06,
                  duration: 0.4,
                }}
                className="mt-6 flex flex-col gap-4"
              >
                <Link
                  href={localePath(locale, "/soumission")}
                  className="btn-primary w-full"
                >
                  {t.header.quoteButton}
                </Link>
                <a
                  href={site.phoneHref}
                  className="flex items-center justify-center gap-2 text-slate-300"
                >
                  <Phone className="h-4 w-4 text-accent" aria-hidden />
                  {t.header.callPrefix}{" "}
                  <span className="font-semibold text-white">
                    {site.phone}
                  </span>
                </a>
              </m.div>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
