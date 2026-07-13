import type { LotStatus } from "@/lib/admin/types";

const STYLES: Record<LotStatus, string> = {
  negotiating: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  purchased: "border-accent/40 bg-accent/10 text-accent-bright",
  sold: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  cancelled: "border-white/10 bg-white/[0.04] text-slate-400",
};

const LABELS: Record<LotStatus, string> = {
  negotiating: "Négocié",
  purchased: "Acheté",
  sold: "Vendu",
  cancelled: "Annulé",
};

export default function StatusPill({ status }: { status: LotStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wider ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
