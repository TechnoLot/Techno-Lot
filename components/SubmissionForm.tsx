"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  FileSpreadsheet,
  ImagePlus,
  Loader2,
  Send,
  TriangleAlert,
} from "lucide-react";
import { getDict, type Locale } from "@/lib/i18n";

type Errors = Partial<Record<"nom" | "courriel" | "telephone" | "fichiers", string>>;
type Status = "idle" | "loading" | "success" | "error";

const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15 Mo (limite des pièces jointes)

export default function SubmissionForm({ locale = "fr" }: { locale?: Locale }) {
  const t = getDict(locale).form;
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");
  const [inventaireName, setInventaireName] = useState("");
  const [photoCount, setPhotoCount] = useState(0);

  function validate(data: FormData): Errors {
    const errs: Errors = {};
    const nom = String(data.get("nom") ?? "").trim();
    const courriel = String(data.get("courriel") ?? "").trim();
    const telephone = String(data.get("telephone") ?? "").trim();

    if (!nom) errs.nom = t.nameError;
    if (!courriel) {
      errs.courriel = t.emailErrorEmpty;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) {
      errs.courriel = t.emailErrorInvalid;
    }
    if (!telephone) {
      errs.telephone = t.phoneErrorEmpty;
    } else if (!/^[\d\s\-().+]{7,20}$/.test(telephone)) {
      errs.telephone = t.phoneErrorInvalid;
    }

    const files = [
      ...data.getAll("inventaire"),
      ...data.getAll("photos"),
    ].filter((f): f is File => f instanceof File && f.size > 0);
    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_TOTAL_SIZE) {
      errs.fichiers = t.filesError;
    }

    return errs;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const errs = validate(data);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus("loading");
    setServerError("");
    try {
      const res = await fetch("/api/soumission", {
        method: "POST",
        body: data,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? t.genericError);
      }
      setStatus("success");
      form.reset();
      setInventaireName("");
      setPhotoCount(0);
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : t.genericError);
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass flex flex-col items-center gap-4 p-10 text-center"
        role="status"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
        >
          <CheckCircle2 className="h-14 w-14 text-accent" aria-hidden />
        </motion.div>
        <h3 className="font-display text-2xl font-bold text-white">
          {t.successTitle}
        </h3>
        <p className="max-w-md text-slate-300">{t.successText}</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="btn-secondary mt-2"
        >
          {t.successAgain}
        </button>
      </motion.div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="glass space-y-5 p-6 sm:p-8"
    >
      {/* Langue pour les messages d'erreur du serveur */}
      <input type="hidden" name="locale" value={locale} />

      {/* Honeypot anti-spam — caché aux humains */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="entreprise-site">{t.honeypotLabel}</label>
        <input
          type="text"
          id="entreprise-site"
          name="entreprise_site"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="nom" className="mb-1.5 block text-sm font-medium text-slate-300">
            {t.nameLabel} <span className="text-accent">*</span>
          </label>
          <input
            id="nom"
            name="nom"
            type="text"
            autoComplete="name"
            placeholder={t.namePlaceholder}
            className={`field ${errors.nom ? "field-error" : ""}`}
            aria-invalid={!!errors.nom}
          />
          {errors.nom && (
            <p className="mt-1.5 text-xs text-red-400">{errors.nom}</p>
          )}
        </div>
        <div>
          <label htmlFor="courriel" className="mb-1.5 block text-sm font-medium text-slate-300">
            {t.emailLabel} <span className="text-accent">*</span>
          </label>
          <input
            id="courriel"
            name="courriel"
            type="email"
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            className={`field ${errors.courriel ? "field-error" : ""}`}
            aria-invalid={!!errors.courriel}
          />
          {errors.courriel && (
            <p className="mt-1.5 text-xs text-red-400">{errors.courriel}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="telephone" className="mb-1.5 block text-sm font-medium text-slate-300">
          {t.phoneLabel} <span className="text-accent">*</span>
        </label>
        <input
          id="telephone"
          name="telephone"
          type="tel"
          autoComplete="tel"
          placeholder={t.phonePlaceholder}
          className={`field ${errors.telephone ? "field-error" : ""}`}
          aria-invalid={!!errors.telephone}
        />
        {errors.telephone && (
          <p className="mt-1.5 text-xs text-red-400">{errors.telephone}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-300">
          {t.messageLabel}
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder={t.messagePlaceholder}
          className="field resize-y"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="inventaire"
            className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-night-800/40 px-4 py-6 text-center transition-colors hover:border-accent/50"
          >
            <FileSpreadsheet className="h-6 w-6 text-accent" aria-hidden />
            <span className="text-sm font-medium text-slate-300 group-hover:text-white">
              {inventaireName || t.inventoryLabel}
            </span>
            <span className="text-xs text-slate-500">{t.inventoryHint}</span>
          </label>
          <input
            id="inventaire"
            name="inventaire"
            type="file"
            accept=".xls,.xlsx,.csv,.pdf"
            className="sr-only"
            onChange={(e) =>
              setInventaireName(e.target.files?.[0]?.name ?? "")
            }
          />
        </div>
        <div>
          <label
            htmlFor="photos"
            className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-night-800/40 px-4 py-6 text-center transition-colors hover:border-accent/50"
          >
            <ImagePlus className="h-6 w-6 text-accent" aria-hidden />
            <span className="text-sm font-medium text-slate-300 group-hover:text-white">
              {photoCount > 0 ? t.photosSelected(photoCount) : t.photosLabel}
            </span>
            <span className="text-xs text-slate-500">{t.photosHint}</span>
          </label>
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => setPhotoCount(e.target.files?.length ?? 0)}
          />
        </div>
      </div>
      {errors.fichiers && (
        <p className="text-xs text-red-400">{errors.fichiers}</p>
      )}

      <AnimatePresence>
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            role="alert"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {serverError}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t.submitting}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden />
            {t.submit}
          </>
        )}
      </button>
      <p className="text-center text-xs text-slate-500">{t.footnote}</p>
    </form>
  );
}
