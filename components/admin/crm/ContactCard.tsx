"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Linkedin,
  Loader2,
  Mail,
  Pencil,
  Phone,
  PhoneCall,
  Save,
  Send,
  Star,
  StickyNote,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import StageBadge from "@/components/admin/crm/StageBadge";
import VerifiedBadge from "@/components/admin/crm/VerifiedBadge";
import {
  convertToClient,
  deleteContact,
  logActivity,
  markVerified,
  sendTemplateEmail,
  updateContact,
  updateContactStage,
} from "@/lib/crm/actions";
import {
  INTRO_TEMPLATE_TYPES,
  STAGE_LABELS,
  STAGES,
  TEMPLATE_TYPE_LABELS,
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
  const [introTemplate, setIntroTemplate] = useState<TemplateType>(
    contact.stage === "call_done" ? "post_call_intro" : "cold_outreach",
  );
  const [editOpen, setEditOpen] = useState(false);

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
            <p className="font-display text-base font-semibold text-admin-ink">
              {name}
            </p>
            {contact.contact_priority === 1 && (
              <Star
                className="h-3.5 w-3.5 text-admin-green"
                aria-label="Contact principal"
              />
            )}
            <StageBadge stage={contact.stage} />
            {contact.is_fallback_contact && (
              <span
                className="inline-flex items-center rounded-full bg-admin-tint-amber px-2 py-0.5 text-xs font-medium text-admin-tint-amber-ink"
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
            <p className="mt-0.5 text-sm text-admin-muted">{contact.title}</p>
          )}
          {contact.priority_reason && (
            <p className="mt-0.5 text-xs text-admin-muted">
              {contact.priority_reason}
            </p>
          )}
        </div>

        {/* Changement de stage manuel */}
        <label className="flex items-center gap-2 text-xs text-admin-muted">
          Stage
          <select
            value={contact.stage}
            disabled={isWorking}
            onChange={(e) =>
              run("stage", () =>
                updateContactStage(contact.id, e.target.value as ContactStage),
              )
            }
            className="rounded-[10px] border border-admin-line-strong bg-admin-card px-2 py-1.5 text-[13px] text-admin-ink focus:border-[#6bd63b] focus:outline-none"
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
          <Mail className="h-3.5 w-3.5 shrink-0 text-admin-muted" aria-hidden />
          {contact.email ? (
            <>
              <a
                href={`mailto:${contact.email}`}
                className="text-admin-ink hover:text-admin-green"
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
                  className="inline-flex items-center gap-1 text-xs text-admin-muted underline-offset-2 hover:text-admin-green hover:underline"
                >
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  Confirmer
                </button>
              )}
            </>
          ) : (
            <span className="text-admin-faint">Pas de courriel</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-admin-muted" aria-hidden />
          {contact.phone ? (
            <>
              <a
                href={`tel:${contact.phone}`}
                onClick={() =>
                  run("call", () =>
                    logActivity({
                      contact_id: contact.id,
                      activity_type: "call_logged",
                    }),
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-admin-tint-green-line bg-admin-tint-green px-3 py-1.5 text-xs font-semibold text-admin-green transition-colors hover:border-admin-green"
                title="Lance l'appel (iPhone, Android, Teams…) et journalise l'activité"
              >
                <PhoneCall className="h-3 w-3" aria-hidden />
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
                  className="inline-flex items-center gap-1 text-xs text-admin-muted underline-offset-2 hover:text-admin-green hover:underline"
                >
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  Confirmer
                </button>
              )}
            </>
          ) : (
            <span className="text-admin-faint">Pas de téléphone</span>
          )}
        </div>
        {contact.linkedin_url && (
          <div className="flex items-center gap-2">
            <Linkedin className="h-3.5 w-3.5 shrink-0 text-admin-muted" aria-hidden />
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-admin-muted hover:text-admin-green"
            >
              Profil LinkedIn
            </a>
          </div>
        )}
        {contact.notes && (
          <p className="mt-1 rounded-lg border border-admin-line-soft bg-admin-subtle px-3 py-2 text-xs text-admin-muted">
            {contact.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-admin-line-soft pt-4">
        {contact.stage !== "converted" &&
          contact.stage !== "lost" &&
          contact.stage !== "sequence_active" && (
            <div className="flex w-full items-stretch overflow-hidden rounded-full border border-admin-line-strong bg-admin-card sm:inline-flex sm:w-auto">
              <select
                value={introTemplate}
                disabled={isWorking}
                onChange={(e) => setIntroTemplate(e.target.value as TemplateType)}
                aria-label="Choisir le modèle à envoyer"
                title="Choisir le modèle à envoyer"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[13px] font-medium text-admin-ink focus:outline-none"
              >
                {INTRO_TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-admin-card">
                    {TEMPLATE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isWorking || !contact.email}
                title={
                  contact.email
                    ? `Envoie le modèle « ${TEMPLATE_TYPE_LABELS[introTemplate]} » et démarre la séquence`
                    : "Ajoute d'abord un courriel à ce contact"
                }
                onClick={() =>
                  run(
                    "intro",
                    () => sendTemplateEmail(contact.id, introTemplate),
                    "Courriel envoyé — contact en séquence.",
                  )
                }
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#257a10] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1f6a0d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "intro" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-3.5 w-3.5" aria-hidden />
                )}
                Envoyer
              </button>
            </div>
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
                className="inline-flex items-center gap-1.5 rounded-full border border-[#b4e3f0] [[data-admin-theme=dark]_&]:border-admin-tint-cyan-ink/30 bg-admin-tint-cyan px-3.5 py-2 text-[13px] font-semibold text-admin-tint-cyan-ink transition-colors hover:border-[#6fc3db] [[data-admin-theme=dark]_&]:hover:border-admin-tint-cyan-ink/60 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="inline-flex items-center gap-1.5 rounded-full border border-admin-line-strong bg-admin-card px-3.5 py-2 text-[13px] font-semibold text-admin-ink transition-colors hover:bg-admin-page"
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
          className="inline-flex items-center gap-1.5 rounded-full border border-admin-line-strong bg-admin-card px-3.5 py-2 text-[13px] font-semibold text-admin-ink transition-colors hover:bg-admin-page disabled:opacity-50"
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
          className="inline-flex items-center gap-1.5 rounded-full border border-admin-line-strong bg-admin-card px-3.5 py-2 text-[13px] font-semibold text-admin-ink transition-colors hover:bg-admin-page disabled:opacity-50"
        >
          <StickyNote className="h-3 w-3" aria-hidden />
          Note
        </button>

        <button
          type="button"
          disabled={isWorking}
          onClick={() => setEditOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-admin-line-strong bg-admin-card px-3.5 py-2 text-[13px] font-semibold text-admin-ink transition-colors hover:bg-admin-page disabled:opacity-50"
          title="Modifier les infos du contact"
        >
          <Pencil className="h-3 w-3" aria-hidden />
          Modifier
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
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-admin-line-strong bg-admin-card px-3.5 py-2 text-[13px] font-semibold text-admin-ink transition-colors hover:bg-admin-page disabled:opacity-50"
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
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-admin-line-strong bg-admin-card px-3.5 py-2 text-[13px] font-semibold text-admin-ink transition-colors hover:bg-admin-page"
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
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
            confirmingDelete
              ? "border-admin-tint-red-line bg-admin-tint-red-strong text-admin-danger"
              : "border-admin-line-strong bg-admin-card text-admin-ink hover:border-admin-tint-red-line hover:text-admin-danger"
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

      {editOpen && (
        <form
          className="mt-4 rounded-xl border border-admin-line bg-admin-subtle p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(
              "edit",
              () =>
                updateContact(contact.id, {
                  first_name: fd.get("first_name") as string,
                  last_name: fd.get("last_name") as string,
                  title: fd.get("title") as string,
                  email: fd.get("email") as string,
                  phone: fd.get("phone") as string,
                  linkedin_url: fd.get("linkedin_url") as string,
                  notes: fd.get("notes") as string,
                }),
              "Contact mis à jour.",
            );
            setEditOpen(false);
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-sm font-semibold text-admin-ink">
              Modifier le contact
            </p>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              aria-label="Fermer"
              className="rounded-full border border-admin-line-strong bg-admin-card p-1.5 text-admin-muted hover:bg-admin-page hover:text-admin-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="first_name"
              defaultValue={contact.first_name ?? ""}
              placeholder="Prénom"
              className="field !py-2.5 text-sm"
            />
            <input
              name="last_name"
              defaultValue={contact.last_name ?? ""}
              placeholder="Nom"
              className="field !py-2.5 text-sm"
            />
            <input
              name="title"
              defaultValue={contact.title ?? ""}
              placeholder="Titre (ex. : Directeur TI)"
              className="field !py-2.5 text-sm sm:col-span-2"
            />
            <input
              name="email"
              type="email"
              defaultValue={contact.email ?? ""}
              placeholder="Courriel"
              className="field !py-2.5 text-sm"
            />
            <input
              name="phone"
              defaultValue={contact.phone ?? ""}
              placeholder="Téléphone"
              className="field !py-2.5 text-sm"
            />
            <input
              name="linkedin_url"
              type="url"
              defaultValue={contact.linkedin_url ?? ""}
              placeholder="URL LinkedIn"
              className="field !py-2.5 text-sm sm:col-span-2"
            />
            <textarea
              name="notes"
              defaultValue={contact.notes ?? ""}
              placeholder="Notes"
              rows={2}
              className="field !py-2.5 text-sm sm:col-span-2"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-full border border-admin-line-strong bg-admin-card px-5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-page"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isWorking}
              className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-50"
            >
              {busy === "edit" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      )}

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
            className="field !py-2 text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={isWorking || !note.trim()}
            className="shrink-0 rounded-full bg-[#257a10] px-4 text-[13px] font-semibold text-white hover:bg-[#1f6a0d] disabled:opacity-50"
          >
            Ajouter
          </button>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-admin-tint-red-line bg-admin-tint-red px-3 py-2 text-xs text-admin-danger"
        >
          {error}
        </p>
      )}
      {success && !error && (
        <p className="mt-3 rounded-lg border border-admin-tint-green-line bg-admin-tint-green px-3 py-2 text-xs text-admin-green">
          {success}
        </p>
      )}
    </div>
  );
}
