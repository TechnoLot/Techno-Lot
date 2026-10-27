import type { LotStatus } from "@/lib/admin/types";

const STYLES: Record<LotStatus, { pill: string; dot: string }> = {
  negotiating: { pill: "bg-admin-tint-amber text-admin-warning ", dot: "bg-[#f79009]" },
  purchased: { pill: "bg-admin-tint-green text-admin-green", dot: "bg-[#4fae2a]" },
  sold: { pill: "bg-admin-tint-blue text-admin-tint-blue-ink ", dot: "bg-[#2e90fa]" },
  cancelled: { pill: "bg-admin-tint-gray text-admin-muted", dot: "bg-[#98a29a]" },
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
