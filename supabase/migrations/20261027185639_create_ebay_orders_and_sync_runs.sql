-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20261027185639 · nom : create_ebay_orders_and_sync_runs · texte identique aux instructions appliquées.
-- Commandes eBay synchronisées depuis l'API Fulfillment (+ frais via l'API Finances)
create table public.ebay_orders (
  order_id text primary key,
  created_at timestamptz not null,
  buyer text,
  fulfillment_status text,
  payment_status text,
  cancelled boolean not null default false,
  currency text not null default 'CAD',
  total numeric(12,2) not null default 0,
  subtotal numeric(12,2),
  shipping numeric(12,2),
  tax numeric(12,2),
  refunded numeric(12,2) not null default 0,
  fees numeric(12,2),
  items jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now()
);

comment on table public.ebay_orders is 'Commandes eBay (API Fulfillment). total = payé par l''acheteur (articles + livraison + taxes). fees = frais eBay (API Finances), null si inconnus.';

create index ebay_orders_created_at_idx on public.ebay_orders (created_at desc);

alter table public.ebay_orders enable row level security;

create policy authenticated_full_access on public.ebay_orders
  for all to authenticated using (true) with check (true);

-- Journal des synchronisations (date de la dernière synchro, accès aux frais)
create table public.ebay_sync_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  ok boolean not null,
  mode text,
  orders_synced integer not null default 0,
  fees_available boolean,
  message text
);

create index ebay_sync_runs_ran_at_idx on public.ebay_sync_runs (ran_at desc);

alter table public.ebay_sync_runs enable row level security;

create policy authenticated_full_access on public.ebay_sync_runs
  for all to authenticated using (true) with check (true);

revoke all on public.ebay_orders from anon;
revoke all on public.ebay_sync_runs from anon;
