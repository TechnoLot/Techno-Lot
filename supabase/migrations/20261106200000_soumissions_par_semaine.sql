-- Nombre de soumissions par semaine pour l'export du matin des agents marketing
-- (scripts/export-marketing/export.mjs, sur l'ordinateur de l'utilisateur).
--
-- Pourquoi : la table soumissions n'a aucune politique de lecture et la clé de
-- service n'est pas sur l'ordinateur. Cette fonction rend seulement des nombres :
-- le lundi de chaque semaine (heure du Québec) et le compte de cette semaine,
-- jamais une ligne de la table ni une donnée personnelle.
--
-- Mêmes protections que les autres fonctions à secret (20261030020000_securite_rpc.sql) :
-- secret serveur exigé (SECURITE_RPC_SECRET), paramètre borné, search_path vide.
-- ADDITIF SEULEMENT : aucune table touchée, aucun droit de table donné.
create or replace function public.soumissions_par_semaine(
  p_secret text,
  p_semaines integer default 12
)
returns table (semaine_du date, nombre integer)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_lundi date := date_trunc('week', now() at time zone 'America/Toronto')::date;
begin
  if not securite.secret_valide(p_secret) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if p_semaines is null or p_semaines not between 1 and 104 then
    raise exception 'paramètres invalides' using errcode = '22023';
  end if;

  return query
    select d.lundi, count(s.id)::integer
    from (
      select v_lundi - (rang * 7) as lundi
      from generate_series(0, p_semaines - 1) as rang
    ) as d
    left join public.soumissions s
      on s."DATE" >= (d.lundi::timestamp at time zone 'America/Toronto')
     and s."DATE" < ((d.lundi + 7)::timestamp at time zone 'America/Toronto')
    group by d.lundi
    order by d.lundi desc;
end;
$fn$;

revoke all on function public.soumissions_par_semaine(text, integer) from public;
grant execute on function public.soumissions_par_semaine(text, integer) to anon, authenticated;
comment on function public.soumissions_par_semaine(text, integer) is
  'Nombre de soumissions par semaine (lundi, heure du Québec), nombres seulement. Exige le secret serveur.';
