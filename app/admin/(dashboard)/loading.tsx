/**
 * Pendant le changement de page : la forme générale d'une page admin (titre,
 * bande de chiffres, liste), pour que le menu réponde tout de suite.
 */
export default function Chargement() {
  return (
    <div
      role="status"
      aria-label="Chargement de la page"
      className="mx-auto w-full max-w-[1400px] px-4 py-7 sm:px-8 sm:py-9 lg:px-10"
    >
      <div className="admin-skeleton h-9 w-56" />
      <div className="admin-skeleton mt-3 h-4 w-80 max-w-full" />
      <div className="admin-skeleton mt-8 h-24 rounded-2xl" />
      <div className="mt-5 overflow-hidden rounded-2xl border border-admin-line bg-admin-card">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-6 border-t border-admin-line-soft px-5 py-4 first:border-t-0">
            <div className="admin-skeleton h-4 flex-1" />
            <div className="admin-skeleton h-4 w-24" />
            <div className="admin-skeleton h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
