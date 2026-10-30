-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715205049 · nom : create_email_templates · texte identique aux instructions appliquées.

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null unique,
  template_type text not null
    check (template_type = ANY (ARRAY['post_call_intro','followup_1','followup_2','followup_3'])),
  subject text not null,
  body text not null,
  is_active boolean not null default true
);

alter table public.email_templates enable row level security;
create policy "authenticated_full_access" on public.email_templates
  for all to authenticated using (true) with check (true);

-- Trace quel template a été utilisé pour chaque envoi
alter table public.outreach_activities
  add column email_template_id uuid references public.email_templates(id);
