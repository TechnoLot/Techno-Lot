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
  call_logged: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  intro_email_sent: "border-accent/40 bg-accent/10 text-accent-bright",
  followup_sent: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  reply_received: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  sequence_step: "border-white/10 bg-white/[0.04] text-slate-300",
  manual_note: "border-white/10 bg-white/[0.04] text-slate-300",
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
      <p className="py-6 text-center text-sm text-slate-500">
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
                className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-white/5"
                aria-hidden
              />
            )}
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${ICON_STYLES[a.activity_type]}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm text-white">
                <span className="font-medium">{label}</span>
                {contact && (
                  <span className="text-slate-400"> — {contactName(contact)}</span>
                )}
              </p>
              {a.subject && (
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  Objet : {a.subject}
                </p>
              )}
              {a.outcome && (
                <p className="mt-0.5 text-xs text-slate-400">{a.outcome}</p>
              )}
              <p className="mt-0.5 text-xs text-slate-600">
                {formatDateTime(a.occurred_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
