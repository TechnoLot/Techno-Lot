import { ArrowUp, Facebook } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/site/Logo";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

/**
 * Pied de page « le contact comme titre » : chapitre bleu nuit pleine largeur
 * (≈ 80 svh sur grand écran). Rangée du haut (logo, slogan, adresse, courriel,
 * Facebook, haut de page), puis le numéro en très grand (lien tel:, lime au
 * survol) et le courriel, puis la navigation et les mentions.
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
        <div className="absolute -left-[20%] top-[30%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(94,203,51,0.13),transparent_62%)]" />
        <div className="absolute -right-[15%] -top-[30%] h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.08),transparent_62%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col px-5 pb-8 pt-16 sm:px-8 sm:pt-20 lg:min-h-[80svh]">
        {/* Rangée du haut */}
        <div className="grid gap-8 text-sm text-moss sm:grid-cols-2 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-4">
            <Link href={lp("/")} aria-label={t.header.logoAria} className="inline-block rounded-md transition-opacity hover:opacity-90">
              <Logo variant="fonce" layout="horizontal" height={34} />
            </Link>
            <p className="mt-4 max-w-xs leading-relaxed">{f.slogan}</p>
          </div>
          <address className="not-italic lg:col-span-3">
            <a href={site.address.mapsUrl} target="_blank" rel="noopener noreferrer" className={`leading-relaxed ${smallLink}`}>
              {site.address.street}
              <br />
              {site.address.city}, {site.address.province} {site.address.postalCode}
            </a>
          </address>
          <div className="flex flex-col items-start gap-3 lg:col-span-3">
            <a href={`mailto:${site.email}`} className={smallLink}>
              {site.email}
            </a>
            <a
              href={site.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.footer.facebook}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-mist transition-colors duration-200 hover:border-[#6bd63b] hover:bg-[#6bd63b] hover:text-ink"
            >
              <Facebook className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
          </div>
          <div className="lg:col-span-2 lg:text-right">
            <a href="#top" className={`group inline-flex items-center gap-2 font-display font-semibold uppercase tracking-[0.1em] text-mist ${smallLink}`}>
              {f.backToTop}
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line-strong transition-transform duration-300 group-hover:-translate-y-0.5">
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </span>
            </a>
          </div>
        </div>

        {/* Le contact comme titre */}
        <div className="flex flex-1 flex-col justify-center py-16 sm:py-20">
          <a
            href={site.phoneHref}
            aria-label={`${f.callAria} ${site.phone}`}
            className="block w-fit max-w-full whitespace-nowrap font-display text-[clamp(2.4rem,14vw,9rem)] font-bold leading-[0.92] tracking-[-0.045em] text-white transition-colors duration-300 hover:text-[#6bd63b] lg:text-[clamp(4rem,8.6vw,9rem)]"
          >
            {site.phone}
          </a>
          <a
            href={`mailto:${site.email}`}
            aria-label={`${f.emailAria} ${site.email}`}
            className="mt-4 block w-fit font-display text-2xl font-semibold tracking-[-0.01em] text-moss transition-colors duration-300 hover:text-[#6bd63b] sm:mt-6 sm:text-4xl lg:text-5xl"
          >
            {site.email}
          </a>
        </div>

        {/* Navigation + mentions */}
        <nav aria-label={f.navTitle}>
          <ul className="flex flex-wrap gap-x-6 gap-y-3 font-display text-[15px] font-medium text-white/85">
            {navLinks.map((item) => (
              <li key={item.href}>
                <Link href={lp(item.href)} className={smallLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-xs text-moss sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.copyright}</p>
          <p>{f.city}</p>
        </div>
      </div>
    </footer>
  );
}
