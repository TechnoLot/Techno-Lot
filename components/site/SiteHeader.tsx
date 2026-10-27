"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PrimaryButtonLink } from "@/components/site/Button";
import { LangSwitcher } from "@/components/site/LangSwitcher";
import { Logo } from "@/components/site/Logo";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

type NavItem = { label: string; href: string };

/**
 * En-tête du site public : barre du haut noire (téléphone, phrase en lime,
 * FR/EN) + barre de navigation noire #0a0a0a (logo horizontal foncé, liens
 * blancs, menu Services déroulant bleu nuit, bouton « Faire une soumission »),
 * menu mobile sombre. Hauteur totale fixe : 112 px (40 + 72) — voir --site-header-h.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const s = t.shell;
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "/";
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ferme les menus à chaque navigation
  useEffect(() => {
    setMobileOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  // Verrouille le défilement quand le menu mobile est ouvert (y compris Lenis)
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    if (mobileOpen) window.__lenis?.stop();
    else window.__lenis?.start();
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Échap ferme les menus
  useEffect(() => {
    if (!mobileOpen && !servicesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setServicesOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, servicesOpen]);

  function openServices() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setServicesOpen(true);
  }

  function scheduleCloseServices() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setServicesOpen(false), 150);
  }

  const lp = (href: string) => localePath(locale, href);
  const isActive = (href: string) => {
    const full = lp(href);
    return href === "/" ? pathname === full : pathname === full || pathname.startsWith(`${full}/`);
  };

  const before: NavItem[] = [
    { label: s.nav.home, href: "/" },
    { label: s.nav.about, href: "/a-propos" },
  ];
  const after: NavItem[] = [
    { label: s.nav.faq, href: "/faq" },
    { label: s.nav.blog, href: "/blog" },
    { label: s.nav.contact, href: "/contact" },
  ];
  const servicesActive = s.services.some((item) => isActive(item.href));

  const linkCls = (active: boolean) =>
    `relative rounded-full px-3 py-2 font-display text-[15px] font-medium transition-colors duration-200 ${
      active ? "text-[#6bd63b]" : "text-white/80 hover:text-white"
    }`;

  const mobileLinkCls = (active: boolean) =>
    `flex items-center justify-between rounded-xl px-4 py-3 font-display text-lg font-semibold transition-colors ${
      active ? "bg-white/[0.06] text-[#6bd63b]" : "text-white hover:bg-white/[0.06]"
    }`;

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      {/* Barre du haut — noire */}
      <div className="bg-black">
        <div className="mx-auto flex h-10 w-full max-w-6xl items-center justify-between gap-4 px-5 text-xs sm:px-8">
          <a
            href={site.phoneHref}
            className="inline-flex shrink-0 items-center gap-2 font-display text-[13px] font-semibold tracking-wide text-white transition-colors hover:text-[#6bd63b]"
          >
            <Phone className="h-3.5 w-3.5 text-[#6bd63b]" aria-hidden="true" />
            {site.phone}
          </a>
          <p className="hidden truncate font-display text-[13px] font-medium tracking-wide text-[#6bd63b] md:block">
            {s.topbar}
          </p>
          <LangSwitcher currentLocale={locale} label={t.header.switcherAria} tone="onDark" />
        </div>
      </div>

      {/* Barre de navigation — noire, un cran sous la barre du haut */}
      <header
        className={`bg-[#0a0a0a] transition-shadow duration-300 ${
          scrolled || mobileOpen ? "shadow-[0_14px_30px_-18px_rgba(0,0,0,0.9)]" : ""
        }`}
      >
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href={lp("/")}
            aria-label={t.header.logoAria}
            className="shrink-0 rounded-md transition-opacity hover:opacity-90"
          >
            <Logo variant="fonce" layout="horizontal" height={40} priority />
          </Link>

          {/* Navigation bureau */}
          <nav aria-label={t.header.navAria} className="hidden items-center gap-0.5 lg:flex">
            {before.map((item) => (
              <Link
                key={item.href}
                href={lp(item.href)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={linkCls(isActive(item.href))}
              >
                {item.label}
              </Link>
            ))}

            {/* Menu déroulant Services */}
            <div
              ref={servicesRef}
              className="relative"
              onMouseEnter={openServices}
              onMouseLeave={scheduleCloseServices}
              onBlur={(e) => {
                if (!servicesRef.current?.contains(e.relatedTarget as Node | null)) setServicesOpen(false);
              }}
            >
              <button
                type="button"
                aria-expanded={servicesOpen}
                aria-controls="site-services-menu"
                onClick={() => setServicesOpen((o) => !o)}
                className={`inline-flex items-center gap-1 ${linkCls(servicesActive)} ${
                  servicesOpen && !servicesActive ? "!text-white" : ""
                }`}
              >
                {s.nav.services}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <AnimatePresence>
                {servicesOpen && (
                  <m.div
                    id="site-services-menu"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: 6 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-1/2 top-full w-[520px] -translate-x-1/2 pt-3"
                  >
                    {/* pt-3 : zone de survol continue entre le bouton et le panneau */}
                    <ul className="grid grid-cols-2 gap-1 rounded-2xl bg-[#0F1628] p-2 shadow-[0_28px_60px_-18px_rgba(0,0,0,0.75)]">
                      {s.services.map((service) => {
                        const current = isActive(service.href);
                        return (
                          <li key={service.href}>
                            <Link
                              href={lp(service.href)}
                              onClick={() => setServicesOpen(false)}
                              aria-current={current ? "page" : undefined}
                              className={`group/item flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 font-display text-[15px] font-medium transition-colors ${
                                current
                                  ? "bg-white/[0.06] text-[#6bd63b]"
                                  : "text-white/85 hover:bg-white/[0.07] hover:text-white"
                              }`}
                            >
                              {service.label}
                              <ArrowUpRight
                                className="h-4 w-4 shrink-0 text-[#6bd63b] opacity-70 transition-transform duration-300 group-hover/item:-translate-y-0.5 group-hover/item:translate-x-0.5 group-hover/item:opacity-100"
                                aria-hidden="true"
                              />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {after.map((item) => (
              <Link
                key={item.href}
                href={lp(item.href)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={linkCls(isActive(item.href))}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <PrimaryButtonLink href={lp("/soumission")} size="sm" className="hidden md:inline-flex">
              {s.cta}
            </PrimaryButtonLink>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="site-mobile-nav"
              aria-label={mobileOpen ? t.header.menuClose : t.header.menuOpen}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-white/30 hover:bg-white/10 active:scale-95 lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile — sombre */}
      <AnimatePresence>
        {mobileOpen && (
          <m.nav
            id="site-mobile-nav"
            aria-label={t.header.navMobileAria}
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            data-lenis-prevent
            className="max-h-[calc(100dvh-var(--site-header-h))] overflow-y-auto bg-[#0F1628] px-3 pb-6 pt-3 shadow-[0_28px_60px_-18px_rgba(0,0,0,0.75)] lg:hidden"
          >
            <div className="mx-auto flex max-w-xl flex-col">
              {before.map((item) => (
                <Link
                  key={item.href}
                  href={lp(item.href)}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={mobileLinkCls(isActive(item.href))}
                >
                  {item.label}
                </Link>
              ))}
              <p className="px-4 pb-1 pt-4 font-display text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                {s.nav.services}
              </p>
              {s.services.map((service) => (
                <Link
                  key={service.href}
                  href={lp(service.href)}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(service.href) ? "page" : undefined}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-[15px] transition-colors ${
                    isActive(service.href)
                      ? "bg-white/[0.06] font-semibold text-[#6bd63b]"
                      : "text-white/85 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {service.label}
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#6bd63b] opacity-70" aria-hidden="true" />
                </Link>
              ))}
              <div className="mt-3" />
              {after.map((item) => (
                <Link
                  key={item.href}
                  href={lp(item.href)}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={mobileLinkCls(isActive(item.href))}
                >
                  {item.label}
                </Link>
              ))}
              <PrimaryButtonLink href={lp("/soumission")} onClick={() => setMobileOpen(false)} className="mt-5 w-full">
                {s.cta}
              </PrimaryButtonLink>
              <a
                href={site.phoneHref}
                className="mt-4 inline-flex items-center justify-center gap-2 py-2 font-display text-base font-semibold text-white transition-colors hover:text-[#6bd63b]"
              >
                <Phone className="h-4 w-4 text-[#6bd63b]" aria-hidden="true" />
                {site.phone}
              </a>
            </div>
          </m.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
