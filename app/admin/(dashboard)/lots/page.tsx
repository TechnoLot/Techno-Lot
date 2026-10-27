import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LotsFilters from "@/components/admin/LotsFilters";
import LotsTable from "@/components/admin/LotsTable";
import PageHeader from "@/components/admin/PageHeader";
import { formatMoney } from "@/lib/admin/format";
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

  const totalSpent = lots.reduce((sum, l) => sum + Number(l.purchase_price), 0);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        eyebrow="Inventaire"
        title="Lots"
        description={
          <>
            {lots.length} lot{lots.length !== 1 ? "s" : ""} affiché
            {lots.length !== 1 ? "s" : ""}
            {lots.length > 0 && <> · {formatMoney(totalSpent)} achetés</>}
            {lots.length === 200 && " (200 plus récents)"}
          </>
        }
        actions={
          <Link href="/admin/lots/nouveau" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#257a10] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f6a0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6bd63b] focus-visible:ring-offset-2 focus-visible:ring-offset-admin-card">
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau lot
          </Link>
        }
      />

      <div className="mb-5">
        <LotsFilters />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          Erreur : {error.message}
        </div>
      )}

      <LotsTable lots={lots} />
    </div>
  );
}
