import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import EbayAutoSync from "@/components/admin/ebay/EbayAutoSync";
import { formatCount, formatMoney } from "@/lib/admin/format";
import type { EbaySums } from "@/lib/ebay/totaux";

type Carte = {
  label: string;
  /** Grand chiffre déjà formaté (« — » si indisponible) */
  valeur: string;
  hint: string;
  href: string;
  /** Mise en avant (lime, texte encre) */
  featured?: boolean;
};

/**
 * « Aujourd’hui » : ventes eBay du jour (heure de Toronto), soumissions à
 * traiter et suivis à faire, puis une ligne de liens vers les lots à finir.
 */
export default function Aujourdhui({
  ebay,
  soumissions,
  suivis,
  negociation,
  prixASaisir,
}: {
  ebay: { configured: boolean; lastSync: string | null; today: EbaySums; yesterday: EbaySums };
  soumissions: { count: number | null; hint: string; href: string };
  suivis: number;
  negociation: number;
  prixASaisir: number;
}) {
  const cartes: Carte[] = [
    ebay.configured
      ? {
          label: "Ventes eBay aujourd’hui",
          valeur: formatMoney(ebay.today.revenue, true),
          hint: `${formatCount(ebay.today.orders)} commande${ebay.today.orders > 1 ? "s" : ""} · hier ${formatMoney(
            ebay.yesterday.revenue,
            true,
          )}`,
          href: "/admin/ventes-ebay?periode=aujourdhui",
          featured: true,
        }
      : {
          label: "Ventes eBay aujourd’hui",
          valeur: "—",
          hint: "eBay pas encore connecté",
          href: "/admin/ventes-ebay",
        },
    {
      label: "Soumissions à traiter",
      valeur: soumissions.count === null ? "—" : formatCount(soumissions.count),
      hint: soumissions.hint,
      href: soumissions.href,
    },
    {
      label: "Suivis à faire",
      valeur: formatCount(suivis),
      hint: "Prospects à relancer",
      href: "/admin/crm/suivis",
    },
  ];

  const liens = [
    negociation > 0 && {
      href: "/admin/lots?status=negotiating",
      label: `${formatCount(negociation)} lot${negociation > 1 ? "s" : ""} en négociation`,
    },
    prixASaisir > 0 && {
      href: "/admin/lots?status=purchased",
      label: `${formatCount(prixASaisir)} prix de vente à saisir`,
    },
  ].filter((l): l is { href: string; label: string } => Boolean(l));

  return (
    <section aria-labelledby="aujourdhui-titre">
      <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="aujourdhui-titre"
          className="font-display text-lg font-semibold tracking-tight text-admin-ink"
        >
          Aujourd’hui
        </h2>
        <EbayAutoSync variant="badge" configured={ebay.configured} lastSync={ebay.lastSync} />
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {cartes.map((c) => (
          <li key={c.label} className="min-w-0">
            <CarteLien carte={c} />
          </li>
        ))}
      </ul>

      {liens.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          {liens.map((l, i) => (
            <span key={l.href} className="inline-flex items-center gap-2">
              {i > 0 && (
                <span className="text-admin-faint" aria-hidden>
                  ·
                </span>
              )}
              <Link
                href={l.href}
                className="admin-focus rounded font-medium text-admin-green hover:underline"
              >
                {l.label}
              </Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

function CarteLien({ carte: c }: { carte: Carte }) {
  const featured = Boolean(c.featured);
  return (
    <Link
      href={c.href}
      className={`admin-focus group flex h-full min-h-[140px] flex-col justify-between gap-4 rounded-2xl border p-4 transition-colors sm:p-5 ${
        featured
          ? "border-[#6bd63b] bg-[#6bd63b] hover:border-[#5ec22f] hover:bg-[#62cc33]"
          : "border-admin-line bg-admin-card hover:border-admin-line-strong"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          title={c.valeur}
          className="min-w-0 truncate font-display text-[40px] font-semibold leading-none tracking-tight tabular-nums text-admin-ink sm:text-[26px] lg:text-[30px] xl:text-[40px]"
        >
          {c.valeur}
        </span>
        <ArrowUpRight
          className={`h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
            featured ? "text-admin-ink" : "text-admin-muted"
          }`}
          aria-hidden
        />
      </div>
      <div>
        <p className="text-[15px] font-semibold leading-snug text-admin-ink">{c.label}</p>
        <p
          className={`mt-0.5 text-[13px] leading-snug tabular-nums ${
            featured ? "text-admin-ink" : "text-admin-muted"
          }`}
        >
          {c.hint}
        </p>
      </div>
    </Link>
  );
}
