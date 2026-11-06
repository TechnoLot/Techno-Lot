import Link from "next/link";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { formatCount } from "@/lib/admin/format";

/**
 * Carte « Acheteurs » de l'accueil (agent Acheteurs) : les recherches que
 * Claude fait en ce moment sur l'ordinateur de l'agent, les soumissions à
 * traiter qui ont des articles nichés et pas encore de recherche, puis la
 * taille du carnet.
 */
export default function AcheteursCarte({
  niches,
  enCours,
  carnet,
  verifies,
}: {
  /** Soumissions à traiter avec des articles nichés, sans recherche d'acheteurs. */
  niches: number;
  /** Recherches en file ou en cours. */
  enCours: number;
  carnet: number;
  verifies: number;
}) {
  const pluriel = (n: number) => (n > 1 ? "s" : "");

  return (
    <section aria-labelledby="acheteurs-titre" className="flex min-w-0 flex-col rounded-2xl border border-admin-line bg-admin-card">
      <h2
        id="acheteurs-titre"
        className="px-4 pb-1 pt-4 font-display text-lg font-semibold tracking-tight text-admin-ink sm:px-5"
      >
        Acheteurs
      </h2>

      {enCours > 0 && (
        <Link
          href="/admin/soumissions"
          className="group flex items-center gap-3 border-t border-admin-line-soft px-4 py-3 transition-colors hover:bg-admin-subtle sm:px-5"
        >
          <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-admin-green motion-reduce:animate-none" aria-hidden />
          <span className="min-w-0 flex-1 text-[14px] text-admin-ink">
            Claude cherche des acheteurs pour{" "}
            <span className="font-semibold tabular-nums">{formatCount(enCours)}</span> soumission{pluriel(enCours)}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-admin-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}

      {niches > 0 ? (
        <Link
          href="/admin/soumissions?statut=a-traiter"
          className="group flex items-center gap-3 border-t border-admin-line-soft px-4 py-3 transition-colors hover:bg-admin-subtle sm:px-5"
        >
          <Sparkles className="h-[18px] w-[18px] shrink-0 text-admin-green" aria-hidden />
          <span className="min-w-0 flex-1 text-[14px] text-admin-ink">
            <span className="font-semibold tabular-nums">{formatCount(niches)}</span> soumission{pluriel(niches)} avec des
            articles nichés : trouver des acheteurs
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-admin-green transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : enCours > 0 ? (
        null
      ) : (
        <p className="px-4 pb-3 text-[13px] text-admin-muted sm:px-5">
          Rien à chercher pour l&apos;instant : les soumissions avec des articles nichés apparaîtront ici.
        </p>
      )}

      <Link
        href="/admin/crm/acheteurs"
        className="mt-auto flex items-center justify-between rounded-b-2xl border-t border-admin-line-soft bg-admin-subtle px-4 py-3 text-[13px] text-admin-muted transition-colors hover:text-admin-ink sm:px-5"
      >
        <span>
          Carnet : <span className="font-semibold tabular-nums text-admin-ink">{formatCount(carnet)}</span> acheteur
          {pluriel(carnet)}
          {carnet > 0 && `, dont ${formatCount(verifies)} vérifié${pluriel(verifies)}`}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
      </Link>
    </section>
  );
}
