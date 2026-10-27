import { Info } from "lucide-react";
import { VERDICT_RULES, cutNoLeadThreshold, type Verdict } from "@/lib/ads/verdict";
import { LOT_BEFORE_LEAD_GRACE_DAYS } from "@/lib/ads/queries";
import VerdictPill from "./VerdictPill";
import { card, cardSub, cardTitle } from "./ui";
import { formatCost, formatMoney } from "./format";

/** 50 $ plutôt que 50,00 $ pour les montants ronds */
const money = (v: number) => (Number.isInteger(v) ? formatMoney(v) : formatCost(v));

const pct = (r: number) => `${Math.round(r * 100)} %`;

/** Encadré « Comment on juge une pub » : les règles du verdict en clair. */
export default function VerdictGuide({ avgCpl }: { avgCpl: number | null }) {
  const r = VERDICT_RULES;
  const avg = avgCpl != null && avgCpl > 0 ? avgCpl : null;
  const cutSpend = cutNoLeadThreshold(avg);

  const rules: { verdict: Verdict; text: string }[] = [
    {
      verdict: "rentable",
      text: "Au moins 1 client, et le profit de ses clients couvre ce que la pub a coûté.",
    },
    {
      verdict: "prometteuse",
      text: `Au moins ${r.promisingMinLeads} leads, à un coût par lead d'au plus ${pct(r.promisingMaxCplRatio)} de la moyenne${
        avg ? ` (${formatCost(avg * r.promisingMaxCplRatio)} ou moins)` : ""
      }.`,
    },
    {
      verdict: "couper",
      text: `Aucun lead après ${money(cutSpend)} dépensés (${money(r.cutNoLeadMinSpend)} ou ${r.cutNoLeadCplMultiple} fois la moyenne, le plus élevé), ou un coût par lead d'au moins ${r.cutCplRatio} fois la moyenne${
        avg ? ` (${formatCost(avg * r.cutCplRatio)})` : ""
      } sans aucun client.`,
    },
    {
      verdict: "trop_tot",
      text: `Moins de ${money(r.tooEarlyMaxSpend)} dépensés et aucun lead : on attend.`,
    },
    { verdict: "surveiller", text: "Tout le reste : ni gagnante, ni à couper pour l'instant." },
  ];

  return (
    <section className={`${card} p-5 sm:p-6`} aria-labelledby="verdict-guide-title">
      <h2 id="verdict-guide-title" className={cardTitle}>
        Comment on juge une pub
      </h2>
      <p className={cardSub}>
        {avg ? (
          <>
            Coût par lead moyen de la période :{" "}
            <strong className="font-semibold text-admin-ink">{formatCost(avg)}</strong> (dépenses ÷ leads).
          </>
        ) : (
          <>Pas encore de coût par lead moyen (aucune dépense ou aucun lead) : les règles qui en dépendent ne s&apos;appliquent pas.</>
        )}{" "}
        Chaque pub reçoit la première règle qui s&apos;applique, dans cet ordre.
      </p>

      <ol className="mt-4 divide-y divide-admin-line-soft">
        {rules.map((rule) => (
          <li key={rule.verdict} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:gap-4">
            <span className="sm:w-32 sm:shrink-0">
              <VerdictPill verdict={rule.verdict} />
            </span>
            <span className="text-sm leading-relaxed text-admin-ink [text-wrap:pretty]">{rule.text}</span>
          </li>
        ))}
      </ol>

      <p className="mt-3 flex gap-2 rounded-xl bg-admin-page px-3.5 py-3 text-[13px] leading-relaxed text-admin-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-admin-green" aria-hidden />
        <span>
          Un lead devient <strong className="font-semibold text-admin-ink">client acquis</strong> quand un lot acheté
          ou vendu porte son courriel ou son téléphone, daté du lead ou d&apos;après ({LOT_BEFORE_LEAD_GRACE_DAYS} jours de
          tolérance). Le profit est celui des lots vendus : prix de vente moins prix d&apos;achat.
        </span>
      </p>
    </section>
  );
}
