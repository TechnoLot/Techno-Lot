-- Notifications admin : retirer des éléments du fil. Le fil reste calculé
-- depuis les tables sources (ventes, soumissions et leads n'en sont jamais
-- supprimés) ; on note seulement ce que chaque admin a retiré.

-- Éléments retirés un à un, par admin (clé du fil : « ebay:… », « soumission:… », « lead:… »).
create table if not exists public.admin_notification_dismissed (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null check (char_length(item_key) <= 120),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

alter table public.admin_notification_dismissed enable row level security;

drop policy if exists "own_notification_dismissed" on public.admin_notification_dismissed;
create policy "own_notification_dismissed" on public.admin_notification_dismissed
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

comment on table public.admin_notification_dismissed is
  'Notifications admin : éléments retirés du fil par chaque admin (la vente ou la demande reste dans son onglet).';

-- « Tout effacer » : tout ce qui est arrivé jusqu'à cet instant quitte le fil.
alter table public.admin_notification_state add column if not exists cleared_at timestamptz;

comment on column public.admin_notification_state.cleared_at is
  'Notifications admin : « Tout effacer » ; les éléments arrivés jusqu''à cet instant ne sont plus affichés.';
