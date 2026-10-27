import Link from "next/link";
import { Mail, Phone, Plus } from "lucide-react";

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
 * jours qui ne sont liées à aucun lot (aucune page admin ne les traite
 * ailleurs).
 */
export default function DernieresSoumissions({ rows }: { rows: SoumissionRow[] }) {
  return (
    <section
      id="soumissions"
      aria-labelledby="soumissions-titre"
      className="scroll-mt-20 rounded-2xl border border-[#e3eadf] bg-white"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <h2
          id="soumissions-titre"
          className="font-display text-lg font-semibold tracking-tight text-[#0a0a0a]"
        >
          Dernières soumissions
        </h2>
        <span className="text-[13px] text-[#4f5a52]">30 derniers jours</span>
      </div>
      <ul className="pb-2">
        {rows.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-2 border-t border-[#edf2ea] px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-[#0a0a0a]">
                {s.nom || "Sans nom"}
                <span className="ml-2 text-[13px] font-normal text-[#4f5a52]">
                  {formatDateHeure(s.date)}
                </span>
              </p>
              {s.message && (
                <p className="line-clamp-2 text-[13px] text-[#4f5a52]">{s.message}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {s.courriel && (
                <a
                  href={`mailto:${s.courriel}`}
                  className="admin-btn"
                  title={s.courriel}
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  Écrire
                </a>
              )}
              {s.telephone && (
                <a href={`tel:${s.telephone}`} className="admin-btn" title={s.telephone}>
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  Appeler
                </a>
              )}
              <Link href="/admin/lots/nouveau" className="admin-btn">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Créer le lot
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
