/**
 * Pastille du fit_score 1-10 : vert (9-10), vert pâle (7-8), ambre (5-6),
 * gris (1-4), tiret si NULL (partenaire potentiel / non scoré).
 */
export default function FitScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] font-display text-xs font-semibold text-slate-500">
        —
      </span>
    );
  }
  const cls =
    score >= 9
      ? "border-accent/50 bg-accent/15 text-accent-bright shadow-glow"
      : score >= 7
        ? "border-accent/30 bg-accent/10 text-accent-bright"
        : score >= 5
          ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
          : "border-white/10 bg-white/[0.04] text-slate-400";
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border font-display text-sm font-bold tabular-nums ${cls}`}
      title={`Fit score : ${score}/10`}
    >
      {score}
    </span>
  );
}
