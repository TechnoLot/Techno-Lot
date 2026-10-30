-- Certificats de destruction : lien vers la fiche client (companies) et
-- numéro TL-AAAA-NNNN attribué par la base à l'insertion, jamais réutilisé
-- (un compteur par année, même si un certificat est supprimé ensuite).

alter table public.certificats_destruction
  add column if not exists company_id uuid references public.companies (id) on delete set null;

create index if not exists certificats_destruction_company_id_idx
  on public.certificats_destruction (company_id);

create table if not exists public.certificats_destruction_compteurs (
  annee integer primary key,
  dernier integer not null check (dernier >= 0)
);

alter table public.certificats_destruction_compteurs enable row level security;

-- Même liste que certificats_destruction et admin_soumissions (ADMIN_EMAILS).
drop policy if exists "admins_certificats_compteurs" on public.certificats_destruction_compteurs;
create policy "admins_certificats_compteurs" on public.certificats_destruction_compteurs
  for all to authenticated
  using (lower(coalesce((select auth.jwt()) ->> 'email', '')) = any (array['info@technolot.ca']))
  with check (lower(coalesce((select auth.jwt()) ->> 'email', '')) = any (array['info@technolot.ca']));

comment on table public.certificats_destruction_compteurs is
  'Dernier numéro de certificat de destruction attribué, par année (TL-AAAA-NNNN).';

-- Reprend les numéros déjà émis, s'il y en a.
insert into public.certificats_destruction_compteurs (annee, dernier)
select substring(numero from 4 for 4)::integer, max(substring(numero from 9)::integer)
from public.certificats_destruction
where numero ~ '^TL-[0-9]{4}-[0-9]+$'
group by 1
on conflict (annee) do update
  set dernier = greatest(excluded.dernier, public.certificats_destruction_compteurs.dernier);

-- Numéro suivant de l'année en cours (fuseau du Québec), réservé atomiquement.
create or replace function public.prochain_numero_certificat()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_annee integer := extract(year from (now() at time zone 'America/Toronto'))::integer;
  v_suite integer;
begin
  insert into public.certificats_destruction_compteurs as c (annee, dernier)
  values (v_annee, 1)
  on conflict (annee) do update set dernier = c.dernier + 1
  returning c.dernier into v_suite;
  return format('TL-%s-%s', v_annee, lpad(v_suite::text, greatest(4, length(v_suite::text)), '0'));
end;
$$;

revoke all on function public.prochain_numero_certificat() from public, anon;
grant execute on function public.prochain_numero_certificat() to authenticated;

alter table public.certificats_destruction
  alter column numero set default public.prochain_numero_certificat();
