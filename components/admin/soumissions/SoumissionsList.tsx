import Link from "next/link";
import { ExternalLink, Package, Paperclip, Phone, Plus } from "lucide-react";
import MessageApercu from "@/components/admin/soumissions/MessageApercu";
import SupprimerSoumission from "@/components/admin/soumissions/SupprimerSoumission";
import VoirCourriel from "@/components/admin/soumissions/VoirCourriel";
import { WEBMAIL_URL } from "@/lib/admin/config";
import { formatCount } from "@/lib/admin/format";
import { A_TRAITER_JOURS, estATraiter, type Soumission } from "@/lib/admin/soumissions";

const TZ = "America/Toronto";

/** Une demande sans lot est « nouvelle » pendant 48 h. */
const NOUVELLE_MS = 48 * 3_600_000;

function formatDateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** « Octobre 2026 » */
function formatMois(iso: string): string {
  const mois = new Intl.DateTimeFormat("fr-CA", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
  return mois.charAt(0).toUpperCase() + mois.slice(1);
}

/** Regroupe par mois de réception (la liste arrive déjà triée, plus récentes d'abord). */
function parMois(rows: Soumission[]): { mois: string; rows: Soumission[] }[] {
  const groupes: { mois: string; rows: Soumission[] }[] = [];
  for (const s of rows) {
    const mois = formatMois(s.date);
    const dernier = groupes[groupes.length - 1];
    if (dernier?.mois === mois) dernier.rows.push(s);
    else groupes.push({ mois, rows: [s] });
  }
  return groupes;
}

const PILL = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium";

function Etat({ s, now }: { s: Soumission; now: Date }) {
  if (s.lotId) {
    return (
      <span className={`${PILL} bg-admin-tint-green text-admin-green`}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#4fae2a]" aria-hidden />
        Lot créé
      </span>
    );
  }
  if (estATraiter(s, now)) {
    return (
      <span className={`${PILL} bg-admin-tint-amber text-admin-warning`}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#f79009]" aria-hidden />
        À traiter
      </span>
    );
  }
  return (
    <span
      className={`${PILL} bg-admin-tint-gray text-admin-muted`}
      title={`Reçue il y a plus de ${A_TRAITER_JOURS} jours, sans lot`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#98a29a]" aria-hidden />
      Sans lot
    </span>
  );
}

function SoumissionCard({ s, now, courrielApi }: { s: Soumission; now: Date; courrielApi: boolean }) {
  const nouvelle = !s.lotId && now.getTime() - Date.parse(s.date) < NOUVELLE_MS;
  const sousTitre = [s.entreprise, s.ville].filter(Boolean).join(" · ");

  return (
    <article className="rounded-2xl border border-admin-line bg-admin-card p-4 sm:p-5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-[16px] font-semibold text-admin-ink">
              {s.nom || "Sans nom"}
            </h3>
            {nouvelle && (
              <span className="rounded-full bg-[#6bd63b] px-2 py-0.5 text-[11px] font-semibold text-[#0a0a0a]">
                Nouvelle
              </span>
            )}
            <Etat s={s} now={now} />
            {s.locale === "en" && (
              <span
                className="rounded-full border border-admin-line px-2 py-0.5 text-[11px] font-semibold text-admin-muted"
                title="Formulaire rempli en anglais"
              >
                EN
              </span>
            )}
          </div>
          {sousTitre && <p className="mt-0.5 text-[13px] text-admin-muted">{sousTitre}</p>}
        </div>
        <time dateTime={s.date} className="shrink-0 text-[13px] text-admin-muted">
          {formatDateHeure(s.date)}
        </time>
      </div>

      {(s.courriel || s.telephone) && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
          {s.courriel && <span className="break-all text-admin-ink">{s.courriel}</span>}
          {s.telephone && (
            <a
              href={`tel:${s.telephone.replace(/[^\d+]/g, "")}`}
              className="admin-focus rounded tabular-nums text-admin-ink hover:underline"
            >
              {s.telephone}
            </a>
          )}
        </p>
      )}

      {s.message && <MessageApercu texte={s.message} />}

      {s.fichiers.length > 0 && (
        <div className="mt-3">
          <p className="text-[12px] text-admin-muted">
            Pièces jointes ({s.fichiers.length}) : à ouvrir dans le courriel reçu
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {s.fichiers.map((f, i) => (
              <li
                key={`${f}-${i}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-admin-line bg-admin-page px-2.5 py-1 text-[12px] text-admin-ink"
              >
                <Paperclip className="h-3 w-3 shrink-0 text-admin-muted" aria-hidden />
                <span className="truncate">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {courrielApi && <VoirCourriel soumissionId={s.id} nom={s.nom} />}
        <a
          href={courrielApi ? `/api/admin/soumissions/${s.id}/courriel/hostinger` : WEBMAIL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn"
          title="Ouvre le courriel dans le webmail Hostinger (info@technolot.ca), dans un nouvel onglet"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Ouvrir dans Hostinger
        </a>
        {s.telephone && (
          <a href={`tel:${s.telephone.replace(/[^\d+]/g, "")}`} className="admin-btn">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Appeler
          </a>
        )}
        {s.lotId ? (
          <Link href={`/admin/lots/${s.lotId}`} className="admin-btn">
            <Package className="h-3.5 w-3.5" aria-hidden />
            Voir le lot
          </Link>
        ) : (
          <Link href={`/admin/lots/nouveau?soumission=${s.id}`} className="admin-btn-accent">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Créer le lot
          </Link>
        )}
        <div className="ml-auto">
          <SupprimerSoumission id={s.id} nom={s.nom} />
        </div>
      </div>
    </article>
  );
}

/**
 * Liste des soumissions, regroupées par mois, chacune en carte avec ses actions.
 * `courrielApi` : Mail API Hostinger branchée, le courriel reçu s’ouvre dans l’admin.
 */
export default function SoumissionsList({
  rows,
  now,
  courrielApi,
}: {
  rows: Soumission[];
  now: Date;
  courrielApi: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      {parMois(rows).map((groupe) => (
        <section key={groupe.mois} aria-label={groupe.mois}>
          <h2 className="mb-3 flex items-baseline gap-2 font-display text-lg font-semibold tracking-tight text-admin-ink">
            {groupe.mois}
            <span className="text-[13px] font-normal tabular-nums text-admin-muted">
              {formatCount(groupe.rows.length)}
            </span>
          </h2>
          <ul className="flex flex-col gap-3">
            {groupe.rows.map((s) => (
              <li key={s.id}>
                <SoumissionCard s={s} now={now} courrielApi={courrielApi} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
