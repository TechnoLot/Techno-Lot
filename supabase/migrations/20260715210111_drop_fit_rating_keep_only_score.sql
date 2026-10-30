-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715210111 · nom : drop_fit_rating_keep_only_score · texte identique aux instructions appliquées.

alter table public.companies drop column fit_rating;

comment on column public.companies.fit_score is
  'Score de pertinence Techno Lot, 1-10. Seul indicateur de qualification (plus de catégorie texte). 9-10=excellent, 7-8=bon, 5-6=moyen, 3-4=à qualifier, 1-2=faible. NULL si partenaire potentiel (pas un client).';
