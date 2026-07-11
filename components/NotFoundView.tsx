import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import HeroBackground from "@/components/HeroBackground";
import { getDict, localePath, type Locale } from "@/lib/i18n";

export default function NotFoundView({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <section className="relative overflow-hidden">
      <HeroBackground />
      <div className="container-site relative flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
        <SearchX className="h-14 w-14 text-accent" strokeWidth={1.5} aria-hidden />
        <p className="mt-6 font-display text-7xl font-bold text-gradient sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
          {t.notFound.title}
        </h1>
        <p className="mt-4 max-w-md text-slate-300">{t.notFound.text}</p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link href={localePath(locale, "/")} className="btn-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t.notFound.backHome}
          </Link>
          <Link href={localePath(locale, "/contact")} className="btn-secondary">
            {t.notFound.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
