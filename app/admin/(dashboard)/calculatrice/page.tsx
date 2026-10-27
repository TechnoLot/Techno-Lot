import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Calculatrice de lot — Admin",
  robots: { index: false, follow: false },
};

export default function CalculatricePage({
  searchParams,
}: {
  searchParams: { lot?: string };
}) {
  // Le paramètre `?lot=<id>` est passé au route handler de l'iframe : le
  // script client de la calculatrice le lit et charge le lot depuis Supabase.
  const embedSrc = searchParams.lot
    ? `/admin/calculatrice/embed?lot=${encodeURIComponent(searchParams.lot)}`
    : "/admin/calculatrice/embed";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0a0a0a] sm:text-3xl">
            Calculatrice de lot
          </h1>
          <p className="mt-1 text-sm text-[#4f5a52]">
            Estime la valeur d&apos;un lot, calcule l&apos;offre à payer et
            envoie le devis au client.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/calculatrice/enregistres"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#c9d6c3] bg-white px-4 py-2 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2]"
          >
            <FolderOpen className="h-3.5 w-3.5" aria-hidden />
            Lots enregistrés
          </Link>
          <a
            href={embedSrc}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-medium text-[#257a10] transition-colors hover:bg-[#eaf6e3]"
          >
            Ouvrir en plein écran ↗
          </a>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[#e3eadf] bg-white">
        <iframe
          src={embedSrc}
          title="Calculatrice de lot TechnoLot"
          className="block h-[calc(100vh-11rem)] w-full border-0"
        />
      </div>
    </div>
  );
}
