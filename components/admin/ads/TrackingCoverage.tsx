import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PlatformFilter, TrackingCoverage as Coverage } from "@/lib/ads/types";
import { formatDayLong } from "./PeriodCaption";
import { card, cardSub, cardTitle } from "./ui";

const SOURCES: Record<PlatformFilter, string> = { meta: "Meta", google: "Google Ads", all: "Meta et Google" };

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("fr-CA")} ${n > 1 ? many : one}`;
}

/**
 * Met en regard les formulaires vraiment reçus et ceux que le suivi a pu
 * rattacher à une pub : un « 0 lead » sans suivi actif n'est pas un vrai zéro.
 */
export default function TrackingCoverage({ coverage, platform }: { coverage: Coverage; platform: PlatformFilter }) {
  const { siteForms, attributedLeads, trackingSince, platformConversions } = coverage;
  const unattributed = siteForms === null ? null : Math.max(siteForms - attributedLeads, 0);
  const healthy = trackingSince !== null && (unattributed === null || unattributed === 0 || attributedLeads > 0);
  const Icon = healthy ? CheckCircle2 : AlertTriangle;

  return (
    <section className={card} aria-labelledby="coverage-title">
      <div className="px-5 py-5 sm:px-6">
        <h2 id="coverage-title" className={`${cardTitle} flex items-center gap-2`}>
          <Icon className={`h-4 w-4 shrink-0 ${healthy ? "text-admin-green" : "text-admin-warning"}`} aria-hidden />
          Ce que le suivi voit
        </h2>
        <p className={cardSub}>
          Les leads ci-dessus ne comptent que les formulaires dont la source a pu être enregistrée.
        </p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-admin-line-soft px-4 py-3">
            <dt className="text-[13px] text-admin-muted">Formulaires reçus sur le site</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-admin-ink">
              {siteForms === null ? "—" : siteForms.toLocaleString("fr-CA")}
            </dd>
          </div>
          <div className="rounded-xl border border-admin-line-soft px-4 py-3">
            <dt className="text-[13px] text-admin-muted">Rattachés à une pub {SOURCES[platform]}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-admin-ink">
              {attributedLeads.toLocaleString("fr-CA")}
            </dd>
          </div>
          <div className="rounded-xl border border-admin-line-soft px-4 py-3">
            <dt className="text-[13px] text-admin-muted">Conversions comptées par {SOURCES[platform]}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-admin-ink">
              {platformConversions === null ? "—" : platformConversions.toLocaleString("fr-CA")}
            </dd>
          </div>
        </dl>

        <ul className="mt-4 space-y-1.5 text-[13px] leading-relaxed text-admin-muted">
          <li>
            {trackingSince
              ? `Suivi des sources actif depuis le ${formatDayLong(trackingSince)} : les formulaires reçus avant cette date n'ont pas de source connue.`
              : "Aucune visite suivie pour l'instant : le suivi des sources n'est pas encore actif sur le site en ligne."}
          </li>
          {unattributed !== null && unattributed > 0 && (
            <li>
              {plural(unattributed, "formulaire reçu n'a", "formulaires reçus n'ont")} pas de pub connue (avant le
              suivi, visite directe, référencement naturel ou suivi bloqué par le navigateur).
            </li>
          )}
          {siteForms === null && (
            <li>Le nombre de formulaires reçus n&apos;a pas pu être lu (fonction soumissions_count).</li>
          )}
          {platformConversions !== null && (
            <li>
              Les conversions de la plateforme viennent de sa propre balise (formulaires et appels) : elles restent à
              0 tant que la balise n&apos;est pas sur le site en ligne.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
