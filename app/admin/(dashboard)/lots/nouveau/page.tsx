import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewLotTabs, { type FromSoumission } from "@/components/admin/NewLotTabs";
import { exigerAdminPage } from "@/lib/securite/garde";
import { fetchSoumission, type Soumission } from "@/lib/admin/soumissions";
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

/** Valeurs du formulaire tirées d'une soumission du site (client, description, notes). */
function depuisSoumission(s: Soumission): FromSoumission {
  const recue = new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Toronto",
  }).format(new Date(s.date));
  const notes = [
    `Soumission du site reçue le ${recue}.`,
    s.entreprise && s.nom ? `Contact : ${s.nom}` : null,
    s.fichiers.length > 0 ? `Pièces jointes (dans le courriel) : ${s.fichiers.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    id: s.id,
    resume: `${s.nom || "Sans nom"}, reçue le ${recue}`,
    lotId: s.lotId,
    initial: {
      client_name: s.entreprise ?? s.nom ?? "",
      client_email: s.courriel,
      client_phone: s.telephone,
      description: s.message,
      notes,
      status: "negotiating",
    },
  };
}

export default async function NewLotPage(
  props: {
    searchParams: Promise<{ soumission?: string }>;
  }
) {
  const { supabase } = await exigerAdminPage("/admin/lots/nouveau");
  const searchParams = await props.searchParams;
  const { data: savedLotsRaw } = await supabase
    .from("saved_lots")
    .select("id, name, data, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);
  // « Créer le lot » depuis l'onglet Soumissions : formulaire pré-rempli et lot lié.
  const soumission = searchParams.soumission
    ? await fetchSoumission(supabase, searchParams.soumission)
    : null;
  const fromSoumission = soumission ? depuisSoumission(soumission) : undefined;

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
          href={fromSoumission ? "/admin/soumissions" : "/admin/lots"}
          className="inline-flex items-center gap-2 text-sm font-medium text-admin-muted transition-colors hover:text-admin-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {fromSoumission ? "Retour aux soumissions" : "Retour aux lots"}
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
        <NewLotTabs calcLots={calcLotsWithDesc} fromSoumission={fromSoumission} />
      </div>
    </div>
  );
}
