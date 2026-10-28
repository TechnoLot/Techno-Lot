import { Inbox, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import SoumissionsFilters from "@/components/admin/soumissions/SoumissionsFilters";
import SoumissionsList from "@/components/admin/soumissions/SoumissionsList";
import { formatCount } from "@/lib/admin/format";
import {
  FILTRES_SOUMISSIONS,
  estATraiter,
  fetchSoumissions,
  type FiltreSoumissions,
  type Soumission,
} from "@/lib/admin/soumissions";

export const dynamic = "force-dynamic";

/** Minuscules sans accents, pour la recherche. */
function normaliser(v: string): string {
  return v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Nom, courriel, entreprise, ville et message ; le téléphone se cherche par ses chiffres. */
function correspond(s: Soumission, q: string): boolean {
  const texte = normaliser(
    [s.nom, s.courriel, s.entreprise, s.ville, s.message].filter(Boolean).join(" "),
  );
  if (texte.includes(normaliser(q))) return true;
  const chiffres = q.replace(/\D/g, "");
  return chiffres.length >= 3 && (s.telephone ?? "").replace(/\D/g, "").includes(chiffres);
}

/**
 * Onglet Soumissions : toutes les demandes du formulaire du site (table
 * soumissions, remplie à chaque envoi en même temps que le courriel), avec
 * leur état (à traiter, lot créé) et les actions pour y répondre.
 */
export default async function SoumissionsPage({
  searchParams,
}: {
  searchParams: { q?: string; statut?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { readable, error, rows } = await fetchSoumissions(user);

  const now = new Date();
  const q = searchParams.q?.trim() ?? "";
  const filtre: FiltreSoumissions = FILTRES_SOUMISSIONS.includes(
    searchParams.statut as FiltreSoumissions,
  )
    ? (searchParams.statut as FiltreSoumissions)
    : "toutes";

  const aTraiter = rows.filter((s) => estATraiter(s, now));
  const avecLot = rows.filter((s) => s.lotId !== null);
  const parFiltre = filtre === "a-traiter" ? aTraiter : filtre === "lot-cree" ? avecLot : rows;
  const affichees = q ? parFiltre.filter((s) => correspond(s, q)) : parFiltre;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        eyebrow="Formulaire du site"
        title="Soumissions"
        description={
          readable ? (
            <>
              {formatCount(rows.length)} demande{rows.length !== 1 ? "s" : ""} reçue
              {rows.length !== 1 ? "s" : ""} · {formatCount(aTraiter.length)} à traiter. Chaque
              demande du formulaire arrive ici en même temps que dans ta boîte courriel.
            </>
          ) : (
            "Les demandes envoyées par le formulaire de soumission du site."
          )
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          Impossible de lire les soumissions : {error}
        </div>
      )}

      {!readable && !error && (
        <div className="flex gap-3 rounded-2xl border border-admin-tint-amber-line bg-admin-tint-amber px-4 py-4 sm:px-5">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-admin-warning" aria-hidden />
          <div className="text-sm text-admin-ink">
            <p className="font-semibold">Lecture des soumissions à activer</p>
            <p className="mt-1 leading-relaxed text-admin-muted">
              Chaque demande du formulaire est bien enregistrée, mais le tableau de bord n&apos;a pas
              encore la clé pour les lire. Ajoute la clé secrète Supabase dans la variable{" "}
              <code className="rounded bg-admin-card px-1 py-0.5 text-[12px] text-admin-ink">
                SUPABASE_SERVICE_ROLE_KEY
              </code>{" "}
              du serveur (Supabase → Project Settings → API Keys), puis redémarre le site. En
              attendant, les demandes arrivent toujours dans ta boîte courriel.
            </p>
          </div>
        </div>
      )}

      {readable && (
        <>
          <div className="mb-6">
            <SoumissionsFilters
              counts={{ toutes: rows.length, "a-traiter": aTraiter.length, "lot-cree": avecLot.length }}
            />
          </div>

          {affichees.length === 0 ? (
            <div className="rounded-2xl border border-admin-line bg-admin-card px-5 py-12 text-center">
              <Inbox className="mx-auto h-7 w-7 text-admin-faint" aria-hidden />
              <p className="mt-2 text-sm text-admin-muted">
                {q
                  ? `Aucune soumission ne correspond à « ${q} ».`
                  : filtre === "a-traiter"
                    ? "Aucune soumission à traiter. Tout est à jour."
                    : "Aucune soumission pour l'instant."}
              </p>
            </div>
          ) : (
            <SoumissionsList rows={affichees} now={now} />
          )}
        </>
      )}
    </div>
  );
}
