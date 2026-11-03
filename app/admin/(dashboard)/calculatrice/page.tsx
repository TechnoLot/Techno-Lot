import type { Metadata } from "next";
import { exigerAdminPage } from "@/lib/securite/garde";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { uuid } from "@/lib/admin/schemas";
import { fetchSoumission } from "@/lib/admin/soumissions";

export const metadata: Metadata = {
  title: "Calculatrice de lot — Admin",
  robots: { index: false, follow: false },
};

function formatRecue(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Toronto",
  }).format(new Date(iso));
}

export default async function CalculatricePage(
  props: {
    searchParams: Promise<{ lot?: string; soumission?: string }>;
  }
) {
  const { supabase } = await exigerAdminPage("/admin/calculatrice");
  const searchParams = await props.searchParams;
  // `?soumission=<id>` (bouton « Ouvrir dans la calculatrice » des soumissions)
  // ou `?lot=<id>` (Lots enregistrés) : passés à l'iframe, dont le script
  // charge la soumission ou le lot. Identifiants vérifiés avant d'être recopiés.
  const idSoumission = uuid.safeParse(searchParams.soumission ?? "");
  const idLot = uuid.safeParse(searchParams.lot ?? "");
  const soumission = idSoumission.success ? await fetchSoumission(supabase, idSoumission.data) : null;
  const soumissionIntrouvable = idSoumission.success && !soumission;

  const params = new URLSearchParams();
  if (soumission) params.set("soumission", soumission.id);
  else if (idLot.success) params.set("lot", idLot.data);
  const embedSrc = `/admin/calculatrice/embed${params.toString() ? `?${params.toString()}` : ""}`;

  const client = soumission
    ? [soumission.nom, soumission.entreprise && soumission.entreprise !== soumission.nom ? soumission.entreprise : null]
        .filter(Boolean)
        .join(", ") || "Sans nom"
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      {soumission && (
        <Link
          href="/admin/soumissions"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors hover:text-admin-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Retour aux soumissions
        </Link>
      )}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-admin-ink sm:text-3xl">
            Calculatrice de lot
          </h1>
          <p className="mt-1 text-sm text-admin-muted">
            {soumission
              ? `Soumission de ${client}, reçue le ${formatRecue(soumission.date)} : la liste et les liens eBay sont prêts, il reste tes prix.`
              : "Colle ta liste, entre tes prix de vente eBay et décide du prix à payer."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/calculatrice/enregistres"
            className="inline-flex items-center gap-1.5 rounded-full border border-admin-line-strong bg-admin-card px-4 py-2 text-[13px] font-semibold text-admin-ink transition-colors hover:bg-admin-page"
          >
            <FolderOpen className="h-3.5 w-3.5" aria-hidden />
            Lots enregistrés
          </Link>
          <a
            href={embedSrc}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-medium text-admin-green transition-colors hover:bg-admin-tint-green"
          >
            Ouvrir en plein écran ↗
          </a>
        </div>
      </header>

      {soumissionIntrouvable && (
        <div
          role="alert"
          className="rounded-xl border border-admin-tint-amber-line bg-admin-tint-amber px-4 py-3 text-sm text-admin-warning"
        >
          Cette soumission est introuvable (elle a peut-être été supprimée). La calculatrice
          s&apos;ouvre sur ton dernier lot.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-admin-line bg-admin-page">
        <iframe
          src={embedSrc}
          title="Calculatrice de lot Techno Lot"
          className="block h-[calc(100vh-11rem)] min-h-[560px] w-full border-0"
        />
      </div>
    </div>
  );
}
