-- Nombre de formulaires reçus sur une période, sans exposer leur contenu.
-- La table soumissions n'a pas de politique de lecture pour « authenticated » :
-- cette fonction renvoie seulement un compte, pour le tableau de bord des pubs.
create or replace function public.soumissions_count(p_from timestamptz, p_to timestamptz)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.soumissions where "DATE" >= p_from and "DATE" < p_to;
$$;

revoke all on function public.soumissions_count(timestamptz, timestamptz) from public, anon;
grant execute on function public.soumissions_count(timestamptz, timestamptz) to authenticated;
