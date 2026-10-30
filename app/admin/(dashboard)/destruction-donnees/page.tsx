import type { Metadata } from "next";
import PageHeader from "@/components/admin/PageHeader";
import DestructionDonnees from "@/components/admin/destruction/DestructionDonnees";
import { createClient } from "@/lib/supabase/server";
import {
  COLONNES_CERTIFICAT,
  prochainNumero,
  type CertificatDestruction,
  type ClientCertificat,
} from "@/lib/admin/destruction";
import { torontoDay } from "@/lib/ebay/totaux";

export const metadata: Metadata = {
  title: "Destruction des données — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Certificats de destruction des données remis aux clients (table
 * certificats_destruction). Depuis la fiche client : ?client=<id> prépare un
 * certificat pour cette compagnie, ?certificat=<id> rouvre un certificat.
 */
export default async function DestructionDonneesPage(
  props: {
    searchParams: Promise<{ certificat?: string; client?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const aujourdhui = torontoDay();
  const annee = aujourdhui.slice(0, 4);
  const idCertificat = searchParams.certificat && UUID.test(searchParams.certificat) ? searchParams.certificat : null;
  const idClient = searchParams.client && UUID.test(searchParams.client) ? searchParams.client : null;

  const [liste, compteur, numeros] = await Promise.all([
    supabase
      .from("certificats_destruction")
      .select(COLONNES_CERTIFICAT)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("certificats_destruction_compteurs").select("dernier").eq("annee", Number(annee)).maybeSingle(),
    supabase.from("certificats_destruction").select("numero").like("numero", `TL-${annee}-%`),
  ]);
  const certificats = (liste.data ?? []) as unknown as CertificatDestruction[];

  let certificatInitial: CertificatDestruction | null = null;
  if (idCertificat) {
    certificatInitial =
      certificats.find((c) => c.id === idCertificat) ??
      ((await supabase.from("certificats_destruction").select(COLONNES_CERTIFICAT).eq("id", idCertificat).maybeSingle())
        .data as unknown as CertificatDestruction | null);
  }

  let clientInitial: ClientCertificat | null = null;
  if (idClient && !certificatInitial) {
    const { data } = await supabase
      .from("companies")
      .select("id, name, street_address, research_status")
      .eq("id", idClient)
      .maybeSingle();
    if (data) {
      clientInitial = {
        id: data.id as string,
        nom: data.name as string,
        adresse: (data.street_address as string | null) ?? "",
        client: data.research_status === "converted",
      };
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        eyebrow="eBay"
        title="Destruction des données"
        description="Le certificat à remettre au client : données détruites et certifiées avec KillDisk. Remplis le formulaire, puis télécharge-le en PDF ou en photo."
      />
      <DestructionDonnees
        certificats={certificats}
        prochainNumero={prochainNumero(
          annee,
          (compteur.data?.dernier as number | undefined) ?? null,
          ((numeros.data ?? []) as { numero: string }[]).map((n) => n.numero),
        )}
        aujourdhui={aujourdhui}
        erreurListe={liste.error?.message ?? null}
        certificatInitial={certificatInitial}
        clientInitial={clientInitial}
      />
    </div>
  );
}
