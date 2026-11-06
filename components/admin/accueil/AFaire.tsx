import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Handshake,
  Inbox,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { CleTache, Tache } from "@/lib/admin/accueil";

/** Icône et teinte de la pastille de chaque tâche. */
const STYLE: Record<CleTache, { icon: LucideIcon; tint: string }> = {
  // Lime plein : le seul rendez-vous à heure fixe de la journée
  ramassages: { icon: CalendarClock, tint: "bg-[#6bd63b] text-[#0a0a0a]" },
  ebay: { icon: Truck, tint: "bg-admin-tint-amber text-admin-tint-amber-ink" },
  soumissions: { icon: Inbox, tint: "bg-admin-tint-blue text-admin-tint-blue-ink" },
  suivis: { icon: BellRing, tint: "bg-admin-tint-violet text-admin-tint-violet-ink" },
  negociation: { icon: Handshake, tint: "bg-admin-tint-cyan text-admin-tint-cyan-ink" },
  prix: { icon: Tag, tint: "bg-admin-tint-green text-admin-tint-green-ink" },
};

const LIEN_TACHE =
  "group flex items-center gap-3.5 rounded-2xl px-3 py-3 transition-colors duration-200 hover:bg-admin-hover/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6bd63b] sm:px-4";

/**
 * « À faire aujourd’hui » : une ligne cliquable par tâche (ramassages du jour,
 * commandes eBay à expédier, soumissions, suivis, lots en négociation, prix à
 * saisir), calculées dans lib/admin/accueil.ts.
 */
export default function AFaire({ taches }: { taches: Tache[] }) {
  return (
    <section
      aria-labelledby="afaire-titre"
      className="admin-verre flex min-w-0 flex-col p-2 sm:p-3"
    >
      <h2
        id="afaire-titre"
        className="px-3 pb-2 pt-2 font-display text-[22px] font-bold tracking-[-0.01em] text-admin-ink sm:px-4"
      >
        À faire aujourd’hui
      </h2>

      {taches.length === 0 ? (
        // Centré dans la place libre (la carte suit la hauteur de la carte eBay)
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-admin-tint-green text-admin-tint-green-ink">
            <CircleCheck className="h-7 w-7" aria-hidden />
          </span>
          <div>
            <p className="font-display text-[17px] font-semibold text-admin-ink">Tout est à jour</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-admin-muted">
              Aucune commande à expédier, aucune soumission à traiter et aucun suivi en retard.
            </p>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-1 lg:grid-cols-2">
          {taches.map((t) => (
            <li key={t.cle} className="min-w-0">
              <LigneTache t={t} />
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}

function LigneTache({ t }: { t: Tache }) {
  const { icon: Icon, tint } = STYLE[t.cle];
  const Fleche = t.externe ? ArrowUpRight : ChevronRight;
  const metaCouleur = t.urgent ? "font-medium text-admin-warning" : "text-admin-muted";

  const contenu = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tint}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="block min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-admin-ink">{t.titre}</span>
        {t.detail && <span className="block truncate text-[13px] text-admin-muted">{t.detail}</span>}
        {/* Téléphone : la meta a sa propre ligne, jamais coupée par les points de suspension */}
        {t.meta && <span className={`mt-0.5 block text-[12.5px] sm:hidden ${metaCouleur}`}>{t.meta}</span>}
      </span>
      {t.meta && (
        <span className={`hidden shrink-0 whitespace-nowrap text-[13px] sm:block ${metaCouleur}`}>{t.meta}</span>
      )}
      <Fleche
        className="h-4 w-4 shrink-0 text-admin-faint transition-transform group-hover:translate-x-0.5 group-hover:text-admin-ink motion-reduce:transition-none"
        aria-hidden
      />
    </>
  );

  if (t.externe) {
    return (
      <a href={t.href} target="_blank" rel="noopener noreferrer" className={LIEN_TACHE}>
        {contenu}
        <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
      </a>
    );
  }
  return (
    <Link href={t.href} className={LIEN_TACHE}>
      {contenu}
    </Link>
  );
}
