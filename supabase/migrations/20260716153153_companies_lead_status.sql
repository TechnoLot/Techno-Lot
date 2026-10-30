-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260716153153 · nom : companies_lead_status · texte identique aux instructions appliquées.
alter table public.companies
  add column if not exists lead_status text not null default 'not_contacted'
    check (lead_status in ('not_contacted','contacted','interested','not_interested'));
comment on column public.companies.lead_status is 'Suivi rapide du lead : non contacté / contacté / intéressé / pas intéressé (mis à jour à la main depuis le CRM)';
