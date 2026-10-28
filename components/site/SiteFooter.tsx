import { ArrowUp, Facebook, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/site/Logo";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

/**
 * Pied de page compact, chapitre bleu nuit : logo, slogan et Facebook ; navigation
 * sur deux colonnes ; coordonnées à taille normale (téléphone, courriel, délai de
 * réponse, adresse postale) ; puis les mentions et le lien « Haut de page ».
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const s = t.shell;
  const f = s.footer;
  const lp = (href: string) => localePath(locale, href);

  const navLinks = [
    { label: s.nav.home, href: "/" },
    { label: s.nav.about, href: "/a-propos" },
    ...s.services.filter((item) => item.href !== "/soumission"),
    ...s.services.filter((item) => item.href === "/soumission"),
    { label: s.nav.faq, href: "/faq" },
    { label: s.nav.blog, href: "/blog" },
    { label: s.nav.contact, href: "/contact" },
  ];

  const smallLink = "transition-colors duration-200 hover:text-[#6bd63b]";

  return (
    <footer data-theme="night" className="relative isolate overflow-hidden text-mist">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-[18%] top-[5%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle_at_center,rgba(94,203,51,0.12),transparent_62%)]" />
        <div className="absolute -right-[12%] -top-[40%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.07),transparent_62%)]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Marque */}
          <div className="sm:col-span-2 lg:col-span-4">
            <Link href={lp("/")} aria-label={t.header.logoAria} className="inline-block rounded-md transition-opacity hover:opacity-90">
              <Logo variant="fonce" layout="horizontal" height={34} />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-moss">{f.slogan}</p>
            <a
              href={site.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.footer.facebook}
              className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-mist transition-colors duration-200 hover:border-[#6bd63b] hover:bg-[#6bd63b] hover:text-ink"
            >
              <Facebook className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
          </div>

          {/* Navigation */}
          <nav aria-label={f.navTitle} className="lg:col-span-4">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 font-display text-[15px] font-medium text-white/85">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link href={lp(item.href)} className={smallLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Coordonnées */}
          <div className="lg:col-span-4">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-white/55">{f.contactTitle}</p>
            <ul className="mt-4 space-y-3 text-sm text-moss">
              <li>
                <a
                  href={site.phoneHref}
                  aria-label={`${f.callAria} ${site.phone}`}
                  className={`inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-white ${smallLink}`}
                >
                  <Phone className="h-4 w-4 text-[#6bd63b]" aria-hidden="true" />
                  {site.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${site.email}`}
                  aria-label={`${f.emailAria} ${site.email}`}
                  className={`inline-flex items-center gap-2.5 text-base font-medium text-white/85 ${smallLink}`}
                >
                  <Mail className="h-4 w-4 text-[#6bd63b]" aria-hidden="true" />
                  {site.email}
                </a>
              </li>
              <li>{f.response}</li>
              <li>
                <span className="block text-xs text-white/55">{f.postalLabel}</span>
                <address className="mt-0.5 not-italic leading-relaxed">
                  {site.address.street}, {site.address.city}, {site.address.province} {site.address.postalCode}
                </address>
              </li>
            </ul>
          </div>
        </div>

        {/* Mentions */}
        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-xs text-moss sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.copyright}</p>
          <a href="#top" className={`group inline-flex items-center gap-2 font-display font-semibold uppercase tracking-[0.1em] text-mist ${smallLink}`}>
            {f.backToTop}
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line-strong transition-transform duration-300 group-hover:-translate-y-0.5">
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
