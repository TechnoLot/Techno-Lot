-- ============================================================================
-- Techno Lot — table lots pour le tableau de bord interne
--
-- Une entrée = un lot négocié, acheté ou revendu. La RLS n'autorise que les
-- utilisateurs authentifiés (les admins passent d'abord par le magic link
-- Supabase + le whitelist ADMIN_EMAILS côté serveur Next.js).
-- ============================================================================

create table if not exists public.lots (
  id              uuid          primary key default gen_random_uuid(),
  created_at      timestamptz   not null    default now(),
  updated_at      timestamptz   not null    default now(),
  created_by      uuid          references auth.users(id) on delete set null,

  -- Client
  client_name     text          not null,
  client_email    text,
  client_phone    text,

  -- Financier (numeric(12,2) = jusqu'à 9 999 999 999,99 $, largement suffisant)
  purchase_price  numeric(12,2) not null    check (purchase_price >= 0),
  sale_price      numeric(12,2)             check (sale_price is null or sale_price >= 0),

  -- Cycle de vie du lot
  status          text          not null    default 'purchased'
                                            check (status in ('negotiating', 'purchased', 'sold', 'cancelled')),
  purchased_at    date          not null    default current_date,
  sold_at         date,

  -- Contenu
  description     text,
  notes           text,

  -- Provenance : saisie manuelle, parse de courriel, ou formulaire public
  source          text          not null    default 'manual'
                                            check (source in ('manual', 'email', 'form')),
  soumission_id   uuid          references public.soumissions(id) on delete set null
);

-- Mise à jour automatique de updated_at à chaque UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_lots_updated_at on public.lots;
create trigger set_lots_updated_at
  before update on public.lots
  for each row
  execute function public.set_updated_at();

-- Index utiles pour le tableau de bord (tri par date, filtres, recherche)
create index if not exists lots_purchased_at_idx on public.lots (purchased_at desc);
create index if not exists lots_client_name_idx on public.lots (lower(client_name));
create index if not exists lots_status_idx      on public.lots (status);
create index if not exists lots_created_by_idx  on public.lots (created_by);
create index if not exists lots_soumission_id_idx on public.lots (soumission_id);

-- RLS : seul un utilisateur authentifié peut lire/écrire.
-- L'autorisation fine (whitelist des courriels admin) est faite dans le
-- layout /admin côté Next.js — pas besoin de complexifier la RLS ici.
alter table public.lots enable row level security;

drop policy if exists "authenticated_can_select_lots" on public.lots;
create policy "authenticated_can_select_lots"
  on public.lots for select
  to authenticated
  using (true);

drop policy if exists "authenticated_can_insert_lots" on public.lots;
create policy "authenticated_can_insert_lots"
  on public.lots for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated_can_update_lots" on public.lots;
create policy "authenticated_can_update_lots"
  on public.lots for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_can_delete_lots" on public.lots;
create policy "authenticated_can_delete_lots"
  on public.lots for delete
  to authenticated
  using (true);
