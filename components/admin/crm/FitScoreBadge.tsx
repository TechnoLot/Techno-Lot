/**
 * Pastille du fit_score 1-10 : vert (9-10), vert pâle (7-8), ambre (5-6),
 * gris (1-4), tiret si NULL (partenaire potentiel / non scoré).
 */
export default function FitScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e3eadf] bg-white font-display text-xs font-semibold text-[#4f5a52]">
        —
      </span>
    );
  }
  const cls =
    score >= 9
      ? "border-[#6bd63b] bg-[#6bd63b] text-[#0a0a0a]"
      : score >= 7
        ? "border-[#b7dca5] bg-[#eaf6e3] text-[#257a10]"
        : score >= 5
          ? "border-[#f6cf96] bg-[#fff6ed] text-[#b54708]"
          : "border-[#c9d6c3] bg-white text-[#4f5a52]";
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border font-display text-sm font-bold tabular-nums ${cls}`}
      title={`Fit score : ${score}/10`}
    >
      {score}
    </span>
  );
}
