-- Lecture des soumissions pour le tableau de bord admin, sans clé de service.
-- La table soumissions garde sa seule politique (insertion anonyme du
-- formulaire) : cette fonction renvoie les demandes uniquement au compte
-- admin connecté. La liste doit suivre ADMIN_EMAILS (variable du serveur).
create or replace function public.admin_soumissions(
  p_since timestamptz default null,
  p_limit integer default 500,
  p_id uuid default null
)
returns setof public.soumissions
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> all (array['info@technolot.ca']) then
    raise exception 'Accès réservé aux administrateurs' using errcode = '42501';
  end if;

  return query
    select s.*
    from public.soumissions s
    where (p_since is null or s."DATE" >= p_since)
      and (p_id is null or s.id = p_id)
    order by s."DATE" desc
    limit least(greatest(coalesce(p_limit, 500), 1), 1000);
end;
$$;

revoke all on function public.admin_soumissions(timestamptz, integer, uuid) from public, anon;
grant execute on function public.admin_soumissions(timestamptz, integer, uuid) to authenticated;
