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
import { formatCount } from "@/lib/admin/format";
import type { CleTache, Prochain, Tache } from "@/lib/admin/accueil";

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

/** Rappels montrés dans « Prochains jours » (le reste mène aux suivis ou aux ramassages). */
const MAX_PROCHAINS = 5;

const LIEN_TACHE =
  "group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-admin-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6bd63b] sm:px-5";

/**
 * « À faire aujourd’hui » : une ligne cliquable par tâche (ramassages du jour,
 * commandes eBay à expédier, soumissions, suivis, lots en négociation, prix à
 * saisir), calculées dans lib/admin/accueil.ts, puis les rappels des 7
 * prochains jours (ramassages et suivis).
 */
export default function AFaire({ taches, prochains }: { taches: Tache[]; prochains: Prochain[] }) {
  const visibles = prochains.slice(0, MAX_PROCHAINS);
  const caches = prochains.slice(MAX_PROCHAINS);
  const autresSuivis = caches.filter((p) => p.type === "suivi").length;
  const autresRamassages = caches.length - autresSuivis;

  return (
    <section
      aria-labelledby="afaire-titre"
      className="flex h-full min-w-0 flex-col rounded-2xl border border-admin-line bg-admin-card"
    >
      <h2
        id="afaire-titre"
        className="px-4 pb-1 pt-4 font-display text-lg font-semibold tracking-tight text-admin-ink sm:px-5 sm:pt-5"
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
        <ul className="pb-1">
          {taches.map((t) => (
            <li key={t.cle} className="border-t border-admin-line-soft first:border-t-0">
              <LigneTache t={t} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto rounded-b-2xl border-t border-admin-line-soft bg-admin-subtle px-4 py-4 sm:px-5">
        <h3 className="text-[13px] font-semibold text-admin-ink">Prochains jours</h3>
        {visibles.length === 0 ? (
          <p className="mt-1 text-[13px] text-admin-muted">Rien de prévu pour les 7 prochains jours.</p>
        ) : (
          // Grille : la colonne des jours prend la largeur du plus long, pas plus
          <ul className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
            {visibles.map((p) => (
              <li key={p.cle} className="col-span-2 grid grid-cols-subgrid">
                <Link
                  href={p.href}
                  className="group col-span-2 grid grid-cols-subgrid items-baseline rounded-md py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b]"
                >
                  <span className="whitespace-nowrap text-[13px] font-medium text-admin-muted">{p.quand}</span>
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 truncate text-[14px] font-medium text-admin-ink group-hover:text-admin-green group-hover:underline">
                      {p.titre}
                    </span>
                    <span className="hidden shrink-0 text-[13px] text-admin-muted sm:inline">{p.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(autresRamassages > 0 || autresSuivis > 0) && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {autresRamassages > 0 && (
              <Link
                href="/admin/ramassages"
                className="admin-focus inline-flex rounded-md text-[13px] font-semibold text-admin-green hover:underline"
              >
                Et {formatCount(autresRamassages)} autre{autresRamassages > 1 ? "s" : ""} ramassage
                {autresRamassages > 1 ? "s" : ""}
              </Link>
            )}
            {autresSuivis > 0 && (
              <Link
                href="/admin/crm/suivis"
                className="admin-focus inline-flex rounded-md text-[13px] font-semibold text-admin-green hover:underline"
              >
                Et {formatCount(autresSuivis)} autre{autresSuivis > 1 ? "s" : ""} dans les suivis
              </Link>
            )}
          </div>
        )}
      </div>
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
