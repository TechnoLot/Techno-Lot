-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715202342 · nom : add_fallback_contact_flag · texte identique aux instructions appliquées.

alter table public.contacts
  add column is_fallback_contact boolean not null default false,
  add column fallback_reason text;

comment on column public.contacts.is_fallback_contact is
  'true si aucun titre TI direct trouvé et ce contact est une meilleure estimation (ex: Office Manager, Owner)';
