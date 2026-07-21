"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Linkedin,
  Loader2,
  Mail,
  Phone,
  PhoneCall,
  Send,
  Star,
  StickyNote,
  Trash2,
  Trophy,
} from "lucide-react";
import StageBadge from "@/components/admin/crm/StageBadge";
import VerifiedBadge from "@/components/admin/crm/VerifiedBadge";
import {
  convertToClient,
  deleteContact,
  logActivity,
  markVerified,
  sendTemplateEmail,
  updateContactStage,
} from "@/lib/crm/actions";
import {
  STAGE_LABELS,
  STAGES,
  contactName,
  type Contact,
  type ContactStage,
  type TemplateType,
} from "@/lib/crm/types";

export default function ContactCard({ contact }: { contact: Contact }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function run(
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMessage?: string,
  ) {
    setBusy(key);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.ok) {
        setError(res.error ?? "Erreur inconnue");
      } else {
        if (okMessage) setSuccess(okMessage);
        router.refresh();
      }
    });
  }

  const name = contactName(contact);
  const isWorking = pending || busy !== null;

  // La confirmation de suppression se ré-arme après 3 s d'inactivité
  useEffect(() => {
    if (!confirmingDelete) return;
    const timeout = setTimeout(() => setConfirmingDelete(false), 3000);
    return () => clearTimeout(timeout);
  }, [confirmingDelete]);

  return (
    <div className="glass p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-semibold text-white">
              {name}
            </p>
            {contact.contact_priority === 1 && (
              <Star
                className="h-3.5 w-3.5 text-accent"
                aria-label="Contact principal"
              />
            )}
            <StageBadge stage={contact.stage} />
            {contact.is_fallback_contact && (
              <span
                className="inline-flex items-center rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-200"
                title={
                  contact.fallback_reason ??
                  "Aucun titre TI direct trouvé — meilleure estimation"
                }
              >
                Contact de repli
              </span>
            )}
          </div>
          {contact.title && (
            <p className="mt-0.5 text-sm text-slate-400">{contact.title}</p>
          )}
          {contact.priority_reason && (
            <p className="mt-0.5 text-xs text-slate-500">
              {contact.priority_reason}
            </p>
          )}
        </div>

        {/* Changement de stage manuel */}
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Stage
          <select
            value={contact.stage}
            disabled={isWorking}
            onChange={(e) =>
              run("stage", () =>
                updateContactStage(contact.id, e.target.value as ContactStage),
              )
            }
            className="rounded-lg border border-white/10 bg-night-800/80 px-2 py-1.5 text-xs text-white focus:border-accent/60 focus:outline-none"
            aria-label={`Stage de ${name}`}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Coordonnées avec statut de vérification */}
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
          {contact.email ? (
            <>
              <a
                href={`mailto:${contact.email}`}
                className="text-slate-200 hover:text-accent-bright"
              >
                {contact.email}
              </a>
              <VerifiedBadge verified={contact.email_verified} />
              {!contact.email_verified && (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() =>
                    run("verify-email", () => markVerified(contact.id, "email"))
                  }
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 underline-offset-2 hover:text-accent-bright hover:underline"
                >
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  Confirmer
                </button>
              )}
            </>
          ) : (
            <span className="text-slate-600">Pas de courriel</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
          {contact.phone ? (
            <>
              <a
                href={`tel:${contact.phone}`}
                className="text-slate-200 hover:text-accent-bright"
              >
                {contact.phone}
              </a>
              <VerifiedBadge verified={contact.phone_verified} />
              {!contact.phone_verified && (
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() =>
                    run("verify-phone", () => markVerified(contact.id, "phone"))
                  }
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 underline-offset-2 hover:text-accent-bright hover:underline"
                >
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  Confirmer
                </button>
              )}
            </>
          ) : (
            <span className="text-slate-600">Pas de téléphone</span>
          )}
        </div>
        {contact.linkedin_url && (
          <div className="flex items-center gap-2">
            <Linkedin className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-accent-bright"
            >
              Profil LinkedIn
            </a>
          </div>
        )}
        {contact.notes && (
          <p className="mt-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
            {contact.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
        {contact.stage === "call_done" && (
          <button
            type="button"
            disabled={isWorking || !contact.email}
            title={
              contact.email
                ? "Envoie le modèle « Intro post-appel » personnalisé et démarre la séquence"
                : "Ajoute d'abord un courriel à ce contact"
            }
            onClick={() =>
              run(
                "intro",
                () => sendTemplateEmail(contact.id, "post_call_intro"),
                "Email d'intro envoyé — contact en séquence.",
              )
            }
            className="btn-primary !px-4 !py-2 !text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "intro" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden />
            )}
            Envoyer info Techno Lot
          </button>
        )}

        {contact.stage === "sequence_active" &&
          (["followup_1", "followup_2", "followup_3"] as TemplateType[]).map(
            (t, i) => (
              <button
                key={t}
                type="button"
                disabled={isWorking || !contact.email}
                onClick={() =>
                  run(
                    t,
                    () => sendTemplateEmail(contact.id, t),
                    `Relance ${i + 1} envoyée.`,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 transition-colors hover:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === t ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-3 w-3" aria-hidden />
                )}
                Relance {i + 1}
              </button>
            ),
          )}

        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            onClick={() =>
              run(
                "call",
                () =>
                  logActivity({
                    contact_id: contact.id,
                    activity_type: "call_logged",
                  }),
              )
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-accent-bright transition-colors hover:border-accent hover:shadow-glow"
            title="Lance l'appel sur ton appareil (cell, Teams, FaceTime…) et journalise l'activité"
          >
            <PhoneCall className="h-3 w-3" aria-hidden />
            Appeler
          </a>
        )}

        <button
          type="button"
          disabled={isWorking}
          onClick={() =>
            run(
              "log-call",
              () =>
                logActivity({
                  contact_id: contact.id,
                  activity_type: "call_logged",
                }),
              "Appel journalisé.",
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-300 transition-colors hover:border-accent/40 hover:text-accent-bright disabled:opacity-50"
        >
          {busy === "log-call" ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <PhoneCall className="h-3 w-3" aria-hidden />
          )}
          Noter un appel
        </button>

        <button
          type="button"
          disabled={isWorking}
          onClick={() => setNoteOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-300 transition-colors hover:border-accent/40 hover:text-accent-bright disabled:opacity-50"
        >
          <StickyNote className="h-3 w-3" aria-hidden />
          Note
        </button>

        {contact.stage !== "converted" && (
          <button
            type="button"
            disabled={isWorking}
            onClick={() => {
              setBusy("convert");
              setError(null);
              startTransition(async () => {
                const res = await convertToClient(contact.id);
                setBusy(null);
                if (!res.ok) {
                  setError(res.error);
                } else {
                  router.push(`/admin/lots/${res.lotId}`);
                }
              });
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-accent-bright transition-colors hover:border-accent hover:shadow-glow disabled:opacity-50"
            title="Crée un lot (source manuelle) et lie ce contact"
          >
            {busy === "convert" ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Trophy className="h-3 w-3" aria-hidden />
            )}
            Marquer comme client
          </button>
        )}
        {contact.stage === "converted" && contact.lot_id && (
          <a
            href={`/admin/lots/${contact.lot_id}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-accent-bright hover:shadow-glow"
          >
            <Trophy className="h-3 w-3" aria-hidden />
            Voir le lot
          </a>
        )}

        <button
          type="button"
          disabled={isWorking}
          onClick={() => {
            if (!confirmingDelete) {
              setConfirmingDelete(true);
              return;
            }
            setConfirmingDelete(false);
            run("delete", () => deleteContact(contact.id));
          }}
          title="Supprime le contact et son historique (le lot lié n'est pas touché)"
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${
            confirmingDelete
              ? "border-red-500/60 bg-red-500/20 text-red-200"
              : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-red-500/40 hover:text-red-300"
          }`}
        >
          {busy === "delete" ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-3 w-3" aria-hidden />
          )}
          {confirmingDelete ? "Confirmer" : "Supprimer"}
        </button>
      </div>

      {noteOpen && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            run(
              "note",
              () =>
                logActivity({
                  contact_id: contact.id,
                  activity_type: "manual_note",
                  outcome: note,
                }),
              "Note ajoutée.",
            );
            setNote("");
            setNoteOpen(false);
          }}
        >
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. : a demandé de rappeler en septembre…"
            className="field !py-2 text-xs"
            autoFocus
          />
          <button
            type="submit"
            disabled={isWorking || !note.trim()}
            className="shrink-0 rounded-xl border border-accent/40 bg-accent/10 px-4 text-xs font-semibold text-accent-bright hover:shadow-glow disabled:opacity-50"
          >
            Ajouter
          </button>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}
      {success && !error && (
        <p className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent-bright">
          {success}
        </p>
      )}
    </div>
  );
}
