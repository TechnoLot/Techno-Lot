import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Handshake, Phone } from "lucide-react";
import { exigerAdminPage } from "@/lib/securite/garde";
import { journaliserErreur } from "@/lib/admin/erreurs-admin";
import CarnetActions from "@/components/admin/crm/CarnetActions";
import Pagination from "@/components/admin/Pagination";
import { pageDepuisParam, paginer, resumePage } from "@/lib/admin/pagination";
import { derniersContacts, lireCarnet } from "@/lib/acheteurs/lecture";
import { LIBELLES_CONFIANCE, type AcheteurCarnet } from "@/lib/acheteurs/types";

export const dynamic = "force-dynamic";

const PAR_PAGE = 25;
const PILL = "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold";
const LIEN = "admin-focus inline-flex items-center gap-1 rounded text-admin-muted hover:text-admin-ink hover:underline";
const jourFmt = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Toronto" });

/** Filtres de pays (paramètre ?pays=). */
const PAYS = [
  { cle: "tous", libelle: "Tous" },
  { cle: "CA", libelle: "Canada" },
  { cle: "US", libelle: "États-Unis" },
  { cle: "autres", libelle: "Ailleurs" },
] as const;

function normaliser(v: string): string {
  return v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function correspond(a: AcheteurCarnet, q: string): boolean {
  return normaliser([a.nom, a.domaine, a.ville, a.region, ...a.categories, ...a.modeles].filter(Boolean).join(" ")).includes(
    normaliser(q),
  );
}

function lienSur(url: string | null): string | null {
  return url && url.startsWith("https://") ? url : null;
}

/**
 * CRM → Acheteurs : le carnet des compagnies qui rachètent des lots en gros,
 * rempli par l'agent « Acheteurs » (onglet Soumissions). Une fiche par
 * domaine ; « Vérifié » quand l'admin a confirmé les coordonnées.
 */
export default async function AcheteursPage(props: {
  searchParams: Promise<{ q?: string; pays?: string; page?: string }>;
}) {
  const ctx = await exigerAdminPage("/admin/crm/acheteurs");
  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() ?? "";
  const pays = PAYS.some((p) => p.cle === searchParams.pays) ? (searchParams.pays as (typeof PAYS)[number]["cle"]) : "tous";

  const { acheteurs: tous, erreur: error } = await lireCarnet(ctx.supabase);
  const ref = error ? await journaliserErreur(error, "acheteurs.carnet_lire", ctx) : null;

  const filtres = tous.filter(
    (a) =>
      (pays === "tous" ||
        (pays === "autres" ? a.pays !== "CA" && a.pays !== "US" : a.pays === pays)) &&
      (!q || correspond(a, q)),
  );
  const pagination = paginer(filtres, pageDepuisParam(searchParams.page), PAR_PAGE);
  const contacts = await derniersContacts(
    ctx.supabase,
    pagination.items.map((a) => a.courriel).filter((c): c is string => Boolean(c)),
  );
  const verifies = tous.filter((a) => a.verifie).length;

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <Link
        href="/admin/crm"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-muted transition-colors hover:text-admin-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Prospection
      </Link>

      <header className="mb-6 mt-4">
        <h1 className="font-display text-3xl font-bold text-admin-ink sm:text-4xl">Acheteurs</h1>
        <p className="mt-2 max-w-2xl text-sm text-admin-muted">
          Les compagnies qui rachètent des lots en gros, trouvées par les recherches d&apos;acheteurs des
          soumissions. {tous.length} au carnet, dont {verifies} vérifiée{verifies > 1 ? "s" : ""}.
        </p>
      </header>

      {ref && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-admin-tint-red-line bg-admin-tint-red px-4 py-3 text-sm text-admin-danger"
        >
          Impossible de charger le carnet. Réf. : {ref}
        </div>
      )}

      <form method="get" className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Compagnie, ville, modèle…"
          aria-label="Chercher dans le carnet"
          className="field max-w-xs"
        />
        {pays !== "tous" && <input type="hidden" name="pays" value={pays} />}
        <button type="submit" className="admin-btn">
          Chercher
        </button>
        <nav aria-label="Pays" className="flex flex-wrap gap-1.5 sm:ml-auto">
          {PAYS.map((p) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (p.cle !== "tous") params.set("pays", p.cle);
            const actif = p.cle === pays;
            return (
              <Link
                key={p.cle}
                href={`/admin/crm/acheteurs${params.size ? `?${params}` : ""}`}
                aria-current={actif ? "page" : undefined}
                className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                  actif
                    ? "border-transparent bg-admin-tint-green text-admin-green"
                    : "border-admin-line bg-admin-card text-admin-muted hover:text-admin-ink"
                }`}
              >
                {p.libelle}
              </Link>
            );
          })}
        </nav>
      </form>

      {filtres.length === 0 ? (
        <div className="glass p-12 text-center">
          <Handshake className="mx-auto h-8 w-8 text-admin-faint" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold text-admin-ink">
            {tous.length === 0 ? "Le carnet est vide pour l'instant" : "Aucune compagnie ne correspond"}
          </p>
          <p className="mt-2 text-sm text-admin-muted">
            {tous.length === 0
              ? "Dans l'onglet Soumissions, répondez « Oui, chercher » sur une soumission : les compagnies trouvées arriveront ici."
              : "Essayez un autre mot ou un autre pays."}
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {pagination.items.map((a) => {
              const lieu = [a.ville, a.region, a.pays].filter(Boolean).join(", ");
              const site = lienSur(a.site);
              const formulaire = lienSur(a.formulaire);
              const preuve = lienSur(a.sources[0] ?? null);
              const joint = a.courriel ? contacts.get(a.courriel.toLowerCase()) : undefined;
              return (
                <li key={a.id} className="rounded-2xl border border-admin-line bg-admin-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-semibold text-admin-ink">{a.nom}</h2>
                        {lieu && <span className="text-[13px] text-admin-muted">{lieu}</span>}
                        <span
                          className={`${PILL} ${a.confiance === "achete_surplus" ? "bg-admin-tint-green text-admin-green" : "bg-admin-tint-amber text-admin-warning"}`}
                        >
                          {LIBELLES_CONFIANCE[a.confiance]}
                        </span>
                        {joint && (
                          <span className={`${PILL} bg-admin-tint-gray text-admin-muted`}>
                            Dernier contact le {jourFmt.format(new Date(joint))}
                          </span>
                        )}
                      </div>
                      {a.categories.length > 0 && (
                        <p className="mt-1 text-[13px] text-admin-muted" title={a.modeles.join("\n") || undefined}>
                          Achète : {a.categories.join(" · ")}
                        </p>
                      )}
                      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                        {a.courriel && <span className="break-all text-admin-ink">{a.courriel}</span>}
                        {a.telephone && (
                          <a href={`tel:${a.telephone.replace(/[^\d+]/g, "")}`} className={LIEN}>
                            <Phone className="h-3 w-3" aria-hidden />
                            {a.telephone}
                          </a>
                        )}
                        {formulaire && (
                          <a href={formulaire} target="_blank" rel="noopener noreferrer" className={LIEN}>
                            <FileText className="h-3 w-3" aria-hidden />
                            Formulaire
                          </a>
                        )}
                        {preuve && (
                          <a href={preuve} target="_blank" rel="noopener noreferrer" className={LIEN}>
                            Preuve
                          </a>
                        )}
                        {site && (
                          <a href={site} target="_blank" rel="noopener noreferrer" className={LIEN}>
                            <ExternalLink className="h-3 w-3" aria-hidden />
                            {a.domaine}
                          </a>
                        )}
                      </p>
                    </div>
                    <CarnetActions id={a.id} nom={a.nom} verifie={a.verifie} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 flex flex-col items-center gap-2">
            <Pagination page={pagination.page} pageCount={pagination.pageCount} />
            <p className="text-[13px] tabular-nums text-admin-muted">
              {resumePage(pagination.page, PAR_PAGE, pagination.total)} compagnies
            </p>
          </div>
        </>
      )}
    </div>
  );
}
