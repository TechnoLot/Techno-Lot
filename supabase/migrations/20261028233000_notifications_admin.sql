-- Onglet Notifications du tableau de bord : nouvelles ventes eBay, nouvelles
-- soumissions et leads des pubs. Le fil se calcule à partir des tables
-- existantes ; on ne stocke que le moment où chaque admin a vu ses
-- notifications (pastille du menu) et l'arrivée de chaque commande eBay.

-- Dernière visite de l'onglet, par admin : tout ce qui arrive après est « nouveau ».
create table if not exists public.admin_notification_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_notification_state enable row level security;

drop policy if exists "own_notification_state" on public.admin_notification_state;
create policy "own_notification_state" on public.admin_notification_state
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

comment on table public.admin_notification_state is
  'Notifications admin : moment où chaque admin a vu son fil (pastille du menu).';

-- Arrivée d'une commande dans la base (la synchro peut la ramener après sa
-- date de création) : une vente synchronisée en retard reste « nouvelle ».
-- L'upsert de la synchro ne fournit pas cette colonne : elle garde sa valeur.
alter table public.ebay_orders
  add column if not exists first_seen_at timestamptz not null default now();

update public.ebay_orders set first_seen_at = created_at where first_seen_at > created_at;

create index if not exists ebay_orders_first_seen_at_idx on public.ebay_orders (first_seen_at desc);

comment on column public.ebay_orders.first_seen_at is
  'Première synchronisation de la commande (notifications : vente nouvelle même si synchronisée en retard).';
