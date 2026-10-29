"use client";

import { ArrowUpRight, ChevronDown, Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PrimaryButtonLink } from "@/components/site/Button";
import { LangSwitcher } from "@/components/site/LangSwitcher";
import { Logo } from "@/components/site/Logo";
import { getDict, localePath, type Dict, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";
import { abonnerDefilement, lirePositionDefilement } from "@/lib/defilement";

type NavItem = { label: string; href: string };

/** En dessous de cette position (px), l'en-tête reste toujours affiché. */
const TOUJOURS_VISIBLE = 140;
/** Déplacement minimal (px) avant de cacher ou de réafficher l'en-tête. */
const SEUIL = 6;

/**
 * Liens du menu avant et après « Services » (ordinateur et mobile).
 * Tous les liens du menu sont en préchargement complet (`prefetch`) : dans Next 14.2, la page
 * préchargée reste réutilisable 5 minutes au lieu de 30 secondes en mode automatique.
 */
function liensMenu(s: Dict["shell"]): { before: NavItem[]; after: NavItem[] } {
  return {
    before: [
      { label: s.nav.home, href: "/" },
      { label: s.nav.about, href: "/a-propos" },
    ],
    after: [
      { label: s.nav.faq, href: "/faq" },
      { label: s.nav.blog, href: "/blog" },
      { label: s.nav.contact, href: "/contact" },
    ],
  };
}

function estActif(locale: Locale, pathname: string, href: string) {
  const full = localePath(locale, href);
  return href === "/" ? pathname === full : pathname === full || pathname.startsWith(`${full}/`);
}

/** Préférence « réduire les animations » (équivalent de useReducedMotion, lu au moment voulu). */
const mouvementReduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Entrée et sortie d'un menu animées en CSS (remplace AnimatePresence de framer-motion) :
 * `affiche` reste vrai pendant la sortie. L'élément (ref) porte ses transitions en classes :
 * style de départ sans `data-etat`, puis `data-etat="ouvert"`, puis `data-etat="sortie"`
 * jusqu'à la fin de la transition. `data-etat` est posé directement dans le DOM : aucun rendu
 * React de plus. Mouvement réduit : apparition et disparition immédiates, comme avant.
 */
function useApparition<T extends HTMLElement>(ouvert: boolean, duree: number) {
  const ref = useRef<T>(null);
  const [affiche, setAffiche] = useState(ouvert);
  if (ouvert && !affiche) setAffiche(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (ouvert) {
      // Le style de départ doit être calculé avant « ouvert » pour que la transition parte de lui
      // (lecture de style seulement, pas de mise en page)
      if (!el.dataset.etat) void getComputedStyle(el).opacity;
      el.dataset.etat = "ouvert";
      return;
    }
    if (!affiche) return;
    const fin = () => {
      delete el.dataset.etat;
      setAffiche(false);
    };
    if (mouvementReduit()) {
      fin();
      return;
    }
    el.dataset.etat = "sortie";
    const onFin = (e: TransitionEvent) => {
      if (e.target === el) fin();
    };
    el.addEventListener("transitionend", onFin);
    // Filet de sécurité si transitionend ne vient pas (onglet caché, transition interrompue)
    const t = setTimeout(fin, duree + 50);
    return () => {
      el.removeEventListener("transitionend", onFin);
      clearTimeout(t);
    };
  }, [ouvert, affiche, duree]);

  return { ref, affiche };
}

/**
 * Contenu du menu mobile, mémoïsé : monté une fois (masqué) puis laissé tel quel. Ni le
 * défilement ni l'ouverture du menu ne le refont : seul le <nav> qui l'entoure change.
 */
const LiensMobiles = memo(function LiensMobiles({
  locale,
  s,
  pathname,
  fermer,
}: {
  locale: Locale;
  s: Dict["shell"];
  pathname: string;
  fermer: () => void;
}) {
  const lp = (href: string) => localePath(locale, href);
  const isActive = (href: string) => estActif(locale, pathname, href);
  const { before, after } = liensMenu(s);

  const mobileLinkCls = (active: boolean) =>
    `flex items-center justify-between rounded-xl px-4 py-3 font-display text-lg font-semibold transition-colors ${
      active ? "bg-white/[0.06] text-[#6bd63b]" : "text-white hover:bg-white/[0.06]"
    }`;

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      {before.map((item) => (
        <Link
          key={item.href}
          href={lp(item.href)}
          prefetch
          onClick={fermer}
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
          prefetch
          onClick={fermer}
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
          prefetch
          onClick={fermer}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={mobileLinkCls(isActive(item.href))}
        >
          {item.label}
        </Link>
      ))}
      <PrimaryButtonLink href={lp("/soumission")} onClick={fermer} className="mt-5 w-full">
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
  );
});

/**
 * En-tête du site public : barre du haut noire (téléphone, phrase en lime,
 * FR/EN) + barre de navigation noire #0a0a0a (logo horizontal foncé, liens
 * blancs, menu Services déroulant bleu nuit, bouton « Faire une soumission »),
 * menu mobile sombre. Hauteur totale fixe : 112 px (40 + 72) — voir --site-header-h.
 * Sur ordinateur (≥ 1024 px), il reste toujours affiché. Sur mobile et tablette
 * (< 1024 px), il glisse hors de l'écran quand on descend et revient dès qu'on
 * remonte un peu ; il reste affiché en haut de page, menu ouvert ou focus clavier dedans
 * (:focus-within, sans rendu React).
 * Les deux menus s'animent en CSS (useApparition) : framer-motion n'est plus chargé pour eux.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const s = t.shell;
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Menu mobile monté (masqué) d'avance, à l'inactivité : son ouverture ne crée plus rien. */
  const [menuPret, setMenuPret] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const panneau = useApparition<HTMLDivElement>(servicesOpen, 200);
  const menuMobile = useApparition<HTMLElement>(mobileOpen, 220);

  useEffect(() => {
    let lastY = Math.max(0, lirePositionDefilement());
    const bureau = window.matchMedia("(min-width: 1024px)");
    // Appelé une fois par image avec la position partagée (lib/defilement) : aucune lecture du DOM
    const update = (pos: number) => {
      const y = Math.max(0, pos);
      setScrolled(y > 24);
      if (bureau.matches || y < TOUJOURS_VISIBLE) {
        setHidden(false);
        lastY = y;
        return;
      }
      // Les petits écarts s'accumulent jusqu'au seuil (défilement lissé, tremblements du tactile)
      const dy = y - lastY;
      if (Math.abs(dy) < SEUIL) return;
      setHidden(dy > 0);
      lastY = y;
    };
    // Passage à la largeur ordinateur : réaffiche l'en-tête s'il était caché
    const onBureau = () => {
      if (bureau.matches) setHidden(false);
    };
    update(lastY);
    const desabonner = abonnerDefilement(update);
    bureau.addEventListener("change", onBureau);
    return () => {
      desabonner();
      bureau.removeEventListener("change", onBureau);
    };
  }, []);

  // À l'inactivité : sur ordinateur, précharge les 4 pages « Services » (le panneau ne monte ses
  // liens qu'à l'ouverture : le 1er clic ne paie plus leur préchargement) ; sur mobile et
  // tablette, monte le menu mobile masqué.
  useEffect(() => {
    const tache = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        for (const service of s.services) router.prefetch(localePath(locale, service.href));
      } else {
        setMenuPret(true);
      }
    };
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idleId = hasIdle ? window.requestIdleCallback(tache, { timeout: 1200 }) : window.setTimeout(tache, 300);
    return () => {
      if (hasIdle) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, [locale, router, s.services]);

  const hide = hidden && !mobileOpen && !servicesOpen;

  // Ferme les menus à chaque navigation
  useEffect(() => {
    setMobileOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  // Verrouille le défilement quand le menu mobile est ouvert (y compris Lenis). Appliqué juste
  // après l'image qui affiche le menu, hors de la tâche du clic : `overflow` refait la mise en
  // page de toute la page et Lenis relit la position de défilement.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => {
      t = setTimeout(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        if (mobileOpen) window.__lenis?.stop();
        else window.__lenis?.start();
      }, 0);
    });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [mobileOpen]);
  useEffect(
    () => () => {
      document.body.style.overflow = "";
    },
    [],
  );

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

  const fermerMobile = useCallback(() => setMobileOpen(false), []);

  function openServices() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setServicesOpen(true);
  }

  function scheduleCloseServices() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setServicesOpen(false), 150);
  }

  const lp = (href: string) => localePath(locale, href);
  const isActive = (href: string) => estActif(locale, pathname, href);

  const { before, after } = liensMenu(s);
  const servicesActive = s.services.some((item) => isActive(item.href));

  const linkCls = (active: boolean) =>
    `relative rounded-full px-3 py-2 font-display text-[15px] font-medium transition-colors duration-200 ${
      active ? "text-[#6bd63b]" : "text-white/80 hover:text-white"
    }`;

  // Ombre de la barre : défilement (en-tête affiché) ou menu mobile ouvert ; en-tête caché mais
  // réaffiché par le focus clavier : par CSS (classes écrites en entier pour Tailwind)
  const ombre =
    (scrolled && !hide) || mobileOpen
      ? "shadow-[0_14px_30px_-18px_rgba(0,0,0,0.9)]"
      : scrolled
        ? "group-focus-within/entete:shadow-[0_14px_30px_-18px_rgba(0,0,0,0.9)]"
        : "";

  return (
    <div
      data-hidden={hide || undefined}
      className={`group/entete fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform motion-reduce:transition-none ${
        hide ? "-translate-y-full focus-within:translate-y-0" : "translate-y-0"
      }`}
    >
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
      <header className={`bg-[#0a0a0a] transition-shadow duration-300 ${ombre}`}>
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href={lp("/")}
            aria-label={t.header.logoAria}
            className="shrink-0 rounded-md transition-opacity hover:opacity-90"
          >
            {/* Chargé tout de suite mais sans priorité haute : l'image principale de la page passe d'abord */}
            <Logo variant="fonce" layout="horizontal" height={40} loading="eager" />
          </Link>

          {/* Navigation bureau */}
          <nav aria-label={t.header.navAria} className="hidden items-center gap-0.5 lg:flex">
            {before.map((item) => (
              <Link
                key={item.href}
                href={lp(item.href)}
                prefetch
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
              {panneau.affiche && (
                // Position voulue telle quelle (décision de la cliente) : bord gauche du panneau au
                // milieu du bouton, sans recentrage. framer-motion écrivait sa propre transform, qui
                // annulait le centrage ; la transform ne porte plus ici que le glissement vertical.
                // Entrée : opacité 0 → 1, y 8 → 0 px ; sortie : opacité → 0, y → 6 px ; 0,2 s.
                <div
                  ref={panneau.ref}
                  id="site-services-menu"
                  className="absolute left-1/2 top-full w-[520px] pt-3 opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] [transform:translateY(8px)] motion-reduce:transition-none data-[etat=ouvert]:opacity-100 data-[etat=ouvert]:[transform:none] data-[etat=sortie]:[transform:translateY(6px)]"
                >
                  {/* pt-3 : zone de survol continue entre le bouton et le panneau */}
                  <ul className="grid grid-cols-2 gap-1 rounded-2xl bg-[#0F1628] p-2 shadow-[0_28px_60px_-18px_rgba(0,0,0,0.75)]">
                    {s.services.map((service) => {
                      const current = isActive(service.href);
                      return (
                        <li key={service.href}>
                          <Link
                            href={lp(service.href)}
                            prefetch
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
                </div>
              )}
            </div>

            {after.map((item) => (
              <Link
                key={item.href}
                href={lp(item.href)}
                prefetch
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

      {/* Menu mobile — sombre. Monté d'avance et masqué (hidden) hors ouverture et sortie.
          Entrée et sortie : opacité 0 ↔ 1, y −10 ↔ 0 px, 0,22 s. */}
      {(menuPret || menuMobile.affiche) && (
        <nav
          ref={menuMobile.ref}
          id="site-mobile-nav"
          aria-label={t.header.navMobileAria}
          hidden={!menuMobile.affiche}
          data-lenis-prevent
          className="max-h-[calc(100dvh-var(--site-header-h))] overflow-y-auto bg-[#0F1628] px-3 pb-6 pt-3 opacity-0 shadow-[0_28px_60px_-18px_rgba(0,0,0,0.75)] transition-[opacity,transform] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] [transform:translateY(-10px)] motion-reduce:transition-none data-[etat=ouvert]:opacity-100 data-[etat=ouvert]:[transform:none] lg:hidden"
        >
          <LiensMobiles locale={locale} s={s} pathname={pathname} fermer={fermerMobile} />
        </nav>
      )}
    </div>
  );
}
