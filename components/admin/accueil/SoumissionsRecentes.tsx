import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ilYa } from "@/lib/admin/accueil";
import { apercuSoumission, type Soumission } from "@/lib/admin/soumissions";

/** « Dernières soumissions » de l'accueil : les 3 plus récentes, sans action. */
export default function SoumissionsRecentes({ rows, now }: { rows: Soumission[]; now: Date }) {
  return (
    <section aria-labelledby="recentes-titre" className="rounded-2xl border border-admin-line bg-admin-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 pb-2.5 pt-4 sm:px-5">
        <h2 id="recentes-titre" className="admin-h2">
          Dernières soumissions
        </h2>
        <Link
          href="/admin/soumissions"
          className="admin-focus inline-flex items-center gap-1 rounded-md text-[13px] font-semibold text-admin-green hover:underline"
        >
          Toutes les soumissions
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <ul>
        {rows.map((s) => (
          <li key={s.id} className="border-t border-admin-line-soft">
            <Link
              href={s.nom?.trim() ? `/admin/soumissions?q=${encodeURIComponent(s.nom.trim())}` : "/admin/soumissions"}
              className="group flex items-center gap-3.5 px-4 py-3 transition-colors duration-150 hover:bg-admin-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6bd63b] sm:px-5"
            >
              <span className="block min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-admin-ink">
                  {s.entreprise || s.nom || "Sans nom"}
                </span>
                <span className="block truncate text-[13px] text-admin-muted">{apercuSoumission(s.message)}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-[13px] text-admin-muted">{ilYa(s.date, now)}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-admin-faint" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
