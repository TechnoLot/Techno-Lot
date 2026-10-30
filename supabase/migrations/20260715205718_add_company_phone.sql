-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715205718 · nom : add_company_phone · texte identique aux instructions appliquées.
alter table public.companies add column main_phone text;
