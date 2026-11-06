import { Inbox } from "lucide-react";
import { exigerAdminPage } from "@/lib/securite/garde";
import { journaliserErreur } from "@/lib/admin/erreurs-admin";
import PageHeader from "@/components/admin/PageHeader";
import Pagination from "@/components/admin/Pagination";
import SoumissionsFilters from "@/components/admin/soumissions/SoumissionsFilters";
import SoumissionsList, { type DonneesAcheteurs } from "@/components/admin/soumissions/SoumissionsList";
import { derniersContacts, lireAcheteursParDomaines, lireLectures, lireRecherches } from "@/lib/acheteurs/lecture";
import type { ContexteAdmin } from "@/lib/securite/garde";
import { formatCount } from "@/lib/admin/format";
import { isMailApiConfigured } from "@/lib/hostinger/config";
import { pageDepuisParam, paginer, resumePage } from "@/lib/admin/pagination";
import {
  FILTRES_SOUMISSIONS,
  estATraiter,
  fetchSoumissions,
  type FiltreSoumissions,
  type Soumission,
} from "@/lib/admin/soumissions";

export const dynamic = "force-dynamic";

const PAR_PAGE = 10;

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
 * Agent « Acheteurs » des demandes affichées : recherche de chaque demande,
 * fiches du carnet citées et dernier échange avec chaque compagnie. null si
 * les tables sont illisibles (journalisé) : les cartes s'affichent sans la section.
 * Lectures des pièces jointes illisibles : journalisé, et la section reste, sans elles.
 */
async function donneesAcheteurs(ctx: ContexteAdmin, ids: string[]): Promise<DonneesAcheteurs | null> {
  const { recherches, erreur } = await lireRecherches(ctx.supabase, ids);
  if (erreur) {
    await journaliserErreur(erreur, "acheteurs.recherches_lire", ctx);
    return null;
  }
  const { lectures, erreur: erreurLectures } = await lireLectures(ctx.supabase, ids);
  if (erreurLectures) await journaliserErreur(erreurLectures, "acheteurs.lectures_lire", ctx);
  const domaines = [...recherches.values()].flatMap((r) =>
    (r.resultats?.familles ?? []).flatMap((f) => f.acheteurs.map((a) => a.domaine)),
  );
  const fiches = await lireAcheteursParDomaines(ctx.supabase, domaines);
  const courriels = [...fiches.values()].map((a) => a.courriel).filter((c): c is string => Boolean(c));
  const contacts = await derniersContacts(ctx.supabase, courriels);
  return {
    recherches: Object.fromEntries(recherches),
    lectures: erreurLectures ? {} : Object.fromEntries(lectures),
    acheteurs: Object.fromEntries(fiches),
    contacts: Object.fromEntries(contacts),
  };
}

/**
 * Onglet Soumissions : toutes les demandes du formulaire du site (table
 * soumissions, remplie à chaque envoi en même temps que le courriel), avec
 * leur état (à traiter, lot créé) et les actions pour y répondre.
 */
export default async function SoumissionsPage(
  props: {
    searchParams: Promise<{ q?: string; statut?: string; page?: string }>;
  }
) {
  const ctx = await exigerAdminPage("/admin/soumissions");
  const searchParams = await props.searchParams;
  const { error, rows } = await fetchSoumissions(ctx.supabase);

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
  const pagination = paginer(affichees, pageDepuisParam(searchParams.page), PAR_PAGE);
  const agent = error ? null : await donneesAcheteurs(ctx, pagination.items.map((s) => s.id));

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <PageHeader
        title="Soumissions"
        description={
          !error ? (
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
          Impossible de lire les soumissions. Réf. : {await journaliserErreur(error, "soumissions.lire", ctx)}
        </div>
      )}

      {!error && (
        <>
          <div className="mb-6">
            <SoumissionsFilters
              counts={{ toutes: rows.length, "a-traiter": aTraiter.length, "lot-cree": avecLot.length }}
            />
          </div>

          {affichees.length === 0 ? (
            <div className="rounded-2xl border border-admin-line bg-admin-card px-5 py-12 text-center">
              <Inbox className="mx-auto h-7 w-7 text-admin-faint" aria-hidden />
              <p className="mt-1.5 text-[15px] leading-relaxed text-admin-muted">
                {q
                  ? `Aucune soumission ne correspond à « ${q} ».`
                  : filtre === "a-traiter"
                    ? "Aucune soumission à traiter. Tout est à jour."
                    : "Aucune soumission pour l'instant."}
              </p>
            </div>
          ) : (
            <>
              <SoumissionsList
                rows={pagination.items}
                now={now}
                courrielApi={isMailApiConfigured()}
                agent={agent}
              />
              <div className="mt-8 flex flex-col items-center gap-2">
                <Pagination page={pagination.page} pageCount={pagination.pageCount} />
                <p className="text-[13px] text-admin-muted tabular-nums">
                  {resumePage(pagination.page, PAR_PAGE, pagination.total)} demandes
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
