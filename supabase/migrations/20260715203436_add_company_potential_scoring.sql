-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715203436 · nom : add_company_potential_scoring · texte identique aux instructions appliquées.

alter table public.companies
  add column headcount_growth_pct numeric,
  add column is_expanding boolean not null default false,
  add column is_relocating boolean not null default false,
  add column potential_score int not null default 0
    check (potential_score >= 0 and potential_score <= 100),
  add column score_breakdown jsonb,
  add column phone_reveal_eligible boolean
    generated always as (potential_score >= 60) stored;

comment on column public.companies.potential_score is
  'Score 0-100 calculé par Stéphanie: taille (30pts) + industrie (25pts) + croissance effectifs (25pts) + expansion/déménagement (20pts)';
comment on column public.companies.score_breakdown is
  'Détail du calcul en jsonb: {size_pts, industry_pts, growth_pts, expansion_pts, reasons: []} pour audit et ajustement futur du seuil';
comment on column public.companies.phone_reveal_eligible is
  'true automatiquement si potential_score >= 60. Seul ce cas déclenche la révélation téléphone Apollo (crédits mobile préservés)';

create index companies_potential_score_idx on public.companies (potential_score desc);
create index companies_phone_reveal_eligible_idx on public.companies (phone_reveal_eligible);
