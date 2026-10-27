import type { LotStatus } from "@/lib/admin/types";

const STYLES: Record<LotStatus, { pill: string; dot: string }> = {
  negotiating: { pill: "bg-[#fff6ed] text-[#b54708] ", dot: "bg-[#f79009]" },
  purchased: { pill: "bg-[#eaf6e3] text-[#257a10]", dot: "bg-[#4fae2a]" },
  sold: { pill: "bg-[#eff6ff] text-[#175cd3] ", dot: "bg-[#2e90fa]" },
  cancelled: { pill: "bg-[#eef1ec] text-[#4f5a52]", dot: "bg-[#98a29a]" },
};

const LABELS: Record<LotStatus, string> = {
  negotiating: "Négocié",
  purchased: "Acheté",
  sold: "Vendu",
  cancelled: "Annulé",
};

export default function StatusPill({ status }: { status: LotStatus }) {
  const s = STYLES[status] ?? STYLES.cancelled;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${s.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {LABELS[status] ?? status}
    </span>
  );
}
