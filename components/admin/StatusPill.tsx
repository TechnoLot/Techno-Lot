import type { LotStatus } from "@/lib/admin/types";

const STYLES: Record<LotStatus, { pill: string; dot: string }> = {
  negotiating: { pill: "bg-amber-400/10 text-amber-200 ring-amber-400/20", dot: "bg-amber-400" },
  purchased: { pill: "bg-accent/10 text-accent-bright ring-accent/25", dot: "bg-accent" },
  sold: { pill: "bg-sky-400/10 text-sky-200 ring-sky-400/20", dot: "bg-sky-400" },
  cancelled: { pill: "bg-white/[0.04] text-slate-400 ring-white/10", dot: "bg-slate-500" },
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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {LABELS[status] ?? status}
    </span>
  );
}
