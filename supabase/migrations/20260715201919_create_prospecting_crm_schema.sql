-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260715201919 · nom : create_prospecting_crm_schema · texte identique aux instructions appliquées.

-- Companies : les compagnies cibles fournies par l'utilisateur
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  domain text,
  industry text,
  employee_count int,
  apollo_org_id text,
  research_status text not null default 'pending'
    check (research_status = ANY (ARRAY['pending','searching','found','no_it_contact','converted'])),
  notes text
);

create index companies_apollo_org_id_idx on public.companies (apollo_org_id);
create index companies_research_status_idx on public.companies (research_status);

-- Contacts : les responsables TI trouvés via Apollo pour chaque compagnie
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_id uuid references public.companies(id) on delete cascade,
  first_name text,
  last_name text,
  title text,
  apollo_contact_id text,
  email text,
  email_verified boolean not null default false,
  email_verification_status text,
  phone text,
  phone_verified boolean not null default false,
  phone_verification_status text,
  linkedin_url text,
  stage text not null default 'new'
    check (stage = ANY (ARRAY['new','contacted','call_booked','call_done','sequence_active','converted','lost'])),
  lot_id uuid references public.lots(id),
  source_batch_id uuid,
  notes text
);

create index contacts_company_id_idx on public.contacts (company_id);
create index contacts_stage_idx on public.contacts (stage);
create index contacts_apollo_contact_id_idx on public.contacts (apollo_contact_id);
create unique index contacts_email_unique_idx on public.contacts (email) where email is not null;

-- Historique des envois Stéphanie (50 prospects/jour)
create table public.daily_prospect_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  batch_date date not null default current_date,
  prospect_count int not null default 0,
  filters_used jsonb,
  status text not null default 'completed'
    check (status = ANY (ARRAY['running','completed','error'])),
  error_message text
);

create index daily_prospect_batches_date_idx on public.daily_prospect_batches (batch_date);

alter table public.contacts
  add constraint contacts_source_batch_fkey
  foreign key (source_batch_id) references public.daily_prospect_batches(id);

-- Journal des activités de prospection : appels, emails, étapes de séquence
create table public.outreach_activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  activity_type text not null
    check (activity_type = ANY (ARRAY['call_logged','intro_email_sent','followup_sent','reply_received','sequence_step','manual_note'])),
  sequence_step int,
  subject text,
  body_preview text,
  outcome text,
  occurred_at timestamptz not null default now()
);

create index outreach_activities_contact_id_idx on public.outreach_activities (contact_id);
create index outreach_activities_type_idx on public.outreach_activities (activity_type);

-- RLS : verrouillé par défaut, cohérent avec le reste de la base
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.daily_prospect_batches enable row level security;
alter table public.outreach_activities enable row level security;

create policy "authenticated_full_access" on public.companies
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on public.contacts
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on public.daily_prospect_batches
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on public.outreach_activities
  for all to authenticated using (true) with check (true);
