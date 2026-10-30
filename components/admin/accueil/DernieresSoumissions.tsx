import Link from "next/link";
import { ArrowRight, ExternalLink, Phone, Plus } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import SupprimerSoumission from "@/components/admin/soumissions/SupprimerSoumission";
import { WEBMAIL_URL } from "@/lib/admin/config";
import { resumePage } from "@/lib/admin/pagination";
import { isMailApiConfigured } from "@/lib/hostinger/config";

export type SoumissionRow = {
  id: string;
  date: string; // ISO (colonne "DATE")
  nom: string | null;
  courriel: string | null;
  telephone: string | null;
  message: string | null;
};

function formatDateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Toronto",
  }).format(new Date(iso));
}

/**
 * « Dernières soumissions » : demandes du formulaire public des 30 derniers
 * jours qui ne sont liées à aucun lot, par pages (paramètre d'URL `sp`). La
 * liste complète est dans l'onglet Soumissions (/admin/soumissions).
 */
export default function DernieresSoumissions({
  rows,
  page,
  pageCount,
  parPage,
  total,
}: {
  /** Demandes de la page affichée */
  rows: SoumissionRow[];
  page: number;
  pageCount: number;
  parPage: number;
  total: number;
}) {
  const courrielApi = isMailApiConfigured();
  return (
    <section
      id="soumissions"
      aria-labelledby="soumissions-titre"
      className="scroll-mt-20 rounded-2xl border border-admin-line bg-admin-card"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h2
            id="soumissions-titre"
            className="font-display text-lg font-semibold tracking-tight text-admin-ink"
          >
            Dernières soumissions
          </h2>
          <p className="text-[13px] text-admin-muted">À traiter, 30 derniers jours</p>
        </div>
        <Link
          href="/admin/soumissions"
          className="admin-focus inline-flex shrink-0 items-center gap-1 rounded-md text-[13px] font-semibold text-admin-green hover:underline"
        >
          Toutes les soumissions
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="pb-2">
        {rows.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-2 border-t border-admin-line-soft px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-admin-ink">
                {s.nom || "Sans nom"}
                <span className="ml-2 text-[13px] font-normal text-admin-muted">
                  {formatDateHeure(s.date)}
                </span>
              </p>
              {s.message && (
                <p className="line-clamp-2 text-[13px] text-admin-muted">{s.message}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <a
                href={courrielApi ? `/api/admin/soumissions/${s.id}/courriel/hostinger` : WEBMAIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn"
                title="Ouvre le courriel dans le webmail Hostinger (info@technolot.ca), dans un nouvel onglet"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Ouvrir dans Hostinger
              </a>
              {s.telephone && (
                <a href={`tel:${s.telephone}`} className="admin-btn" title={s.telephone}>
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  Appeler
                </a>
              )}
              <Link href={`/admin/lots/nouveau?soumission=${s.id}`} className="admin-btn">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Créer le lot
              </Link>
              <SupprimerSoumission id={s.id} nom={s.nom} compact />
            </div>
          </li>
        ))}
      </ul>
      {pageCount > 1 && (
        <div className="flex flex-col items-center gap-2 border-t border-admin-line-soft px-4 py-3 sm:px-5">
          <Pagination page={page} pageCount={pageCount} param="sp" scroll={false} />
          <p className="text-[12px] tabular-nums text-admin-muted">{resumePage(page, parPage, total)}</p>
        </div>
      )}
    </section>
  );
}
