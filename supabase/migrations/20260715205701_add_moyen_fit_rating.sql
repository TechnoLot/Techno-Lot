-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715205701 · nom : add_moyen_fit_rating · texte identique aux instructions appliquées.

alter table public.companies drop constraint companies_fit_rating_check;
alter table public.companies add constraint companies_fit_rating_check
  check (fit_rating = ANY (ARRAY['excellent','bon','moyen','a_qualifier','faible','partenaire_potentiel']));
