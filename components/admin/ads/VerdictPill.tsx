import { VERDICT_LABELS, type Verdict } from "@/lib/ads/verdict";

/** Teintes douces par verdict : pastille + point de couleur. */
export const VERDICT_TONES: Record<Verdict, { pill: string; dot: string }> = {
  rentable: { pill: "bg-admin-tint-green text-admin-tint-green-ink", dot: "bg-admin-green" },
  prometteuse: { pill: "bg-[#effae6] text-[#2f6b14] [[data-admin-theme=dark]_&]:bg-admin-subtle [[data-admin-theme=dark]_&]:text-admin-tint-green-ink", dot: "bg-[#6bd63b]" },
  surveiller: { pill: "bg-admin-tint-amber text-admin-warning", dot: "bg-[#e08a2c]" },
  trop_tot: { pill: "bg-admin-tint-gray text-admin-muted", dot: "bg-[#9aa79d]" },
  couper: { pill: "bg-admin-tint-red text-admin-danger", dot: "bg-admin-danger" },
};

export default function VerdictPill({
  verdict,
  size = "md",
}: {
  verdict: Verdict;
  size?: "md" | "lg";
}) {
  const t = VERDICT_TONES[verdict];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${t.pill} ${
        size === "lg" ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-[12px]"
      }`}
    >
      <span className={`inline-block rounded-full ${t.dot} ${size === "lg" ? "h-2 w-2" : "h-1.5 w-1.5"}`} aria-hidden />
      {VERDICT_LABELS[verdict]}
    </span>
  );
}
