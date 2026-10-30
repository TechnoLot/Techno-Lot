-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20261026130411 · nom : ads_tracking_attribution · texte identique aux instructions appliquées.
-- Sessions visiteurs attribuées (premier contact) — inséré par le navigateur via /api/track
create table public.ad_sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  platform text not null default 'direct' check (platform in ('meta','google','organic','referral','direct','email','other')),
  utm_source text check (char_length(utm_source) <= 200),
  utm_medium text check (char_length(utm_medium) <= 200),
  utm_campaign text check (char_length(utm_campaign) <= 300),
  utm_content text check (char_length(utm_content) <= 300),
  utm_term text check (char_length(utm_term) <= 300),
  campaign_id text check (char_length(campaign_id) <= 100),
  adset_id text check (char_length(adset_id) <= 100),
  ad_id text check (char_length(ad_id) <= 100),
  placement text check (char_length(placement) <= 100),
  fbclid text check (char_length(fbclid) <= 500),
  gclid text check (char_length(gclid) <= 500),
  landing_path text check (char_length(landing_path) <= 500),
  referrer text check (char_length(referrer) <= 500),
  device text check (device in ('mobile','tablet','desktop')),
  locale text check (locale in ('fr','en'))
);
create index ad_sessions_created_idx on public.ad_sessions (created_at desc);
create index ad_sessions_ad_idx on public.ad_sessions (platform, ad_id);

-- Événements du funnel
create table public.ad_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id uuid not null references public.ad_sessions(id) on delete cascade,
  type text not null check (type in ('page_view','cta_click','form_view','form_start','form_submit')),
  path text check (char_length(path) <= 500)
);
create index ad_events_session_idx on public.ad_events (session_id);
create index ad_events_created_idx on public.ad_events (created_at desc, type);

-- Leads attribués (copie de l'attribution au moment de la soumission)
create table public.ad_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid references public.ad_sessions(id) on delete set null,
  nom text check (char_length(nom) <= 300),
  courriel text check (char_length(courriel) <= 300),
  telephone text check (char_length(telephone) <= 100),
  platform text not null default 'direct',
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  campaign_id text, adset_id text, ad_id text, placement text,
  fbclid text, gclid text, landing_path text
);
create index ad_leads_created_idx on public.ad_leads (created_at desc);
create index ad_leads_ad_idx on public.ad_leads (platform, ad_id);
create index ad_leads_courriel_idx on public.ad_leads (lower(courriel));

-- Statistiques quotidiennes par publicité, synchronisées depuis Meta / Google Ads
create table public.ad_metrics_daily (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('meta','google')),
  date date not null,
  account_id text,
  campaign_id text, campaign_name text,
  adset_id text, adset_name text,
  ad_id text not null, ad_name text,
  publisher text, -- facebook / instagram / search / display…
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  link_clicks bigint not null default 0,
  spend numeric(12,2) not null default 0,
  platform_leads numeric(12,2) not null default 0,
  currency text default 'CAD',
  synced_at timestamptz not null default now(),
  unique (platform, date, ad_id, publisher)
);
alter table public.ad_metrics_daily alter column publisher set default 'all';
update public.ad_metrics_daily set publisher='all' where publisher is null;
alter table public.ad_metrics_daily alter column publisher set not null;
create index ad_metrics_date_idx on public.ad_metrics_daily (date desc, platform);

-- Journal des synchronisations
create table public.ad_sync_runs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  platform text not null,
  ok boolean not null,
  rows_upserted int not null default 0,
  message text
);

alter table public.ad_sessions enable row level security;
alter table public.ad_events enable row level security;
alter table public.ad_leads enable row level security;
alter table public.ad_metrics_daily enable row level security;
alter table public.ad_sync_runs enable row level security;

create policy authenticated_full_access on public.ad_sessions for all to authenticated using (true) with check (true);
create policy authenticated_full_access on public.ad_events for all to authenticated using (true) with check (true);
create policy authenticated_full_access on public.ad_leads for all to authenticated using (true) with check (true);
create policy authenticated_full_access on public.ad_metrics_daily for all to authenticated using (true) with check (true);
create policy authenticated_full_access on public.ad_sync_runs for all to authenticated using (true) with check (true);

-- Le site public (anon) peut seulement insérer, jamais lire
create policy anon_insert on public.ad_sessions for insert to anon with check (true);
create policy anon_insert on public.ad_events for insert to anon with check (true);
create policy anon_insert on public.ad_leads for insert to anon with check (true);
