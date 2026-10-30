-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260716153623 · nom : companies_lead_status_changed_at · texte identique aux instructions appliquées.
alter table public.companies
  add column if not exists lead_status_changed_at timestamptz not null default now();
comment on column public.companies.lead_status_changed_at is 'Date du dernier changement de lead_status — sert à calculer les rappels de suivi (contacté ≥ 7 j, intéressé ≥ 3 j)';
