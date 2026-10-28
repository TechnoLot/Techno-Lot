import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { localePath, type Locale } from "@/lib/i18n";
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

const HOME: Record<Locale, string> = {
  fr: "Accueil",
  en: "Home",
};

/**
 * Niveaux « Accueil › … » d'une page intérieure. `trail` : niveaux après
 * l'accueil, avec leur chemin français (préfixé /en selon la langue).
 */
export function pageCrumbs(locale: Locale, trail: { name: string; frPath: string }[]): BreadcrumbItem[] {
  return [
    { name: HOME[locale], path: localePath(locale, "/") },
    ...trail.map((t) => ({ name: t.name, path: localePath(locale, t.frPath) })),
  ];
}

/** Fil d'Ariane prêt pour la prop `breadcrumbs` de PageHero : Accueil › `name`. */
export function HeroCrumbs({ locale, name, frPath }: { locale: Locale; name: string; frPath: string }) {
  return <Breadcrumbs locale={locale} items={pageCrumbs(locale, [{ name, frPath }])} />;
}

/**
 * Fil d'Ariane discret (composant serveur) : liste ordonnée, séparateurs « › »,
 * dernier niveau sans lien (aria-current="page"). Rend aussi son JSON-LD
 * BreadcrumbList (désactivable avec `jsonLd={false}` si la page l'émet déjà ailleurs ;
 * il ne doit y en avoir qu'un par page). Le dernier niveau est tronqué
 * visuellement avec une ellipse s'il est trop long (nom complet en title et
 * dans le JSON-LD). Couleurs : tokens du thème de la section (text-moss / text-mist).
 */
export function Breadcrumbs({
  items,
  locale,
  jsonLd = true,
}: {
  items: BreadcrumbItem[];
  locale: Locale;
  jsonLd?: boolean;
}) {
  if (items.length === 0) return null;
  const lastIndex = items.length - 1;

  return (
    <>
      {jsonLd && <JsonLd data={breadcrumbJsonLd(items)} />}
      <nav aria-label={LABEL[locale]}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-moss">
          {items.map((item, i) => (
            <li key={item.path} className={i === lastIndex ? "flex min-w-0 max-w-full items-center" : "flex items-center gap-x-2"}>
              {i === lastIndex ? (
                <span aria-current="page" title={item.name} className="block min-w-0 max-w-full truncate text-mist sm:max-w-[36rem]">
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
