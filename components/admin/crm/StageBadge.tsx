import { STAGE_LABELS, type ContactStage } from "@/lib/crm/types";

const STYLES: Record<ContactStage, string> = {
  new: "border-transparent bg-admin-tint-gray text-admin-ink/80",
  contacted: "border-transparent bg-admin-tint-blue text-admin-tint-blue-ink",
  call_booked: "border-transparent bg-admin-tint-violet text-admin-tint-violet-ink",
  call_done: "border-transparent bg-admin-tint-amber text-admin-warning",
  sequence_active: "border-transparent bg-admin-tint-cyan text-admin-tint-cyan-ink",
  converted: "border-transparent bg-admin-tint-green text-admin-green",
  lost: "border-transparent bg-admin-tint-red text-admin-danger",
};

export default function StageBadge({ stage }: { stage: ContactStage }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
