-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715202452 · nom : add_contact_priority_rank · texte identique aux instructions appliquées.

alter table public.contacts
  add column contact_priority int not null default 1,
  add column priority_reason text;

comment on column public.contacts.contact_priority is
  '1 = contact principal à rejoindre en premier, 2/3 = contacts additionnels (souvent plus senior, référence seulement)';
