import { STAGE_LABELS, type ContactStage } from "@/lib/crm/types";

const STYLES: Record<ContactStage, string> = {
  new: "border-transparent bg-[#eef1ec] text-[#3b453e]",
  contacted: "border-transparent bg-[#eff6ff] text-[#175cd3]",
  call_booked: "border-transparent bg-[#f4f1fe] text-[#5b3fb8]",
  call_done: "border-transparent bg-[#fff6ed] text-[#b54708]",
  sequence_active: "border-transparent bg-[#ecfbff] text-[#0e7090]",
  converted: "border-transparent bg-[#eaf6e3] text-[#257a10]",
  lost: "border-transparent bg-[#fef3f2] text-[#b42318]",
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
