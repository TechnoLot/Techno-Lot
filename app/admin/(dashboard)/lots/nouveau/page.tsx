import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewLotTabs from "@/components/admin/NewLotTabs";

export default function NewLotPage() {
  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mb-6">
        <Link
          href="/admin/lots"
          className="inline-flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Retour aux lots
        </Link>
      </div>
      <header className="mb-8 max-w-2xl">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
          Créer
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
          Nouveau lot
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Saisis les informations manuellement, ou colle un courriel et laisse
          l&apos;IA extraire les données automatiquement.
        </p>
      </header>

      <div className="max-w-3xl">
        <NewLotTabs />
      </div>
    </div>
  );
}
