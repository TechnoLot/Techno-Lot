import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LotsFilters from "@/components/admin/LotsFilters";
import LotsTable from "@/components/admin/LotsTable";
import type { Lot, LotStatus } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: LotStatus[] = [
  "negotiating",
  "purchased",
  "sold",
  "cancelled",
];

export default async function LotsListPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q?.trim() ?? "";
  const statusParam = searchParams.status;
  const status = VALID_STATUSES.includes(statusParam as LotStatus)
    ? (statusParam as LotStatus)
    : null;

  let query = supabase
    .from("lots")
    .select("*")
    .order("purchased_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("client_name", `%${q}%`);

  const { data, error } = await query;
  const lots = (data ?? []) as Lot[];

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
            Inventaire
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            Lots
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {lots.length} lot{lots.length !== 1 ? "s" : ""} affiché
            {lots.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <Link
          href="/admin/lots/nouveau"
          className="btn-primary w-fit !px-4 !py-2.5 !text-xs"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouveau lot
        </Link>
      </header>

      <div className="mb-6">
        <LotsFilters />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          Erreur : {error.message}
        </div>
      )}

      <LotsTable lots={lots} />
    </div>
  );
}
