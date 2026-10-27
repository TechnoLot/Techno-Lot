import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewLotTabs from "@/components/admin/NewLotTabs";
import { createClient } from "@/lib/supabase/server";
import type { CalcLotSummary } from "@/components/admin/SavedCalcLots";

export const dynamic = "force-dynamic";

type SavedLotRow = {
  id: string;
  name: string;
  data: {
    items?: { desc: string; qte: number; bas: number | null; moyen: number | null }[];
    usd?: boolean;
    taux?: number;
  } | null;
  updated_at: string;
};

export default async function NewLotPage() {
  const supabase = createClient();
  const { data: savedLotsRaw } = await supabase
    .from("saved_lots")
    .select("id, name, data, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);

  const calcLots: CalcLotSummary[] = ((savedLotsRaw ?? []) as SavedLotRow[]).map((l) => {
    const items = l.data?.items ?? [];
    const usd = l.data?.usd ?? false;
    const taux = usd ? (l.data?.taux ?? 1.37) : 1;
    let totalBas = 0;
    let totalMoyen = 0;
    let unites = 0;
    for (const it of items) {
      unites += it.qte;
      if (it.bas != null) totalBas += it.bas * it.qte * taux;
      if (it.moyen != null) totalMoyen += it.moyen * it.qte * taux;
    }
    const valeurLot = totalBas > 0 ? totalBas : totalMoyen;
    return {
      id: l.id,
      name: l.name,
      offerPrice: Math.round((valeurLot / 2.5) * 100) / 100,
      itemCount: items.length,
      unitCount: unites,
      updatedAt: l.updated_at,
    };
  });

  const descriptions = ((savedLotsRaw ?? []) as SavedLotRow[]).map((l) => {
    const items = l.data?.items ?? [];
    return items
      .filter((it) => it.desc)
      .map((it) => `${it.qte}x ${it.desc}`)
      .join(", ");
  });

  const calcLotsWithDesc = calcLots.map((lot, i) => ({
    ...lot,
    description: descriptions[i] || lot.name,
  }));

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
      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-admin-ink sm:text-4xl">
          Nouveau lot
        </h1>
        <p className="mt-2 text-sm text-admin-muted">
          Saisis les informations manuellement, ou colle un courriel et laisse
          l&apos;IA extraire les données automatiquement.
        </p>
      </header>

      <div className="max-w-3xl">
        <NewLotTabs calcLots={calcLotsWithDesc} />
      </div>
    </div>
  );
}
