import { VERDICT_LABELS, type Verdict } from "@/lib/ads/verdict";

/** Teintes douces par verdict : pastille + point de couleur. */
export const VERDICT_TONES: Record<Verdict, { pill: string; dot: string }> = {
  rentable: { pill: "bg-[#e5f4dc] text-[#1f6a0d]", dot: "bg-[#257a10]" },
  prometteuse: { pill: "bg-[#effae6] text-[#2f6b14]", dot: "bg-[#6bd63b]" },
  surveiller: { pill: "bg-[#fdf2e4] text-[#b54708]", dot: "bg-[#e08a2c]" },
  trop_tot: { pill: "bg-[#eef1ec] text-[#4f5a52]", dot: "bg-[#9aa79d]" },
  couper: { pill: "bg-[#fdeceb] text-[#b42318]", dot: "bg-[#b42318]" },
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
