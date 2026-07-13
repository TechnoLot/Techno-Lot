"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, TriangleAlert } from "lucide-react";
import { createLot, updateLot, type LotInput } from "@/lib/admin/actions";
import type { LotSource, LotStatus } from "@/lib/admin/types";

const STATUS_OPTIONS: { value: LotStatus; label: string }[] = [
  { value: "negotiating", label: "Négocié" },
  { value: "purchased", label: "Acheté" },
  { value: "sold", label: "Vendu" },
  { value: "cancelled", label: "Annulé" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

export type LotFormInitial = Partial<{
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  purchase_price: number;
  sale_price: number | null;
  status: LotStatus;
  purchased_at: string;
  sold_at: string | null;
  description: string | null;
  notes: string | null;
}>;

export default function LotForm({
  mode,
  initial,
  lotId,
  source,
}: {
  mode: "create" | "edit";
  initial?: LotFormInitial;
  lotId?: string;
  source?: LotSource;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_name: initial?.client_name ?? "",
    client_email: initial?.client_email ?? "",
    client_phone: initial?.client_phone ?? "",
    purchase_price:
      initial?.purchase_price != null ? String(initial.purchase_price) : "",
    sale_price: initial?.sale_price != null ? String(initial.sale_price) : "",
    status: initial?.status ?? "purchased",
    purchased_at: initial?.purchased_at ?? todayIso(),
    sold_at: initial?.sold_at ?? "",
    description: initial?.description ?? "",
    notes: initial?.notes ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = parseFloat(form.purchase_price);
    if (!Number.isFinite(price) || price < 0) {
      setError("Le prix d'achat doit être un nombre positif.");
      return;
    }
    const sale = form.sale_price ? parseFloat(form.sale_price) : null;
    if (sale !== null && (!Number.isFinite(sale) || sale < 0)) {
      setError("Le prix de vente doit être un nombre positif.");
      return;
    }
    if (!form.client_name.trim()) {
      setError("Le nom du client est requis.");
      return;
    }

    const input: LotInput = {
      client_name: form.client_name,
      client_email: form.client_email || null,
      client_phone: form.client_phone || null,
      purchase_price: price,
      sale_price: sale,
      status: form.status,
      purchased_at: form.purchased_at,
      sold_at: form.sold_at || null,
      description: form.description || null,
      notes: form.notes || null,
      source: source ?? "manual",
    };

    startTransition(async () => {
      if (mode === "create") {
        const res = await createLot(input);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push(`/admin/lots/${res.id}`);
      } else {
        const res = await updateLot(lotId!, input);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <Section title="Client">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du client" required>
            <input
              type="text"
              required
              value={form.client_name}
              onChange={(e) => update("client_name", e.target.value)}
              className="field"
              placeholder="Entreprise ou personne"
            />
          </Field>
          <Field label="Courriel">
            <input
              type="email"
              value={form.client_email}
              onChange={(e) => update("client_email", e.target.value)}
              className="field"
              placeholder="courriel@exemple.ca"
            />
          </Field>
          <Field label="Téléphone" className="sm:col-span-2">
            <input
              type="tel"
              value={form.client_phone}
              onChange={(e) => update("client_phone", e.target.value)}
              className="field"
              placeholder="514-555-1234"
            />
          </Field>
        </div>
      </Section>

      <Section title="Prix et statut">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prix d'achat ($)" required>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={form.purchase_price}
              onChange={(e) => update("purchase_price", e.target.value)}
              className="field font-display tabular-nums"
              placeholder="0.00"
            />
          </Field>
          <Field label="Prix de vente ($)">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={form.sale_price}
              onChange={(e) => update("sale_price", e.target.value)}
              className="field font-display tabular-nums"
              placeholder="—"
            />
          </Field>
          <Field label="Statut">
            <select
              value={form.status}
              onChange={(e) =>
                update("status", e.target.value as LotStatus)
              }
              className="field"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date d'achat" required>
            <input
              type="date"
              required
              value={form.purchased_at}
              onChange={(e) => update("purchased_at", e.target.value)}
              className="field"
            />
          </Field>
          {form.status === "sold" && (
            <Field label="Date de vente" className="sm:col-span-2">
              <input
                type="date"
                value={form.sold_at}
                onChange={(e) => update("sold_at", e.target.value)}
                className="field"
              />
            </Field>
          )}
        </div>
      </Section>

      <Section title="Détails">
        <div className="space-y-4">
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="field resize-y"
              placeholder="Ex : 25 ordinateurs portables Dell, 5 serveurs HP…"
            />
          </Field>
          <Field label="Notes internes">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className="field resize-y"
              placeholder="Notes non partagées avec le client"
            />
          </Field>
        </div>
      </Section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Enregistrement…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" aria-hidden />
            {mode === "create" ? "Enregistrer le lot" : "Mettre à jour"}
          </>
        )}
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-4 font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      {children}
    </div>
  );
}
