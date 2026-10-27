import {
  Mail,
  MessageSquare,
  PhoneCall,
  Reply,
  Send,
  StickyNote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ACTIVITY_LABELS,
  contactName,
  type ActivityType,
  type Contact,
  type OutreachActivity,
} from "@/lib/crm/types";

const ICONS: Record<ActivityType, LucideIcon> = {
  call_logged: PhoneCall,
  intro_email_sent: Mail,
  followup_sent: Send,
  reply_received: Reply,
  sequence_step: MessageSquare,
  manual_note: StickyNote,
};

const ICON_STYLES: Record<ActivityType, string> = {
  call_logged: "border-[#d9cffb] bg-[#f4f1fe] text-[#5b3fb8]",
  intro_email_sent: "border-[#a9d896] bg-[#eaf6e3] text-[#257a10]",
  followup_sent: "border-[#b4e3f0] bg-[#ecfbff] text-[#0e7090]",
  reply_received: "border-[#f6cf96] bg-[#fff6ed] text-[#b54708]",
  sequence_step: "border-[#e3eadf] bg-[#f8faf6] text-[#0a0a0a]",
  manual_note: "border-[#e3eadf] bg-[#f8faf6] text-[#0a0a0a]",
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Historique des activités d'outreach, plus récentes en premier.
 * `contactsById` permet d'afficher qui était visé quand la timeline
 * couvre toute une compagnie.
 */
export default function ActivityTimeline({
  activities,
  contactsById,
}: {
  activities: OutreachActivity[];
  contactsById?: Record<string, Contact>;
}) {
  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[#4f5a52]">
        Aucune activité pour l&apos;instant.
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {activities.map((a, i) => {
        const Icon = ICONS[a.activity_type];
        const contact = contactsById?.[a.contact_id];
        const label =
          a.activity_type === "followup_sent" && a.sequence_step
            ? `Relance ${a.sequence_step} envoyée`
            : ACTIVITY_LABELS[a.activity_type];
        return (
          <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < activities.length - 1 && (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-[#e3eadf]"
                aria-hidden
              />
            )}
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${ICON_STYLES[a.activity_type]}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm text-[#0a0a0a]">
                <span className="font-medium">{label}</span>
                {contact && (
                  <span className="text-[#4f5a52]"> — {contactName(contact)}</span>
                )}
              </p>
              {a.subject && (
                <p className="mt-0.5 truncate text-xs text-[#4f5a52]">
                  Objet : {a.subject}
                </p>
              )}
              {a.outcome && (
                <p className="mt-0.5 text-xs text-[#4f5a52]">{a.outcome}</p>
              )}
              <p className="mt-0.5 text-xs text-[#5f6b62]">
                {formatDateTime(a.occurred_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
