import Link from "next/link";
import { ArrowRight, CircleDollarSign, Package, Receipt, type LucideIcon } from "lucide-react";
import { formatMoney } from "@/lib/admin/format";
import { ebayOrderStatus } from "@/lib/ebay/totaux";
import {
  libelleInstant,
  libelleJour,
  titreCommande,
  titreLot,
  titreVente,
  type VenteRecente,
} from "@/lib/admin/dernieres-ventes";

/** Couleurs des statuts de commande (mêmes que la page Ventes eBay). */
const PILL: Record<"ok" | "warn" | "bad" | "neutral", string> = {
  ok: "bg-admin-tint-green text-admin-green",
  warn: "bg-admin-tint-amber text-admin-tint-amber-ink",
  bad: "bg-admin-tint-red-strong text-admin-danger",
  neutral: "bg-admin-tint-gray text-admin-muted",
};

const PASTILLE = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium";

type Rangee = {
  icon: LucideIcon;
  tint: string;
  titre: string;
  info: string;
  pastille: { label: string; className: string } | null;
  montant: string;
  /** Commande non comptée (annulée ou remboursée) : montant barré */
  barre: boolean;
  lien: { href: string; externe: boolean } | null;
};

const info = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" · ");

function rangee(v: VenteRecente, aujourdhui: string): Rangee {
  if (v.kind === "ebay") {
    const o = v.order;
    const statut = ebayOrderStatus(o);
    const itemId = o.items?.find((i) => i.itemId)?.itemId ?? null;
    return {
      icon: CircleDollarSign,
      tint: "bg-admin-tint-green text-admin-tint-green-ink",
      titre: titreCommande(o),
      info: info("Vente eBay", o.buyer, libelleInstant(o.created_at, aujourdhui)),
      pastille: { label: statut.label, className: PILL[statut.tone] },
      montant: `${formatMoney(o.total, true)}${o.currency && o.currency !== "CAD" ? ` ${o.currency}` : ""}`,
      barre: statut.tone === "bad",
      lien: itemId
        ? { href: `https://www.ebay.ca/itm/${itemId}`, externe: true }
        : { href: "/admin/ventes-ebay", externe: false },
    };
  }
  if (v.kind === "lot") {
    const l = v.lot;
    const vente = l.sale_price == null ? null : Number(l.sale_price);
    const achat = l.purchase_price == null ? null : Number(l.purchase_price);
    const profit = vente != null && achat != null && Number.isFinite(vente - achat) ? vente - achat : null;
    return {
      icon: Package,
      tint: "bg-admin-tint-blue text-admin-tint-blue-ink",
      titre: titreLot(l),
      info: info("Lot vendu", l.client_name, l.sold_at ? libelleJour(l.sold_at, aujourdhui) : null),
      pastille:
        profit == null
          ? null
          : {
              label: `Profit ${formatMoney(profit)}`,
              className: profit < 0 ? PILL.bad : PILL.ok,
            },
      montant: formatMoney(vente, true),
      barre: false,
      lien: { href: `/admin/lots/${l.id}`, externe: false },
    };
  }
  const s = v.vente;
  return {
    icon: Receipt,
    tint: "bg-admin-tint-amber text-admin-tint-amber-ink",
    titre: titreVente(s),
    info: info("Vente", s.buyer_name, libelleJour(s.sold_at, aujourdhui)),
    pastille: null,
    montant: formatMoney(Number(s.sale_price), true),
    barre: false,
    lien: null,
  };
}

/**
 * « Dernières ventes » : commandes eBay, lots vendus et ventes manuelles
 * mêlés, plus récents d'abord (fusion dans lib/admin/dernieres-ventes.ts).
 */
export default function DernieresVentes({
  ventes,
  aujourdhui,
}: {
  ventes: VenteRecente[];
  /** Jour courant « YYYY-MM-DD » à l'heure de Toronto */
  aujourdhui: string;
}) {
  return (
    <section
      aria-labelledby="dernieres-ventes-titre"
      className="rounded-2xl border border-admin-line bg-admin-card"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <h2
          id="dernieres-ventes-titre"
          className="font-display text-lg font-semibold tracking-tight text-admin-ink"
        >
          Dernières ventes
        </h2>
        <Link
          href="/admin/ventes-ebay"
          className="admin-focus inline-flex shrink-0 items-center gap-1 rounded-md text-[13px] font-semibold text-admin-green hover:underline"
        >
          Toutes les ventes eBay
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {ventes.length === 0 ? (
        <div className="px-5 pb-8 pt-6 text-center">
          <CircleDollarSign className="mx-auto h-7 w-7 text-admin-faint" aria-hidden />
          <p className="mt-2 text-sm text-admin-muted">Aucune vente pour l’instant.</p>
        </div>
      ) : (
        <ul className="pb-2">
          {ventes.map((v) => (
            <li key={v.key} className="border-t border-admin-line-soft first:border-t-0">
              <Ligne r={rangee(v, aujourdhui)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Ligne({ r }: { r: Rangee }) {
  const Icon = r.icon;
  const contenu = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${r.tint}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-admin-ink">{r.titre}</p>
        <p className="truncate text-[13px] text-admin-muted">{r.info}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        {r.pastille && <span className={`${PASTILLE} ${r.pastille.className}`}>{r.pastille.label}</span>}
        <span
          className={`whitespace-nowrap text-[15px] tabular-nums ${
            r.barre ? "text-admin-muted line-through" : "font-semibold text-admin-ink"
          }`}
        >
          {r.montant}
        </span>
      </div>
    </>
  );

  const classes = "flex items-center gap-3 px-4 py-3 sm:px-5";
  if (!r.lien) return <div className={classes}>{contenu}</div>;
  const survol = `admin-focus ${classes} transition-colors hover:bg-admin-subtle`;
  if (r.lien.externe) {
    return (
      <a href={r.lien.href} target="_blank" rel="noopener noreferrer" className={survol}>
        {contenu}
      </a>
    );
  }
  return (
    <Link href={r.lien.href} className={survol}>
      {contenu}
    </Link>
  );
}
