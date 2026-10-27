/**
 * Pastille du fit_score 1-10 : vert (9-10), vert pâle (7-8), ambre (5-6),
 * gris (1-4), tiret si NULL (partenaire potentiel / non scoré).
 */
export default function FitScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-admin-line bg-admin-card font-display text-xs font-semibold text-admin-muted">
        —
      </span>
    );
  }
  const cls =
    score >= 9
      ? "border-[#6bd63b] bg-[#6bd63b] text-admin-ink"
      : score >= 7
        ? "border-admin-tint-green-line bg-admin-tint-green text-admin-green"
        : score >= 5
          ? "border-admin-tint-amber-line bg-admin-tint-amber text-admin-warning"
          : "border-admin-line-strong bg-admin-card text-admin-muted";
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border font-display text-sm font-bold tabular-nums ${cls}`}
      title={`Fit score : ${score}/10`}
    >
      {score}
    </span>
  );
}
