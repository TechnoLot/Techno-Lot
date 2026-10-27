import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Description eBay — Admin",
  robots: { index: false, follow: false },
};

const embedSrc = "/admin/ebay/embed";

export default function EbayDescriptionPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-admin-ink sm:text-3xl">
            Description eBay
          </h1>
          <p className="mt-1 text-sm text-admin-muted">
            Colle tes photos, choisis le type et l&apos;état, puis copie le HTML
            dans l&apos;onglet HTML de la description eBay.
          </p>
        </div>
        <a
          href={embedSrc}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-medium text-admin-green transition-colors hover:bg-admin-tint-green"
        >
          Ouvrir en plein écran ↗
        </a>
      </header>

      <div className="overflow-hidden rounded-2xl border border-admin-line bg-admin-card">
        <iframe
          src={embedSrc}
          title="Créateur de description eBay Techno Lot"
          allow="clipboard-write"
          className="block h-[calc(100vh-11rem)] w-full border-0"
        />
      </div>
    </div>
  );
}
