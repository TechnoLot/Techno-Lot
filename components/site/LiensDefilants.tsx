import { ArrowUpRight, Phone } from "lucide-react";
import Link from "next/link";
import { Marquee } from "@/components/site/Marquee";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

const PILULE =
  "group inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line-strong bg-paper px-4 py-2.5 font-display text-[15px] font-semibold text-ink transition-colors duration-200 hover:border-ink hover:bg-ink hover:text-white focus-visible:border-ink focus-visible:bg-ink focus-visible:text-white sm:px-5 sm:py-3 sm:text-base";
const ICONE = "h-4 w-4 shrink-0 text-[#2b7a10] transition-colors duration-200 group-hover:text-[#8be95f] group-focus-visible:text-[#8be95f]";

/**
 * Ruban de liens utiles (services, FAQ, contact, téléphone) qui défile doucement sous
 * un appel à l'action. Pause au survol et au focus pour cliquer sans viser une cible
 * mobile ; en mouvement réduit, c'est une simple rangée qu'on fait défiler.
 * `exclude` : chemins (non localisés) à retirer, ex. la page courante ou le bouton voisin.
 */
export function LiensDefilants({
  locale,
  exclude = [],
  className,
}: {
  locale: Locale;
  exclude?: string[];
  className?: string;
}) {
  const { shell } = getDict(locale);
  const liens = shell.liensUtiles.items.filter((l) => !exclude.includes(l.href));

  return (
    <nav aria-label={shell.liensUtiles.label} className={className}>
      <Marquee
        speed={30}
        scrollBoost={1.5}
        maxBoost={160}
        className="py-1 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
      >
        {liens.map((l) => (
          <Link key={l.href} href={localePath(locale, l.href)} className={PILULE}>
            {l.label}
            <ArrowUpRight className={ICONE} aria-hidden="true" />
          </Link>
        ))}
        <a href={site.phoneHref} className={PILULE}>
          <Phone className={ICONE} aria-hidden="true" />
          {site.phone}
        </a>
      </Marquee>
    </nav>
  );
}
