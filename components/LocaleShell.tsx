import type { ReactNode } from "react";
import SetDocumentLang from "@/components/SetDocumentLang";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import JsonLd from "@/components/seo/JsonLd";
import { getDict, type Locale } from "@/lib/i18n";
import { organizationJsonLd } from "@/lib/seo/schema";
// Système de design du site public (thèmes de chapitres, boutons…) — limité à .site-root
import "@/app/site.css";

/**
 * Habillage commun d'une section linguistique : en-tête, pied de page et
 * JSON-LD localisés, défilement lissé, attribut lang.
 * `.site-root` porte les jetons de couleur de la marque, Inter / Chakra Petch
 * et les thèmes de chapitre (app/site.css) ; l'admin (même layout racine)
 * n'est pas concerné. `id="top"` sert au lien « Haut de page » du pied.
 */
export default function LocaleShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const t = getDict(locale);

  return (
    <>
      <SetDocumentLang lang={t.htmlLang} />
      <JsonLd data={organizationJsonLd(locale)} />
      <div id="top" className="site-root flex min-h-screen flex-1 flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-gradient-accent focus:px-5 focus:py-2.5 focus:font-display focus:font-semibold focus:text-ink"
        >
          {t.shell.skipToContent}
        </a>
        {/* framer-motion (MotionProvider) : monté par les seuls gabarits qui l'utilisent */}
        {/* Textes de la seule langue de la page (pas les dictionnaires complets côté client) */}
        <SiteHeader
          locale={locale}
          textes={{
            header: {
              logoAria: t.header.logoAria,
              navAria: t.header.navAria,
              navMobileAria: t.header.navMobileAria,
              menuOpen: t.header.menuOpen,
              menuClose: t.header.menuClose,
              switcherAria: t.header.switcherAria,
            },
            shell: { topbar: t.shell.topbar, nav: t.shell.nav, services: t.shell.services, cta: t.shell.cta },
          }}
        />
        <main id="main" className="site-main flex-1">
          {children}
        </main>
        <SiteFooter locale={locale} />
        <SmoothScroll />
      </div>
    </>
  );
}
