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

export default async function EditLotPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
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
          className="inline-flex items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Retour aux lots
        </Link>
      </div>

      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
              Modifier
            </p>
            <StatusPill status={lot.status} />
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            {lot.client_name}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Acheté le {formatDate(lot.purchased_at)} • source : {lot.source}
          </p>
        </div>
        <DeleteLotButton id={lot.id} />
      </header>

      <div className="glass max-w-3xl p-6 sm:p-8">
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
