-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715205639 · nom : align_companies_with_lead_sheet_methodology · texte identique aux instructions appliquées.

alter table public.companies
  add column street_address text,
  add column region text,
  add column size_estimate_label text,
  add column fit_rating text
    check (fit_rating = ANY (ARRAY['excellent','bon','a_qualifier','faible','partenaire_potentiel'])),
  add column next_action text,
  add column buying_signal text,
  add column is_partner_not_client boolean not null default false;

comment on column public.companies.fit_rating is
  'Qualification qualitative façon feuille de route Techno Lot: excellent/bon/a_qualifier/faible/partenaire_potentiel';
comment on column public.companies.buying_signal is
  'Signal détecté justifiant la priorité: offre emploi TI, déménagement, fusion, fin de support OS, rapport RSE, etc.';
comment on column public.companies.is_partner_not_client is
  'true pour les MSP/intégrateurs identifiés comme partenaires potentiels plutôt que clients (ex: voient le matériel sortant avant tout le monde)';
