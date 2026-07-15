import { STAGE_LABELS, type ContactStage } from "@/lib/crm/types";

const STYLES: Record<ContactStage, string> = {
  new: "border-white/10 bg-white/[0.04] text-slate-300",
  contacted: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  call_booked: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  call_done: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  sequence_active: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  converted: "border-accent/40 bg-accent/10 text-accent-bright",
  lost: "border-red-500/20 bg-red-500/5 text-red-300/70",
};

export default function StageBadge({ stage }: { stage: ContactStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wider ${STYLES[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
