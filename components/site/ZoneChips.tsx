import { MapPin } from "lucide-react";
import Link from "next/link";

export type ZoneChip = {
  label: string;
  /** Chemin déjà localisé ; sans href, la pastille est un simple texte */
  href?: string;
};

/**
 * Pastilles de zones desservies : aplats tonaux du thème (bg-surface), sans
 * bordure ni flou. Les zones sont fournies par l'appelant (rien d'inventé ici).
 */
export function ZoneChips({ items, className }: { items: ZoneChip[]; className?: string }) {
  const chipCls =
    "inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2.5 font-display text-sm font-medium text-mist sm:px-5";

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {items.map((zone) =>
        zone.href ? (
          <Link
            key={zone.label}
            href={zone.href}
            className={`${chipCls} transition-colors duration-200 hover:bg-surface-2 hover:text-emerald`}
          >
            <MapPin className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
            {zone.label}
          </Link>
        ) : (
          <span key={zone.label} className={chipCls}>
            <MapPin className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
            {zone.label}
          </span>
        ),
      )}
    </div>
  );
}
