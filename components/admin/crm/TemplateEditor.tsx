"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import { updateTemplate } from "@/lib/crm/actions";
import { TEMPLATE_TYPE_LABELS, type EmailTemplate } from "@/lib/crm/types";

const TYPE_LABELS = TEMPLATE_TYPE_LABELS;

/** Éditeur d'un modèle de courriel — sujet, corps, actif. */
export default function TemplateEditor({ template }: { template: EmailTemplate }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [isActive, setIsActive] = useState(template.is_active);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    subject !== template.subject ||
    body !== template.body ||
    isActive !== template.is_active;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateTemplate(template.id, {
        subject,
        body,
        is_active: isActive,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="glass p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="font-display text-base font-semibold text-admin-ink">
            {TYPE_LABELS[template.template_type]}
          </p>
          <span className="rounded-full bg-admin-tint-gray px-2.5 py-0.5 text-xs font-medium text-admin-muted">
            {template.template_type}
          </span>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-admin-muted">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-3.5 w-3.5 accent-admin-green"
          />
          Actif
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-admin-ink">
          Sujet
        </span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="field !py-2.5 text-sm"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-sm font-medium text-admin-ink">
          Corps
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          className="field text-sm leading-relaxed"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-admin-muted">
          Variables : <Code>{"{{prenom}}"}</Code> <Code>{"{{nom}}"}</Code>{" "}
          <Code>{"{{compagnie}}"}</Code> <Code>{"{{titre}}"}</Code> — la
          signature Techno Lot est ajoutée automatiquement à l&apos;envoi.
        </p>
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="btn-primary !px-5 !py-2 !text-sm disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : saved && !dirty ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Save className="h-3.5 w-3.5" aria-hidden />
          )}
          {saved && !dirty ? "Enregistré" : "Enregistrer"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-admin-tint-red-line bg-admin-tint-red px-3 py-2 text-xs text-admin-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-admin-tint-gray px-1 py-0.5 text-xs text-admin-ink">
      {children}
    </code>
  );
}
