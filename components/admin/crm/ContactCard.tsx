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
            <p className="font-display text-base font-semibold text-[#0a0a0a]">
              {name}
            </p>
            {contact.contact_priority === 1 && (
              <Star
                className="h-3.5 w-3.5 text-[#257a10]"
                aria-label="Contact principal"
              />
            )}
            <StageBadge stage={contact.stage} />
            {contact.is_fallback_contact && (
              <span
                className="inline-flex items-center rounded-full bg-[#fff4ed] px-2 py-0.5 text-xs font-medium text-[#b93815]"
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
            <p className="mt-0.5 text-sm text-[#4f5a52]">{contact.title}</p>
          )}
          {contact.priority_reason && (
            <p className="mt-0.5 text-xs text-[#4f5a52]">
              {contact.priority_reason}
            </p>
          )}
        </div>

        {/* Changement de stage manuel */}
        <label className="flex items-center gap-2 text-xs text-[#4f5a52]">
          Stage
          <select
            value={contact.stage}
            disabled={isWorking}
            onChange={(e) =>
              run("stage", () =>
                updateContactStage(contact.id, e.target.value as ContactStage),
              )
            }
            className="rounded-[10px] border border-[#c9d6c3] bg-white px-2 py-1.5 text-[13px] text-[#0a0a0a] focus:border-[#6bd63b] focus:outline-none"
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
          <Mail className="h-3.5 w-3.5 shrink-0 text-[#4f5a52]" aria-hidden />
          {contact.email ? (
            <>
              <a
                href={`mailto:${contact.email}`}
                className="text-[#0a0a0a] hover:text-[#257a10]"
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
                  className="inline-flex items-center gap-1 text-xs text-[#4f5a52] underline-offset-2 hover:text-[#257a10] hover:underline"
                >
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  Confirmer
                </button>
              )}
            </>
          ) : (
            <span className="text-[#5f6b62]">Pas de courriel</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-[#4f5a52]" aria-hidden />
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
                className="inline-flex items-center gap-1.5 rounded-full border border-[#a9d896] bg-[#eaf6e3] px-3 py-1.5 text-xs font-semibold text-[#257a10] transition-colors hover:border-[#257a10]"
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
                  className="inline-flex items-center gap-1 text-xs text-[#4f5a52] underline-offset-2 hover:text-[#257a10] hover:underline"
                >
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  Confirmer
                </button>
              )}
            </>
          ) : (
            <span className="text-[#5f6b62]">Pas de téléphone</span>
          )}
        </div>
        {contact.linkedin_url && (
          <div className="flex items-center gap-2">
            <Linkedin className="h-3.5 w-3.5 shrink-0 text-[#4f5a52]" aria-hidden />
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4f5a52] hover:text-[#257a10]"
            >
              Profil LinkedIn
            </a>
          </div>
        )}
        {contact.notes && (
          <p className="mt-1 rounded-lg border border-[#edf2ea] bg-[#f8faf6] px-3 py-2 text-xs text-[#4f5a52]">
            {contact.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#edf2ea] pt-4">
        {contact.stage !== "converted" &&
          contact.stage !== "lost" &&
          contact.stage !== "sequence_active" && (
            <div className="flex w-full items-stretch overflow-hidden rounded-full border border-[#c9d6c3] bg-white sm:inline-flex sm:w-auto">
              <select
                value={introTemplate}
                disabled={isWorking}
                onChange={(e) => setIntroTemplate(e.target.value as TemplateType)}
                aria-label="Choisir le modèle à envoyer"
                title="Choisir le modèle à envoyer"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[13px] font-medium text-[#0a0a0a] focus:outline-none"
              >
                {INTRO_TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-white">
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
                className="inline-flex items-center gap-1.5 rounded-full border border-[#b4e3f0] bg-[#ecfbff] px-3.5 py-2 text-[13px] font-semibold text-[#0e7090] transition-colors hover:border-[#6fc3db] disabled:cursor-not-allowed disabled:opacity-50"
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
            className="inline-flex items-center gap-1.5 rounded-full border border-[#c9d6c3] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2]"
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
          className="inline-flex items-center gap-1.5 rounded-full border border-[#c9d6c3] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2] disabled:opacity-50"
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
          className="inline-flex items-center gap-1.5 rounded-full border border-[#c9d6c3] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2] disabled:opacity-50"
        >
          <StickyNote className="h-3 w-3" aria-hidden />
          Note
        </button>

        <button
          type="button"
          disabled={isWorking}
          onClick={() => setEditOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#c9d6c3] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2] disabled:opacity-50"
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
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#c9d6c3] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2] disabled:opacity-50"
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
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#c9d6c3] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2]"
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
              ? "border-[#d9776c] bg-[#fde8e6] text-[#b42318]"
              : "border-[#c9d6c3] bg-white text-[#0a0a0a] hover:border-[#eaa9a2] hover:text-[#b42318]"
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
          className="mt-4 rounded-xl border border-[#e3eadf] bg-[#f8faf6] p-4"
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
            <p className="font-display text-sm font-semibold text-[#0a0a0a]">
              Modifier le contact
            </p>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              aria-label="Fermer"
              className="rounded-full border border-[#c9d6c3] bg-white p-1.5 text-[#4f5a52] hover:bg-[#f4f7f2] hover:text-[#0a0a0a]"
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
              className="rounded-full border border-[#c9d6c3] bg-white px-5 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f4f7f2]"
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
          className="mt-3 rounded-lg border border-[#f4c7c3] bg-[#fef3f2] px-3 py-2 text-xs text-[#b42318]"
        >
          {error}
        </p>
      )}
      {success && !error && (
        <p className="mt-3 rounded-lg border border-[#b7dca5] bg-[#eaf6e3] px-3 py-2 text-xs text-[#257a10]">
          {success}
        </p>
      )}
    </div>
  );
}
