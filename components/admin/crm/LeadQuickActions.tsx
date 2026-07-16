"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Loader2, StickyNote, X } from "lucide-react";
import { updateCompanyNotes, updateLeadStatus } from "@/lib/crm/actions";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/crm/types";

const STATUS_STYLES: Record<LeadStatus, string> = {
  not_contacted: "border-white/10 bg-white/[0.04] text-slate-400",
  contacted: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  interested: "border-accent/40 bg-accent/15 text-accent-bright",
  not_interested: "border-red-500/30 bg-red-500/10 text-red-300",
};

/**
 * Suivi rapide d'un lead : pastille-menu du statut (non contacté /
 * contacté / intéressé / pas intéressé) + note libre repliable.
 * Utilisé dans le tableau de prospection et sur la fiche compagnie.
 */
export default function LeadQuickActions({
  companyId,
  status,
  notes,
  followupOn,
  compact = false,
}: {
  companyId: string;
  status: LeadStatus;
  notes: string | null;
  followupOn: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"status" | "note" | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(notes ?? "");
  const [followupDate, setFollowupDate] = useState(followupOn ?? "");
  const [error, setError] = useState<string | null>(null);

  function saveStatus(next: LeadStatus) {
    setBusy("status");
    setError(null);
    startTransition(async () => {
      const res = await updateLeadStatus(companyId, next);
      setBusy(null);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function saveNote() {
    setBusy("note");
    setError(null);
    startTransition(async () => {
      // Sans date choisie, le serveur détecte « à rappeler lundi »,
      // « le 21 juillet », « dans 2 semaines »… dans la note.
      const res = await updateCompanyNotes(companyId, note, followupDate || null);
      setBusy(null);
      if (!res.ok) {
        setError(res.error);
      } else {
        setFollowupDate(res.followupOn ?? "");
        setNoteOpen(false);
        router.refresh();
      }
    });
  }

  function formatFollowup(iso: string): string {
    return new Intl.DateTimeFormat("fr-CA", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(iso + "T00:00:00"));
  }

  const hasNote = !!(notes && notes.trim());

  return (
    <div className={compact ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}>
      <div className="flex items-center gap-1.5">
        {/* Pastille-select du statut : le select natif reste accessible
            au clavier, la pastille colorée par-dessus donne le look. */}
        <div className="relative inline-flex">
          <select
            value={status}
            disabled={pending}
            onChange={(e) => saveStatus(e.target.value as LeadStatus)}
            aria-label="Statut du lead"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <span
            className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[status]}`}
          >
            {busy === "status" ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <span
                className="h-1.5 w-1.5 rounded-full bg-current"
                aria-hidden
              />
            )}
            {LEAD_STATUS_LABELS[status]}
            <svg
              className="h-2.5 w-2.5 opacity-60"
              viewBox="0 0 10 6"
              fill="none"
              aria-hidden
            >
              <path
                d="M1 1l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setNote(notes ?? "");
            setNoteOpen((v) => !v);
          }}
          title={hasNote ? `Note : ${notes}` : "Ajouter une note"}
          aria-label={hasNote ? "Modifier la note" : "Ajouter une note"}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
            hasNote
              ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
              : "border-white/10 bg-white/[0.04] text-slate-500 hover:text-white"
          }`}
        >
          <StickyNote className="h-3 w-3" aria-hidden />
        </button>

        {followupOn && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200"
            title={`Rappel planifié le ${followupOn}`}
          >
            <CalendarClock className="h-3 w-3" aria-hidden />
            {formatFollowup(followupOn)}
          </span>
        )}
      </div>

      {!compact && hasNote && !noteOpen && (
        <p className="max-w-md rounded-lg border border-amber-400/15 bg-amber-400/5 px-3 py-2 text-xs leading-snug text-amber-100/80">
          {notes}
        </p>
      )}

      {noteOpen && (
        <div className="flex w-56 flex-col gap-1.5 sm:w-64">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder="Note sur ce lead… (« à rappeler lundi » planifie un suivi)"
            className="field !px-3 !py-2 text-xs"
            autoFocus
          />
          <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
            Rappel
            <input
              type="date"
              value={followupDate}
              onChange={(e) => setFollowupDate(e.target.value)}
              aria-label="Date de rappel (laisser vide pour détecter depuis la note)"
              className="field !w-auto !px-2 !py-1 text-xs [color-scheme:dark]"
            />
            {followupDate && (
              <button
                type="button"
                onClick={() => setFollowupDate("")}
                aria-label="Effacer la date de rappel"
                className="text-slate-500 hover:text-white"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            )}
          </label>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              aria-label="Annuler"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={saveNote}
              aria-label="Enregistrer la note"
              className="inline-flex h-6 items-center justify-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-accent-bright hover:shadow-glow disabled:opacity-50"
            >
              {busy === "note" ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3 w-3" aria-hidden />
              )}
              OK
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[11px] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
