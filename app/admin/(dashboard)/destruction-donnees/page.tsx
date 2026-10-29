import type { Metadata } from "next";
import PageHeader from "@/components/admin/PageHeader";
import DestructionDonnees from "@/components/admin/destruction/DestructionDonnees";
import { createClient } from "@/lib/supabase/server";
import { prochainNumero, type CertificatDestruction } from "@/lib/admin/destruction";
import { torontoDay } from "@/lib/ebay/totaux";

export const metadata: Metadata = {
  title: "Destruction des données — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Certificats de destruction des données remis aux clients (table certificats_destruction). */
export default async function DestructionDonneesPage() {
  const supabase = createClient();
  const aujourdhui = torontoDay();
  const annee = aujourdhui.slice(0, 4);

  const [liste, numeros] = await Promise.all([
    supabase
      .from("certificats_destruction")
      .select("id, numero, compagnie, adresse, materiel, nb_appareils, date_destruction, date_emission, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("certificats_destruction").select("numero").like("numero", `TL-${annee}-%`),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        eyebrow="eBay"
        title="Destruction des données"
        description="Le certificat à remettre au client : données détruites et certifiées avec KillDisk. Remplis le formulaire, puis télécharge-le en PDF ou en photo."
      />
      <DestructionDonnees
        certificats={(liste.data ?? []) as CertificatDestruction[]}
        prochainNumero={prochainNumero(
          ((numeros.data ?? []) as { numero: string }[]).map((n) => n.numero),
          annee,
        )}
        aujourdhui={aujourdhui}
        erreurListe={liste.error?.message ?? null}
      />
    </div>
  );
}
