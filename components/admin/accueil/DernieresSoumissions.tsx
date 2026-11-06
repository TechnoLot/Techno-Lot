import Link from "next/link";
import { ArrowRight, ExternalLink, Phone, Plus } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import SupprimerSoumission from "@/components/admin/soumissions/SupprimerSoumission";
import { WEBMAIL_URL } from "@/lib/admin/config";
import { resumePage } from "@/lib/admin/pagination";
import { apercuSoumission } from "@/lib/admin/soumissions";
import { isMailApiConfigured } from "@/lib/hostinger/config";

export type SoumissionRow = {
  id: string;
  date: string; // ISO (colonne "DATE")
  nom: string | null;
  courriel: string | null;
  telephone: string | null;
  message: string | null;
  entreprise: string | null;
  ville: string | null;
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
 * « Soumissions à traiter » : demandes du formulaire public des 30 derniers
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
      <div className="flex flex-col items-start gap-1.5 px-4 pb-2 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h2 id="soumissions-titre" className="admin-h2">
            Soumissions à traiter
          </h2>
          <p className="text-[13px] text-admin-muted">Reçues ces 30 derniers jours, sans lot créé</p>
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
        {rows.map((s) => {
          const apercu = apercuSoumission(s.message);
          const qui = [s.entreprise ? s.nom : null, s.ville].filter(Boolean).join(" · ");
          return (
            <li
              key={s.id}
              className="flex flex-col gap-2 border-t border-admin-line-soft px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-admin-ink">
                  {s.entreprise || s.nom || "Sans nom"}
                  {qui && <span className="ml-2 text-[13px] font-normal text-admin-muted">{qui}</span>}
                </p>
                {apercu && <p className="truncate text-[13px] text-admin-muted">{apercu}</p>}
              </div>
              <span className="shrink-0 whitespace-nowrap text-[13px] text-admin-muted">{formatDateHeure(s.date)}</span>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={courrielApi ? `/api/admin/soumissions/${s.id}/courriel/hostinger` : WEBMAIL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-icon-btn"
                  aria-label="Ouvrir dans Hostinger (nouvel onglet)"
                  title="Ouvrir dans Hostinger"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
                {s.telephone && (
                  <a
                    href={`tel:${s.telephone}`}
                    className="admin-icon-btn"
                    aria-label={`Appeler ${s.telephone}`}
                    title={`Appeler ${s.telephone}`}
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                  </a>
                )}
                <SupprimerSoumission id={s.id} nom={s.nom} compact />
                <Link href={`/admin/lots/nouveau?soumission=${s.id}`} className="admin-btn-accent">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Créer le lot
                </Link>
              </div>
            </li>
          );
        })}
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
