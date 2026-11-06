import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewLotTabs, { type CalcLotWithDesc, type FromSoumission } from "@/components/admin/NewLotTabs";
import { exigerAdminPage } from "@/lib/securite/garde";
import { fetchSoumission, type Soumission } from "@/lib/admin/soumissions";
import { resumeLotCalculatrice } from "@/lib/admin/calculatrice";

export const dynamic = "force-dynamic";

type SavedLotRow = {
  id: string;
  name: string;
  data: unknown;
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
  // Le lot de calculatrice de cette soumission, même s'il n'est pas parmi les 20 derniers.
  const lotsCalcul = (savedLotsRaw ?? []) as SavedLotRow[];
  if (soumission) {
    const { data: lie } = await supabase
      .from("saved_lots")
      .select("id, name, data, updated_at")
      .eq("data->>soumissionId", soumission.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lie && !lotsCalcul.some((l) => l.id === (lie as SavedLotRow).id)) lotsCalcul.unshift(lie as SavedLotRow);
  }

  // Prix à payer décidé dans la calculatrice (les anciens lots n'en ont pas).
  const calcLotsWithDesc: CalcLotWithDesc[] = lotsCalcul.map((l) => {
    const r = resumeLotCalculatrice(l.data);
    return {
      id: l.id,
      name: l.name,
      offerPrice: r.offre,
      value: r.valeur,
      itemCount: r.items,
      unitCount: r.unites,
      updatedAt: l.updated_at,
      soumissionId: r.soumissionId,
      description: r.description || l.name,
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
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
        <h1 className="admin-h1">
          Nouveau lot
        </h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-admin-muted">
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
