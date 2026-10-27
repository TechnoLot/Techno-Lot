import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { GhostButtonLink, PrimaryButtonLink } from "@/components/site/Button";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import "@/components/pages/blog.css";

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

const usefulTitle = { fr: "Pages utiles", en: "Useful pages" };

/** Page 404 : chapitre bleu nuit avec lueurs vertes, textes `notFound` de lib/i18n.ts. */
export default function NotFoundView({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const links = [
    ...t.shell.services.filter((s) => s.href !== "/soumission"),
    { href: "/faq", label: t.shell.nav.faq },
    { href: "/blog", label: t.shell.nav.blog },
    { href: "/contact", label: t.shell.nav.contact },
  ];

  return (
    <section
      data-under-header=""
      data-theme="night"
      className="relative isolate flex min-h-[85vh] items-center overflow-hidden pb-20 pt-32 sm:pt-40"
    >
      <div aria-hidden="true" className="blog-glow blog-glow--tl" />
      <div aria-hidden="true" className="blog-glow blog-glow--br" />
      <div className="mx-auto grid w-full max-w-6xl items-end gap-14 px-5 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p aria-hidden="true" className="blog-404-digits hero-item text-[7rem] sm:text-[10rem] lg:text-[12rem]" style={d(0)}>
            404
          </p>
          <h1
            className="hero-item mt-6 max-w-2xl font-display text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] text-mist sm:text-5xl"
            style={d(0.08)}
          >
            {t.notFound.title}
          </h1>
          <p className="hero-item mt-5 max-w-xl text-base leading-relaxed text-moss sm:text-lg" style={d(0.16)}>
            {t.notFound.text}
          </p>
          <div className="hero-item mt-9 flex flex-col gap-3 sm:flex-row" style={d(0.24)}>
            <PrimaryButtonLink href={localePath(locale, "/soumission")} className="uppercase">
              {t.notFound.cta}
            </PrimaryButtonLink>
            <GhostButtonLink href={localePath(locale, "/")}>{t.notFound.backHome}</GhostButtonLink>
          </div>
        </div>

        <nav aria-labelledby="nf-useful" className="hero-item lg:col-span-5" style={d(0.32)}>
          <h2 id="nf-useful" className="font-display text-lg font-bold text-mist">
            {usefulTitle[locale]}
          </h2>
          <ul className="mt-4 border-t border-line">
            {links.map((l) => (
              <li key={l.href} className="border-b border-line">
                <Link
                  href={localePath(locale, l.href)}
                  className="group flex items-center justify-between gap-4 py-4 font-display text-base font-semibold text-mist transition-colors hover:text-emerald"
                >
                  {l.label}
                  <ArrowUpRight
                    className="h-5 w-5 text-emerald transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
