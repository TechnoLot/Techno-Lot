/**
 * En-tête de page admin commun : sur-titre, titre, description et zone
 * d'actions à droite (empilée sous le titre sur mobile).
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-sm font-medium text-admin-muted">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-display text-[30px] font-semibold leading-tight tracking-tight text-admin-ink sm:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-admin-muted [text-wrap:pretty]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      )}
    </header>
  );
}
