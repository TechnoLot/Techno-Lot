import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SavedLotsList from "@/components/admin/SavedLotsList";

export const dynamic = "force-dynamic";

type SavedLotRow = {
  id: string;
  name: string;
  data: { items?: unknown[]; date?: string } | null;
  created_at: string;
  updated_at: string;
  created_by_email: string | null;
};

/**
 * Onglet dédié aux lots enregistrés (partagés entre tous les admins via
 * Supabase). Cliquer « Ouvrir » recharge le lot dans la calculatrice.
 */
export default async function LotsEnregistresPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_lots")
    .select("id, name, data, created_at, updated_at, created_by_email")
    .order("updated_at", { ascending: false });

  const lots = (data ?? []) as SavedLotRow[];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/calculatrice"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors hover:text-admin-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Calculatrice
        </Link>
        <Link
          href="/admin/calculatrice"
          className="inline-flex items-center gap-1.5 rounded-full border border-admin-line-strong bg-admin-card px-4 py-2 text-[13px] font-semibold text-admin-ink transition-colors hover:bg-admin-page"
        >
          <Calculator className="h-3.5 w-3.5" aria-hidden />
          Nouveau lot
        </Link>
      </div>

      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-admin-ink sm:text-3xl">
          Lots enregistrés
        </h1>
        <p className="mt-1 text-sm text-admin-muted">
          Partagés entre tous les admins. Clique « Ouvrir » pour rouvrir le lot
          dans la calculatrice.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          Impossible de charger les lots : {error.message}
        </div>
      )}

      <SavedLotsList
        lots={lots.map((l) => ({
          id: l.id,
          name: l.name,
          itemCount: Array.isArray(l.data?.items) ? l.data!.items!.length : 0,
          savedDate: l.data?.date ?? null,
          updatedAt: l.updated_at,
          createdByEmail: l.created_by_email,
        }))}
      />
    </div>
  );
}
