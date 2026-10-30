-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260716154748 · nom : companies_next_followup_on · texte identique aux instructions appliquées.
alter table public.companies
  add column if not exists next_followup_on date;
comment on column public.companies.next_followup_on is 'Date de rappel planifiée — saisie manuellement ou détectée dans la note (ex. « à rappeler lundi »). Affichée dans Suivis à faire.';
