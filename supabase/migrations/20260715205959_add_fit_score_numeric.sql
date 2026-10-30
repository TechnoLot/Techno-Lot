-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715205959 · nom : add_fit_score_numeric · texte identique aux instructions appliquées.

alter table public.companies
  add column fit_score int check (fit_score >= 1 and fit_score <= 10);

comment on column public.companies.fit_score is
  'Score de pertinence Techno Lot 1-10, en parallèle du fit_rating textuel. 1-2=faible, 3-4=à qualifier, 5-6=moyen, 7-8=bon, 9-10=excellent. NULL pour partenaire_potentiel (pas un client)';

-- Mapping initial basé sur les catégories déjà en place, à ajuster par Stéphanie au cas par cas ensuite
update public.companies set fit_score = case fit_rating
  when 'excellent' then 9
  when 'bon' then 7
  when 'moyen' then 5
  when 'a_qualifier' then 4
  when 'faible' then 2
  else null
end;
