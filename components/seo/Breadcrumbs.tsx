import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import type { Locale } from "@/lib/i18n";
import { breadcrumbJsonLd } from "@/lib/seo/schema";

export type BreadcrumbItem = {
  name: string;
  /** Chemin réel du niveau, langue comprise (ex. "/en"). */
  path: string;
};

const LABEL: Record<Locale, string> = {
  fr: "Fil d'Ariane",
  en: "Breadcrumb",
};

/**
 * Fil d'Ariane discret (composant serveur) : liste ordonnée, séparateurs « › »,
 * dernier niveau sans lien (aria-current="page"). Rend aussi son JSON-LD
 * BreadcrumbList. Couleurs : tokens du thème de la section (text-moss / text-mist).
 */
export function Breadcrumbs({ items, locale }: { items: BreadcrumbItem[]; locale: Locale }) {
  if (items.length === 0) return null;
  const lastIndex = items.length - 1;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label={LABEL[locale]}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-moss">
          {items.map((item, i) => (
            <li key={item.path} className="flex items-center gap-x-2">
              {i === lastIndex ? (
                <span aria-current="page" className="text-mist">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.path}
                    className="underline-offset-4 transition-colors hover:text-mist hover:underline focus-visible:text-mist focus-visible:underline"
                  >
                    {item.name}
                  </Link>
                  <span aria-hidden="true">›</span>
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
