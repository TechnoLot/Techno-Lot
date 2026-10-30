import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LotForm from "@/components/admin/LotForm";
import DeleteLotButton from "@/components/admin/DeleteLotButton";
import StatusPill from "@/components/admin/StatusPill";
import { formatDate } from "@/lib/admin/format";
import type { Lot } from "@/lib/admin/types";

export const dynamic = "force-dynamic";

export default async function EditLotPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lots")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) notFound();
  const lot = data as Lot;

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mb-6">
        <Link
          href="/admin/lots"
          className="inline-flex items-center gap-2 text-sm font-medium text-admin-muted transition-colors hover:text-admin-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Retour aux lots
        </Link>
      </div>

      <header className="mb-8 flex max-w-3xl flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-admin-ink sm:text-4xl">
              {lot.client_name}
            </h1>
            <StatusPill status={lot.status} />
          </div>
          <p className="mt-2 text-sm text-admin-muted">
            Acheté le {formatDate(lot.purchased_at)} • source : {lot.source}
          </p>
        </div>
        <DeleteLotButton id={lot.id} />
      </header>

      <div className="max-w-3xl rounded-2xl border border-admin-line bg-admin-card p-5 sm:p-8">
        <LotForm
          mode="edit"
          lotId={lot.id}
          initial={{
            client_name: lot.client_name,
            client_email: lot.client_email,
            client_phone: lot.client_phone,
            purchase_price: Number(lot.purchase_price),
            sale_price:
              lot.sale_price != null ? Number(lot.sale_price) : null,
            status: lot.status,
            purchased_at: lot.purchased_at,
            sold_at: lot.sold_at,
            description: lot.description,
            notes: lot.notes,
          }}
        />
      </div>
    </div>
  );
}
